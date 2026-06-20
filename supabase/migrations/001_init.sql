-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  phone TEXT,
  pin TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  status TEXT DEFAULT 'New',
  assigned_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  next_followup DATE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create call_history table
CREATE TABLE IF NOT EXISTS call_history (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  next_followup DATE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS leads_user_id_idx ON leads(user_id);
CREATE INDEX IF NOT EXISTS leads_assigned_agent_id_idx ON leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS agents_user_id_idx ON agents(user_id);
CREATE INDEX IF NOT EXISTS call_history_lead_id_idx ON call_history(lead_id);
CREATE INDEX IF NOT EXISTS call_history_user_id_idx ON call_history(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agents
CREATE POLICY agents_user_isolation ON agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY agents_user_insert ON agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY agents_user_update ON agents
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY agents_user_delete ON agents
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for leads
CREATE POLICY leads_user_isolation ON leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY leads_user_insert ON leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY leads_user_update ON leads
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY leads_user_delete ON leads
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for call_history
CREATE POLICY call_history_user_isolation ON call_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY call_history_user_insert ON call_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY call_history_user_update ON call_history
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY call_history_user_delete ON call_history
  FOR DELETE USING (auth.uid() = user_id);
