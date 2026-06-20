import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/server';

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
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { leads, name, phone, company, status = 'New', assigned_agent_id = null } = req.body;

      if (Array.isArray(leads)) {
        const payload = leads.map((lead) => ({
          ...lead,
          user_id: userId,
          created_at: lead.created_at || new Date().toISOString(),
          last_updated: lead.last_updated || new Date().toISOString(),
        }));

        const { data, error } = await db
          .from('leads')
          .insert(payload)
          .select();

        if (error) throw error;
        return res.status(201).json(data);
      }

      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone required' });
      }

      const now = new Date().toISOString();
      const { data, error } = await db
        .from('leads')
        .insert([{
          name,
          phone,
          company: company || null,
          status,
          assigned_agent_id,
          user_id: userId,
          created_at: now,
          last_updated: now,
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Lead ID required' });
      }

      updates.last_updated = new Date().toISOString();

      const { data, error } = await db
        .from('leads')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id, all } = req.body;
      if (all) {
        const { error } = await db
          .from('leads')
          .delete()
          .eq('user_id', userId);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (!id) {
        return res.status(400).json({ error: 'Lead ID required' });
      }

      const { error } = await db
        .from('leads')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Leads API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
