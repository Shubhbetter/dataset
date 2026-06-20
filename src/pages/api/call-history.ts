import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/server';

function genId(prefix = 'h') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
      const { lead_id } = req.query;
      const { data, error } = await db
        .from('call_history')
        .select('*')
        .eq('lead_id', lead_id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { lead_id, status, note, next_followup } = req.body;

      if (!lead_id || !status) {
        return res.status(400).json({ error: 'Lead ID and status required' });
      }

      const { data: historyData, error: historyError } = await db
        .from('call_history')
        .insert([{
          id: genId('h'),
          lead_id,
          status,
          note: note || null,
          next_followup: next_followup || null,
          user_id: userId,
        }])
        .select()
        .single();

      if (historyError) throw historyError;

      const { error: updateError } = await db
        .from('leads')
        .update({
          status,
          next_followup: next_followup || null,
          last_updated: new Date().toISOString(),
        })
        .eq('id', lead_id)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return res.status(201).json(historyData);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Call history API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
