import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, Upload as UploadIcon, Users, Phone, Search,
  Plus, X, Trash2, FileSpreadsheet, CheckCircle2, ChevronRight,
  Download, AlertCircle, Clock, History, LogOut, Lock, ShieldCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_OPTIONS = [
  "New",
  "Called - No Answer",
  "Follow-up",
  "Interested",
  "Not Interested",
  "Converted",
  "Wrong Number",
];

const STATUS_COLORS = {
  "New": "bg-slate-100 text-slate-700 border-slate-200",
  "Called - No Answer": "bg-amber-100 text-amber-700 border-amber-200",
  "Follow-up": "bg-blue-100 text-blue-700 border-blue-200",
  "Interested": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Not Interested": "bg-red-100 text-red-700 border-red-200",
  "Converted": "bg-purple-100 text-purple-700 border-purple-200",
  "Wrong Number": "bg-gray-200 text-gray-600 border-gray-300",
};

function genId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function findKey(row, candidates) {
  const keys = Object.keys(row);
  for (const k of keys) {
    const lower = k.toLowerCase().trim();
    if (candidates.some((c) => lower.includes(c))) return k;
  }
  return null;
}

export default function ColdCallCRM() {
  const [agents, setAgents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [adminConfig, setAdminConfig] = useState(null); // { pin }
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState(null); // { role: 'admin'|'agent', agentId? }
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);

  // ---------- Load persisted shared data ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await window.storage.get("crm-data", true);
        if (mounted && res && res.value) {
          const parsed = JSON.parse(res.value);
          setAgents(parsed.agents || []);
          setLeads(parsed.leads || []);
        }
      } catch (e) {
        // first run
      }
      try {
        const cfg = await window.storage.get("crm-admin-config", true);
        if (mounted && cfg && cfg.value) {
          setAdminConfig(JSON.parse(cfg.value));
        }
      } catch (e) {
        // no admin set up yet
      }
      if (mounted) setLoaded(true);
    })();
    return () => { mounted = false; };
  }, []);

  // ---------- Persist on change ----------
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("crm-data", JSON.stringify({ agents, leads }), true);
      } catch (e) {
        console.error("save failed", e);
      }
    })();
  }, [agents, leads, loaded]);

  function showToast(msg, type = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }

  async function createAdminPin(pin) {
    const cfg = { pin };
    try {
      await window.storage.set("crm-admin-config", JSON.stringify(cfg), true);
      setAdminConfig(cfg);
      setSession({ role: "admin" });
    } catch (e) {
      showToast("Could not save admin setup, try again", "error");
    }
  }

  // ---------- Agents ----------
  function addAgent(name, phone, pin) {
    if (!name.trim()) return;
    setAgents((prev) => [
      ...prev,
      { id: genId("agent"), name: name.trim(), phone: phone.trim(), pin: pin || genPin() },
    ]);
    showToast(`Agent "${name.trim()}" added`, "success");
  }

  function removeAgent(id) {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    setLeads((prev) => prev.map((l) => (l.assignedAgent === id ? { ...l, assignedAgent: null } : l)));
    showToast("Agent removed, their leads are now unassigned", "info");
  }

  // ---------- Leads: import ----------
  function importLeads(rows, assignMode, assignAgentId) {
    const now = new Date().toISOString();
    let agentIdx = 0;
    const newLeads = rows.map((r) => {
      let assignedAgent = null;
      if (assignMode === "agent" && assignAgentId) {
        assignedAgent = assignAgentId;
      } else if (assignMode === "auto" && agents.length > 0) {
        assignedAgent = agents[agentIdx % agents.length].id;
        agentIdx++;
      }
      return {
        id: genId("lead"),
        name: r.name || "Unnamed",
        phone: r.phone,
        company: r.company || "",
        status: "New",
        assignedAgent,
        createdAt: now,
        lastUpdated: now,
        history: [{ id: genId("h"), timestamp: now, status: "New", note: "Imported from Excel" }],
      };
    });
    setLeads((prev) => [...prev, ...newLeads]);
    showToast(`Imported ${newLeads.length} leads`, "success");
  }

  // ---------- Leads: assign ----------
  function bulkAssign(ids, agentId) {
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((l) => (ids.includes(l.id) ? { ...l, assignedAgent: agentId, lastUpdated: now } : l))
    );
    showToast(`Assigned ${ids.length} lead(s)`, "success");
  }

  function autoDistributeUnassigned() {
    if (agents.length === 0) {
      showToast("Add agents first before distributing leads", "error");
      return;
    }
    const unassigned = leads.filter((l) => !l.assignedAgent);
    if (unassigned.length === 0) {
      showToast("No unassigned leads to distribute", "info");
      return;
    }
    const now = new Date().toISOString();
    let idx = 0;
    const map = {};
    unassigned.forEach((l) => {
      map[l.id] = agents[idx % agents.length].id;
      idx++;
    });
    setLeads((prev) => prev.map((l) => (map[l.id] ? { ...l, assignedAgent: map[l.id], lastUpdated: now } : l)));
    showToast(`Distributed ${unassigned.length} leads among ${agents.length} agents`, "success");
  }

  // ---------- Leads: follow-up / status / history ----------
  function saveFollowUp(leadId, { status, note, nextFollowUp }) {
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        const entry = { id: genId("h"), timestamp: now, status, note, nextFollowUp: nextFollowUp || null };
        return { ...l, status, lastUpdated: now, nextFollowUp: nextFollowUp || null, history: [entry, ...l.history] };
      })
    );
    showToast("Follow-up saved", "success");
  }

  function deleteLead(leadId) {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    showToast("Lead deleted", "info");
  }

  // ---------- Derived data ----------
  const agentMap = useMemo(() => {
    const m = {};
    agents.forEach((a) => (m[a.id] = a));
    return m;
  }, [agents]);

  const statusCounts = useMemo(() => {
    const c = {};
    STATUS_OPTIONS.forEach((s) => (c[s] = 0));
    leads.forEach((l) => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [leads]);

  const agentWorkload = useMemo(() => {
    return agents.map((a) => ({ name: a.name, count: leads.filter((l) => l.assignedAgent === a.id).length }));
  }, [agents, leads]);

  const unassignedCount = useMemo(() => leads.filter((l) => !l.assignedAgent).length, [leads]);

  // ---------- Render gates ----------
  if (!loaded) {
    return (
      <div className="w-full h-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!adminConfig) {
    return <AdminSetupScreen onCreate={createAdminPin} />;
  }

  if (!session) {
    return (
      <LoginScreen
        agents={agents}
        adminConfig={adminConfig}
        onAdminLogin={() => setSession({ role: "admin" })}
        onAgentLogin={(agentId) => setSession({ role: "agent", agentId })}
        showToast={showToast}
      />
    );
  }

  const isAdmin = session.role === "admin";
  const currentAgent = !isAdmin ? agentMap[session.agentId] : null;

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
              {isAdmin ? <ShieldCheck size={14} className="text-indigo-500" /> : <Users size={14} className="text-gray-400" />}
              {isAdmin ? "Admin" : currentAgent?.name}
            </span>
            <button
              onClick={() => setSession(null)}
              className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
        {isAdmin && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "leads", label: "Leads", icon: Phone },
              { id: "upload", label: "Upload", icon: UploadIcon },
              { id: "agents", label: "Agents", icon: Users },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    tab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"
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
            {tab === "dashboard" && (
              <DashboardTab
                leads={leads}
                agents={agents}
                statusCounts={statusCounts}
                agentWorkload={agentWorkload}
                unassignedCount={unassignedCount}
              />
            )}
            {tab === "leads" && (
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
            {tab === "upload" && <UploadTab agents={agents} onImport={importLeads} />}
            {tab === "agents" && (
              <AgentsTab
                agents={agents}
                leads={leads}
                onAdd={addAgent}
                onRemove={removeAgent}
                onClearAll={() => {
                  setLeads([]);
                  showToast("All leads cleared", "info");
                }}
              />
            )}
          </>
        ) : (
          <MyLeadsTab
            leads={leads}
            currentAgentId={session.agentId}
            currentAgentName={currentAgent?.name}
            onSaveFollowUp={saveFollowUp}
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium z-50 ${
            toast.type === "success" ? "bg-emerald-600 text-white" : toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-800 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADMIN SETUP (first run)
// ============================================================
function AdminSetupScreen({ onCreate }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    if (pin !== confirm) {
      setError("PINs do not match.");
      return;
    }
    onCreate(pin);
  }

  return (
    <div className="w-full h-full min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center mb-3">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <h2 className="font-semibold text-lg mb-1">Set up Admin Access</h2>
        <p className="text-sm text-gray-500 mb-4">
          Create a PIN for the admin account. Keep this safe — you'll use it to log in and manage agents, uploads, and exports.
        </p>
        <div className="space-y-3">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Create admin PIN"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
            placeholder="Confirm PIN"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700"
          >
            Create Admin Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN SCREEN
// ============================================================
function LoginScreen({ agents, adminConfig, onAdminLogin, onAgentLogin, showToast }) {
  const [mode, setMode] = useState("agent");
  const [adminPin, setAdminPin] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [agentPin, setAgentPin] = useState("");
  const [error, setError] = useState("");

  function handleAdminSubmit() {
    if (adminPin === adminConfig.pin) {
      onAdminLogin();
    } else {
      setError("Incorrect admin PIN.");
    }
  }

  function handleAgentSubmit() {
    const agent = agents.find((a) => a.id === selectedAgent);
    if (!agent) {
      setError("Select your name first.");
      return;
    }
    if (agentPin === agent.pin) {
      onAgentLogin(agent.id);
    } else {
      setError("Incorrect PIN.");
    }
  }

  return (
    <div className="w-full h-full min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center mb-3">
          <Lock size={18} className="text-white" />
        </div>
        <h2 className="font-semibold text-lg mb-3">Log in</h2>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
          <button
            onClick={() => { setMode("agent"); setError(""); }}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium ${mode === "agent" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}
          >
            I'm an Agent
          </button>
          <button
            onClick={() => { setMode("admin"); setError(""); }}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium ${mode === "admin" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}
          >
            I'm Admin
          </button>
        </div>

        {mode === "admin" ? (
          <div className="space-y-3">
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Admin PIN"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAdminSubmit()}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button onClick={handleAdminSubmit} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700">
              Log in as Admin
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.length === 0 ? (
              <p className="text-sm text-gray-500">No agents have been added yet. Ask your admin to add you first.</p>
            ) : (
              <>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select your name...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <input
                  type="password"
                  value={agentPin}
                  onChange={(e) => setAgentPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Your PIN"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleAgentSubmit()}
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button onClick={handleAgentSubmit} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700">
                  Log in
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD TAB (admin only)
// ============================================================
function DashboardTab({ leads, agents, statusCounts, agentWorkload, unassignedCount }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={leads.length} color="bg-indigo-600" />
        <StatCard label="Unassigned" value={unassignedCount} color="bg-amber-500" />
        <StatCard label="Agents" value={agents.length} color="bg-blue-600" />
        <StatCard label="Converted" value={statusCounts["Converted"] || 0} color="bg-emerald-600" />
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

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-2 h-2 rounded-full ${color} mb-2`} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function EmptyHint({ text }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
      <AlertCircle size={16} />
      {text}
    </div>
  );
}

// ============================================================
// LEADS TAB (admin only — full visibility, assign, export)
// ============================================================
function LeadsTab({ leads, agents, agentMap, onBulkAssign, onAutoDistribute, onSaveFollowUp, onDeleteLead }) {
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignTarget, setAssignTarget] = useState("");
  const [detailLead, setDetailLead] = useState(null);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (agentFilter === "unassigned" && l.assignedAgent) return false;
      if (agentFilter !== "all" && agentFilter !== "unassigned" && l.assignedAgent !== agentFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${l.name} ${l.phone} ${l.company}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, agentFilter, statusFilter, search]);

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    const allIds = filtered.map((l) => l.id);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : allIds);
  }

  function handleBulkAssignClick() {
    if (!assignTarget || selectedIds.length === 0) return;
    onBulkAssign(selectedIds, assignTarget);
    setSelectedIds([]);
    setAssignTarget("");
  }

  function exportToExcel() {
    const rows = filtered.map((l) => ({
      Name: l.name,
      Phone: l.phone,
      Company: l.company,
      Status: l.status,
      Agent: l.assignedAgent ? agentMap[l.assignedAgent]?.name || "" : "Unassigned",
      "Last Updated": formatDateTime(l.lastUpdated),
      "Latest Note": l.history[0]?.note || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "leads_export.xlsx");
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, company..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-2">
          <option value="all">All Agents</option>
          <option value="unassigned">Unassigned</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-2">
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={onAutoDistribute} className="flex items-center gap-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-medium hover:bg-indigo-100">
          <Users size={14} /> Auto-distribute unassigned
        </button>
        <button onClick={exportToExcel} className="flex items-center gap-1 text-sm bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-gray-100 border border-gray-200">
          <Download size={14} /> Export
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-indigo-800">{selectedIds.length} selected</span>
          <select value={assignTarget} onChange={(e) => setAssignTarget(e.target.value)} className="text-sm border border-indigo-200 rounded-lg px-2 py-1.5">
            <option value="">Assign to agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button onClick={handleBulkAssignClick} disabled={!assignTarget} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-40">
            Assign
          </button>
          <button onClick={() => setSelectedIds([])} className="text-sm text-indigo-700 px-2 py-1.5">Clear</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {leads.length === 0 ? (
          <EmptyHint text="No leads yet. Go to Upload to import your Excel list." />
        ) : filtered.length === 0 ? (
          <EmptyHint text="No leads match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input type="checkbox" checked={filtered.length > 0 && filtered.every((l) => selectedIds.includes(l.id))} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Phone</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 hidden sm:table-cell">Company</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 hidden md:table-cell">Agent</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 hidden lg:table-cell">Updated</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selectedIds.includes(l.id)} onChange={() => toggleSelect(l.id)} />
                    </td>
                    <td className="px-3 py-2 font-medium">{l.name}</td>
                    <td className="px-3 py-2 text-gray-600">{l.phone}</td>
                    <td className="px-3 py-2 text-gray-600 hidden sm:table-cell">{l.company || "-"}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[l.status]}`}>{l.status}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 hidden md:table-cell">
                      {l.assignedAgent ? agentMap[l.assignedAgent]?.name || "Removed" : <span className="text-amber-600">Unassigned</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs hidden lg:table-cell">{formatDateTime(l.lastUpdated)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => setDetailLead(l)} className="text-indigo-600 hover:text-indigo-800 p-1" title="Open">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailLead && (
        <LeadDetailModal
          lead={leads.find((l) => l.id === detailLead.id) || detailLead}
          agents={agents}
          isAdmin={true}
          onClose={() => setDetailLead(null)}
          onSaveFollowUp={onSaveFollowUp}
          onAssign={(agentId) => onBulkAssign([detailLead.id], agentId)}
          onDelete={() => {
            onDeleteLead(detailLead.id);
            setDetailLead(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// MY LEADS TAB (agent only — scoped strictly to themselves)
// ============================================================
function MyLeadsTab({ leads, currentAgentId, currentAgentName, onSaveFollowUp }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailLead, setDetailLead] = useState(null);

  const myLeads = useMemo(() => leads.filter((l) => l.assignedAgent === currentAgentId), [leads, currentAgentId]);

  const filtered = useMemo(() => {
    return myLeads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${l.name} ${l.phone} ${l.company}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [myLeads, statusFilter, search]);

  const counts = useMemo(() => {
    const c = {};
    STATUS_OPTIONS.forEach((s) => (c[s] = 0));
    myLeads.forEach((l) => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [myLeads]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-lg">Welcome, {currentAgentName}</h2>
        <p className="text-sm text-gray-500">You have {myLeads.length} leads assigned to you.</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {STATUS_OPTIONS.slice(0, 4).map((s) => (
          <div key={s} className={`rounded-lg border px-3 py-2 ${STATUS_COLORS[s]}`}>
            <div className="text-xs font-medium opacity-80 truncate">{s}</div>
            <div className="text-lg font-bold">{counts[s] || 0}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your leads..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-2">
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {myLeads.length === 0 ? (
          <EmptyHint text="No leads assigned to you yet. Check back after your admin distributes today's list." />
        ) : filtered.length === 0 ? (
          <EmptyHint text="No leads match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Phone</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 hidden sm:table-cell">Company</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 hidden lg:table-cell">Updated</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{l.name}</td>
                    <td className="px-3 py-2 text-gray-600">{l.phone}</td>
                    <td className="px-3 py-2 text-gray-600 hidden sm:table-cell">{l.company || "-"}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[l.status]}`}>{l.status}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs hidden lg:table-cell">{formatDateTime(l.lastUpdated)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => setDetailLead(l)} className="text-indigo-600 hover:text-indigo-800 p-1" title="Open">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailLead && (
        <LeadDetailModal
          lead={leads.find((l) => l.id === detailLead.id) || detailLead}
          agents={[]}
          isAdmin={false}
          onClose={() => setDetailLead(null)}
          onSaveFollowUp={onSaveFollowUp}
          onAssign={() => {}}
          onDelete={() => {}}
        />
      )}
    </div>
  );
}

// ============================================================
// LEAD DETAIL MODAL
// ============================================================
function LeadDetailModal({ lead, agents, isAdmin, onClose, onSaveFollowUp, onAssign, onDelete }) {
  const [status, setStatus] = useState(lead.status);
  const [note, setNote] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave() {
    onSaveFollowUp(lead.id, { status, note, nextFollowUp });
    setNote("");
    setNextFollowUp("");
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-semibold">{lead.name}</h3>
            <p className="text-sm text-gray-500">{lead.phone} {lead.company && `· ${lead.company}`}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {isAdmin ? (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Assigned Agent</label>
              <select value={lead.assignedAgent || ""} onChange={(e) => onAssign(e.target.value || null)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm">
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs font-medium text-gray-500">
              Assigned to: <span className="text-gray-800">You</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Update Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Follow-up Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened on the call? Next steps?"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Next Follow-up Date (optional)</label>
            <input type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" />
          </div>

          <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 flex items-center justify-center gap-2">
            <CheckCircle2 size={16} /> Save Follow-up
          </button>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
              <History size={13} /> Call History
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lead.history.map((h) => (
                <div key={h.id} className="bg-gray-50 rounded-lg p-2.5 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[h.status]}`}>{h.status}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={11} /> {formatDateTime(h.timestamp)}
                    </span>
                  </div>
                  {h.note && <p className="text-gray-700">{h.note}</p>}
                  {h.nextFollowUp && <p className="text-xs text-blue-600 mt-1">Next follow-up: {h.nextFollowUp}</p>}
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="pt-2">
              {confirmDelete ? (
                <div className="flex gap-2">
                  <button onClick={onDelete} className="flex-1 text-sm bg-red-600 text-white py-2 rounded-lg font-medium">Confirm Delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 text-sm bg-gray-100 text-gray-700 py-2 rounded-lg font-medium">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-500 flex items-center gap-1 hover:text-red-700">
                  <Trash2 size={13} /> Delete this lead
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// UPLOAD TAB (admin only)
// ============================================================
function UploadTab({ agents, onImport }) {
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [assignMode, setAssignMode] = useState("none");
  const [assignAgentId, setAssignAgentId] = useState("");

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
        if (json.length === 0) {
          setError("The file appears to be empty.");
          setParsedRows([]);
          return;
        }
        const phoneKey = findKey(json[0], ["phone", "number", "mobile", "contact"]);
        const nameKey = findKey(json[0], ["name"]);
        const companyKey = findKey(json[0], ["company", "business", "organi"]);

        if (!phoneKey) {
          setError("Could not find a phone/number column. Make sure a column header contains 'phone', 'number', or 'mobile'.");
          setParsedRows([]);
          return;
        }

        const rows = json
          .map((r) => ({
            name: nameKey ? String(r[nameKey] || "").trim() : "",
            phone: String(r[phoneKey] || "").trim(),
            company: companyKey ? String(r[companyKey] || "").trim() : "",
          }))
          .filter((r) => r.phone);

        setParsedRows(rows);
      } catch (err) {
        setError("Could not read this file. Please upload a valid .xlsx, .xls, or .csv file.");
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImportClick() {
    onImport(parsedRows, assignMode, assignAgentId);
    setParsedRows([]);
    setFileName("");
    setAssignMode("none");
    setAssignAgentId("");
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold mb-1">Upload Excel List</h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload an .xlsx, .xls, or .csv file. Include columns for name and phone number (column headers can vary, e.g. "Mobile No", "Contact Number").
        </p>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-10 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
          <FileSpreadsheet size={28} className="text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-600">{fileName || "Click to choose a file"}</span>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
        </label>

        {error && (
          <div className="mt-3 text-sm text-red-600 flex items-start gap-2 bg-red-50 rounded-lg p-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {parsedRows.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="text-sm font-medium text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 size={15} /> {parsedRows.length} leads ready to import
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Name</th>
                    <th className="px-2 py-1.5 text-left">Phone</th>
                    <th className="px-2 py-1.5 text-left">Company</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1.5">{r.name || "-"}</td>
                      <td className="px-2 py-1.5">{r.phone}</td>
                      <td className="px-2 py-1.5">{r.company || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 5 && (
                <div className="text-xs text-gray-400 px-2 py-1.5 bg-gray-50 border-t border-gray-100">+ {parsedRows.length - 5} more rows</div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Assign these leads as you import</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={assignMode === "none"} onChange={() => setAssignMode("none")} />
                  Leave unassigned (assign manually later)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={assignMode === "auto"} onChange={() => setAssignMode("auto")} />
                  Auto-distribute evenly among all agents
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={assignMode === "agent"} onChange={() => setAssignMode("agent")} />
                  Assign all to one agent
                </label>
                {assignMode === "agent" && (
                  <select value={assignAgentId} onChange={(e) => setAssignAgentId(e.target.value)} className="ml-6 text-sm border border-gray-200 rounded-lg px-2 py-1.5 w-fit">
                    <option value="">Choose agent...</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
              </div>
              {agents.length === 0 && assignMode !== "none" && (
                <p className="text-xs text-amber-600 mt-1.5">No agents added yet — go to the Agents tab first.</p>
              )}
            </div>

            <button
              onClick={handleImportClick}
              disabled={assignMode === "agent" && !assignAgentId}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-40"
            >
              Import {parsedRows.length} Leads
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// AGENTS TAB (admin only)
// ============================================================
function AgentsTab({ agents, leads, onAdd, onRemove, onClearAll }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name, phone, pin.length === 4 ? pin : "");
    setName("");
    setPhone("");
    setPin("");
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold mb-1">Add Agent</h3>
        <p className="text-xs text-gray-500 mb-3">Set a 4-digit PIN for them to log in, or leave blank to auto-generate one.</p>
        <div className="flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" className="flex-1 min-w-[120px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="flex-1 min-w-[120px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4-digit PIN"
            className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-indigo-700">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {agents.length === 0 ? (
          <EmptyHint text="No agents yet. Add your first agent above." />
        ) : (
          <div className="divide-y divide-gray-100">
            {agents.map((a) => {
              const count = leads.filter((l) => l.assignedAgent === a.id).length;
              return <AgentRow key={a.id} agent={a} count={count} onRemove={() => onRemove(a.id)} />;
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-red-100 p-4">
        <h3 className="font-semibold text-sm text-red-600 mb-2">Danger Zone</h3>
        {confirmClear ? (
          <div className="flex gap-2">
            <button onClick={() => { onClearAll(); setConfirmClear(false); }} className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium">
              Confirm: Delete all leads
            </button>
            <button onClick={() => setConfirmClear(false)} className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)} className="text-sm text-red-500 flex items-center gap-1.5 hover:text-red-700">
            <Trash2 size={14} /> Clear all leads
          </button>
        )}
      </div>
    </div>
  );
}

function AgentRow({ agent, count, onRemove }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <div className="font-medium text-sm">{agent.name}</div>
        <div className="text-xs text-gray-500">
          {agent.phone || "No phone"} · {count} leads assigned · PIN: <span className="font-mono font-medium text-gray-700">{agent.pin}</span>
        </div>
      </div>
      {confirm ? (
        <div className="flex gap-1.5">
          <button onClick={onRemove} className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg font-medium">Confirm</button>
          <button onClick={() => setConfirm(false)} className="text-xs bg-gray-100 px-2.5 py-1 rounded-lg font-medium">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} className="text-gray-400 hover:text-red-500 p-1">
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
