export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          phone: string | null;
          pin: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          phone?: string | null;
          pin: string;
          user_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          phone?: string | null;
          pin?: string;
          user_id?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          phone: string;
          company: string | null;
          status: string;
          assigned_agent_id: string | null;
          last_updated: string;
          next_followup: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          phone: string;
          company?: string | null;
          status?: string;
          assigned_agent_id?: string | null;
          last_updated?: string;
          next_followup?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          phone?: string;
          company?: string | null;
          status?: string;
          assigned_agent_id?: string | null;
          last_updated?: string;
          next_followup?: string | null;
          user_id?: string;
        };
      };
      call_history: {
        Row: {
          id: string;
          created_at: string;
          lead_id: string;
          status: string;
          note: string | null;
          next_followup: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          lead_id: string;
          status: string;
          note?: string | null;
          next_followup?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          lead_id?: string;
          status?: string;
          note?: string | null;
          next_followup?: string | null;
          user_id?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
