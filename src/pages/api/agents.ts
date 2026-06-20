import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/server';

function genId(prefix = 'agent') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;
    const db = supabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { name, phone, pin: customPin } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Agent name required' });
      }

      const pin = customPin && customPin.length === 4 ? customPin : genPin();

      const { data, error } = await db
        .from('agents')
        .insert([{
          id: genId('agent'),
          name: name.trim(),
          phone: phone?.trim() || null,
          pin,
          user_id: userId,
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Agent ID required' });
      }

      const { error: deleteError } = await db
        .from('agents')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      await db
        .from('leads')
        .update({ assigned_agent_id: null })
        .eq('assigned_agent_id', id)
        .eq('user_id', userId);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Agents API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
