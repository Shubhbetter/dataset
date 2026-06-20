'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Upload as UploadIcon,
  Users,
  Phone,
  Search,
  Plus,
  X,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  Download,
  AlertCircle,
  Clock,
  History,
  LogOut,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/types/database';
import { STATUS_OPTIONS, STATUS_COLORS, formatDateTime, findKey, genId } from '@/lib/constants';

type Lead = Database['public']['Tables']['leads']['Row'] & { history?: any[] };
type Agent = Database['public']['Tables']['agents']['Row'];

export default function ColdCallCRM() {
  const session = useSession();
  const supabase = useSupabaseClient<Database>();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [currentAgentRole, setCurrentAgentRole] = useState<'admin' | 'agent' | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);

  // Load data on session change
  useEffect(() => {
    if (session?.user) {
      loadData();
    } else {
      setLoaded(true);
    }
  }, [session?.user?.id]);

  async function loadData() {
    try {
      if (!session?.user?.id) return;

      // Load agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (agentsError) throw agentsError;
      setAgents(agentsData || []);

      // Load leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (leadsError) throw leadsError;

      // Load history for each lead
      if (leadsData) {
        const leadsWithHistory = await Promise.all(
          leadsData.map(async (lead) => {
            const { data: history } = await supabase
              .from('call_history')
              .select('*')
              .eq('lead_id', lead.id)
              .order('created_at', { ascending: false });
            return { ...lead, history: history || [] };
          })
        );
        setLeads(leadsWithHistory);
      }

      setLoaded(true);
    } catch (error) {
      console.error('Load data error:', error);
      showToast('Failed to load data', 'error');
      setLoaded(true);
    }
  }

  function showToast(msg: string, type = 'info') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }

  // AGENTS
  async function addAgent(name: string, phone: string, pin?: string) {
    if (!name.trim() || !session?.user?.id) return;
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, pin: pin || '' }),
      });

      if (!response.ok) throw new Error('Failed to add agent');
      const newAgent = await response.json();
      setAgents((prev) => [newAgent, ...prev]);
      showToast(`Agent "${name.trim()}" added`, 'success');
    } catch (error) {
      console.error('Add agent error:', error);
      showToast('Failed to add agent', 'error');
    }
  }

  async function removeAgent(id: string) {
    try {
      const response = await fetch('/api/agents', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to remove agent');
      setAgents((prev) => prev.filter((a) => a.id !== id));
      setLeads((prev) =>
        prev.map((l) => (l.assigned_agent_id === id ? { ...l, assigned_agent_id: null } : l))
      );
      showToast('Agent removed, their leads are now unassigned', 'info');
    } catch (error) {
      console.error('Remove agent error:', error);
      showToast('Failed to remove agent', 'error');
    }
  }

  // LEADS: IMPORT
  async function importLeads(rows: any[], assignMode: string, assignAgentId?: string) {
    if (!session?.user?.id) return;
    try {
      const now = new Date().toISOString();
      let agentIdx = 0;
      const newLeads = rows.map((r) => {
        let assignedAgent = null;
        if (assignMode === 'agent' && assignAgentId) {
          assignedAgent = assignAgentId;
        } else if (assignMode === 'auto' && agents.length > 0) {
          assignedAgent = agents[agentIdx % agents.length].id;
          agentIdx++;
        }
        return {
          name: r.name || 'Unnamed',
          phone: r.phone,
          company: r.company || null,
          status: 'New',
          assigned_agent_id: assignedAgent,
          user_id: session.user.id,
          created_at: now,
          last_updated: now,
        };
      });

      const response = await fetch('/api/leads', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: newLeads }),
      });

      if (!response.ok) throw new Error('Failed to import leads');
      const imported = await response.json();
      setLeads((prev) => [...imported, ...prev]);
      showToast(`Imported ${newLeads.length} leads`, 'success');
    } catch (error) {
      console.error('Import leads error:', error);
      showToast('Failed to import leads', 'error');
    }
  }

  // LEADS: ASSIGN
  async function bulkAssign(ids: string[], agentId: string) {
    if (!session?.user?.id) return;
    try {
      const now = new Date().toISOString();
      await Promise.all(
        ids.map((id) =>
          supabase
            .from('leads')
            .update({ assigned_agent_id: agentId, last_updated: now })
            .eq('id', id)
            .eq('user_id', session.user.id)
        )
      );

      setLeads((prev) =>
        prev.map((l) =>
          ids.includes(l.id) ? { ...l, assigned_agent_id: agentId, last_updated: now } : l
        )
      );
      showToast(`Assigned ${ids.length} lead(s)`, 'success');
    } catch (error) {
      console.error('Bulk assign error:', error);
      showToast('Failed to assign leads', 'error');
    }
  }

  async function autoDistributeUnassigned() {
    if (agents.length === 0) {
      showToast('Add agents first before distributing leads', 'error');
      return;
    }
    const unassigned = leads.filter((l) => !l.assigned_agent_id);
    if (unassigned.length === 0) {
      showToast('No unassigned leads to distribute', 'info');
      return;
    }

    const now = new Date().toISOString();
    let idx = 0;
    const map: Record<string, string> = {};
    unassigned.forEach((l) => {
      map[l.id] = agents[idx % agents.length].id;
      idx++;
    });

    try {
      await Promise.all(
        Object.entries(map).map(([leadId, agentId]) =>
          supabase
            .from('leads')
            .update({ assigned_agent_id: agentId, last_updated: now })
            .eq('id', leadId)
            .eq('user_id', session!.user!.id)
        )
      );

      setLeads((prev) =>
        prev.map((l) => (map[l.id] ? { ...l, assigned_agent_id: map[l.id], last_updated: now } : l))
      );
      showToast(`Distributed ${unassigned.length} leads among ${agents.length} agents`, 'success');
    } catch (error) {
      console.error('Auto distribute error:', error);
      showToast('Failed to distribute leads', 'error');
    }
  }

  // LEADS: SAVE FOLLOW-UP
  async function saveFollowUp(leadId: string, { status, note, nextFollowUp }: any) {
    if (!session?.user?.id) return;
    try {
      const response = await fetch('/api/call-history', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          status,
          note,
          next_followup: nextFollowUp,
        }),
      });

      if (!response.ok) throw new Error('Failed to save follow-up');
      
      await loadData();
      showToast('Follow-up saved', 'success');
    } catch (error) {
      console.error('Save follow-up error:', error);
      showToast('Failed to save follow-up', 'error');
    }
  }

  async function deleteLead(leadId: string) {
    if (!session?.user?.id) return;
    try {
      const response = await fetch('/api/leads', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId }),
      });

      if (!response.ok) throw new Error('Failed to delete lead');
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      showToast('Lead deleted', 'info');
    } catch (error) {
      console.error('Delete lead error:', error);
      showToast('Failed to delete lead', 'error');
    }
  }

  // DERIVED DATA
  const agentMap = useMemo(() => {
    const m: Record<string, Agent> = {};
    agents.forEach((a) => (m[a.id] = a));
    return m;
  }, [agents]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    STATUS_OPTIONS.forEach((s) => (c[s] = 0));
    leads.forEach((l) => {
      c[l.status] = (c[l.status] || 0) + 1;
    });
    return c;
  }, [leads]);

  const agentWorkload = useMemo(() => {
    return agents.map((a) => ({ name: a.name, count: leads.filter((l) => l.assigned_agent_id === a.id).length }));
  }, [agents, leads]);

  const unassignedCount = useMemo(() => leads.filter((l) => !l.assigned_agent_id).length, [leads]);

  // RENDER GATES
  if (!session) {
    return <LoginScreen showToast={showToast} />;
  }

  if (!loaded) {
    return (
      <div className="w-full h-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const isAdmin = true; // In production, check user role from database

  return (
    <div className="w-full h-full min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Phone size={16} className="text-white" />
            </div>
            <span className="font-semibold text-lg">Cold Call CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-500" />
              {session.user?.email}
            </span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
        {isAdmin && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'leads', label: 'Leads', icon: Phone },
              { id: 'upload', label: 'Upload', icon: UploadIcon },
              { id: 'agents', label: 'Agents', icon: Users },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    tab === t.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        {isAdmin ? (
          <>
            {tab === 'dashboard' && (
              <DashboardTab
                leads={leads}
                agents={agents}
                statusCounts={statusCounts}
                agentWorkload={agentWorkload}
                unassignedCount={unassignedCount}
              />
            )}
            {tab === 'leads' && (
              <LeadsTab
                leads={leads}
                agents={agents}
                agentMap={agentMap}
                onBulkAssign={bulkAssign}
                onAutoDistribute={autoDistributeUnassigned}
                onSaveFollowUp={saveFollowUp}
                onDeleteLead={deleteLead}
              />
            )}
            {tab === 'upload' && <UploadTab agents={agents} onImport={importLeads} />}
            {tab === 'agents' && (
              <AgentsTab
                agents={agents}
                leads={leads}
                onAdd={addAgent}
                onRemove={removeAgent}
                onClearAll={() => {
                  // Implement clear all leads
                  showToast('All leads cleared', 'info');
                }}
              />
            )}
          </>
        ) : (
          <MyLeadsTab leads={leads} currentAgentId={currentAgentId} onSaveFollowUp={saveFollowUp} />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium z-50 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOGIN SCREEN
// ============================================================
function LoginScreen({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const supabase = useSupabaseClient();

  async function handleSubmit() {
    setError('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        showToast('Check your email for verification link', 'success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="w-full h-full min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center mb-3">
          <Lock size={18} className="text-white" />
        </div>
        <h2 className="font-semibold text-lg mb-3">{isSignUp ? 'Create Account' : 'Log In'}</h2>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700"
          >
            {isSignUp ? 'Sign Up' : 'Log In'}
          </button>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-sm text-indigo-600 py-1"
          >
            {isSignUp ? 'Already have an account?' : 'Need an account?'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD, LEADS, UPLOAD, AGENTS TABS (same structure as before, updated for new data)
// ============================================================

function DashboardTab({ leads, agents, statusCounts, agentWorkload, unassignedCount }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={leads.length} color="bg-indigo-600" />
        <StatCard label="Unassigned" value={unassignedCount} color="bg-amber-500" />
        <StatCard label="Agents" value={agents.length} color="bg-blue-600" />
        <StatCard label="Converted" value={statusCounts['Converted'] || 0} color="bg-emerald-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Status Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUS_OPTIONS.map((s) => (
            <div key={s} className={`rounded-lg border px-3 py-2 ${STATUS_COLORS[s]}`}>
              <div className="text-xs font-medium opacity-80">{s}</div>
              <div className="text-lg font-bold">{statusCounts[s] || 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Agent Workload</h3>
        {agents.length === 0 ? (
          <EmptyHint text="No agents yet. Add agents in the Agents tab to see workload here." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentWorkload} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-2 h-2 rounded-full ${color} mb-2`} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
      <AlertCircle size={16} />
      {text}
    </div>
  );
}

// Placeholder components for other tabs - fully implemented versions will follow
function LeadsTab(props: any) {
  return <div><EmptyHint text="Leads tab - implement with data from props" /></div>;
}

function UploadTab({ agents, onImport }: any) {
  return <div><EmptyHint text="Upload tab" /></div>;
}

function AgentsTab({ agents, leads, onAdd, onRemove, onClearAll }: any) {
  return <div><EmptyHint text="Agents tab" /></div>;
}

function MyLeadsTab({ leads, currentAgentId, onSaveFollowUp }: any) {
  return <div><EmptyHint text="My Leads tab" /></div>;
}
