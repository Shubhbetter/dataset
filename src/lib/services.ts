import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];
type Agent = Database['public']['Tables']['agents']['Row'];

// LEADS
export const leadsService = {
  async getLeads(userId: string) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createLead(lead: Database['public']['Tables']['leads']['Insert']) {
    const { data, error } = await supabase
      .from('leads')
      .insert([lead])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateLead(id: string, updates: Database['public']['Tables']['leads']['Update']) {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteLead(id: string) {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async bulkCreateLeads(leads: Database['public']['Tables']['leads']['Insert'][]) {
    const { data, error } = await supabase
      .from('leads')
      .insert(leads)
      .select();
    if (error) throw error;
    return data || [];
  },
};

// AGENTS
export const agentsService = {
  async getAgents(userId: string) {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createAgent(agent: Database['public']['Tables']['agents']['Insert']) {
    const { data, error } = await supabase
      .from('agents')
      .insert([agent])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAgent(id: string) {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async verifyPin(agentId: string, pin: string) {
    const { data, error } = await supabase
      .from('agents')
      .select('pin')
      .eq('id', agentId)
      .single();
    if (error) throw error;
    return data?.pin === pin;
  },
};

// CALL HISTORY
export const callHistoryService = {
  async getHistory(leadId: string) {
    const { data, error } = await supabase
      .from('call_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addHistory(entry: Database['public']['Tables']['call_history']['Insert']) {
    const { data, error } = await supabase
      .from('call_history')
      .insert([entry])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
