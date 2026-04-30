"use client";

import { useEffect, useState, useCallback } from "react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.demisrestaurant.co.uk";

type Selection = {
  id: string;
  guestName: string;
  appetiser: string;
  starter: string;
  main: string;
  protein: string;
  dessert: string;
  allergies: string;
  createdAt: string;
};

type Group = {
  id: string;
  groupCode: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  date: string;
  partySize: number;
  locationSlug: string;
  notes: string;
  status: string;
  createdAt: string;
  selections: Selection[];
};

const APPETISER_COLORS: Record<string, string> = {
  "Puff Puff": "bg-amber-500/20 text-amber-400",
  Samosa: "bg-emerald-500/20 text-emerald-400",
  "Spring Rolls": "bg-blue-500/20 text-blue-400",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  inactive: "bg-red-500/20 text-red-400",
};

const LOCATIONS: Record<string, string> = {
  cricklewood: "Cricklewood",
  streatham: "Streatham Hill",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminSetMenuPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New group form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    organizerName: "",
    organizerEmail: "",
    organizerPhone: "",
    date: "",
    partySize: "",
    locationSlug: "cricklewood",
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newGroupResult, setNewGroupResult] = useState<{ groupCode: string; guestSelectionUrl: string } | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/set-menu/groups?${params}`);
    const data = await res.json();
    setGroups(data.groups || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  async function createGroup() {
    setFormError("");
    if (!form.organizerName.trim()) { setFormError("Organiser name is required"); return; }
    if (!form.date) { setFormError("Date is required"); return; }
    if (!form.partySize || parseInt(form.partySize) < 1) { setFormError("Party size must be at least 1"); return; }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/set-menu/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          partySize: parseInt(form.partySize),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create group");
      } else {
        setNewGroupResult({ groupCode: data.group.groupCode, guestSelectionUrl: data.guestSelectionUrl });
        setForm({ organizerName: "", organizerEmail: "", organizerPhone: "", date: "", partySize: "", locationSlug: "cricklewood", notes: "" });
        fetchGroups();
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    setToggling(id);
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await fetch(`/api/admin/set-menu/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setToggling(null);
    fetchGroups();
  }

  function copyLink(url: string, code: string) {
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const inputCls = "w-full px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400 placeholder-gray-600";
  const labelCls = "block text-xs text-gray-400 mb-1.5";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Set Menu Groups</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} group{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setNewGroupResult(null); }}
          className="px-4 py-2 bg-gold-300 text-[#1a1a1a] rounded-xl text-sm font-semibold hover:bg-gold-200 transition"
        >
          + New Group
        </button>
      </div>

      {/* New group form */}
      {showForm && (
        <div className="mb-8 bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-base font-semibold text-white">Create Set Menu Group</h2>
            <p className="text-xs text-gray-500 mt-0.5">A shareable guest selection link will be generated automatically.</p>
          </div>

          {newGroupResult ? (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gold-300/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Group {newGroupResult.groupCode} created</p>
                  <p className="text-xs text-gray-500">Share the link below with the organiser</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#0f0f0f] border border-gray-700 rounded-xl px-4 py-3">
                <span className="text-sm text-stone-300 flex-1 truncate font-mono">{newGroupResult.guestSelectionUrl}</span>
                <button
                  onClick={() => copyLink(newGroupResult.guestSelectionUrl, newGroupResult.groupCode)}
                  className="text-xs px-3 py-1.5 bg-gold-300/10 text-gold-300 rounded-lg hover:bg-gold-300/20 transition shrink-0"
                >
                  {copied === newGroupResult.groupCode ? "Copied!" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => { setShowForm(false); setNewGroupResult(null); }}
                className="mt-4 text-sm text-gray-500 hover:text-white transition"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Organiser Name *</label>
                  <input type="text" value={form.organizerName} onChange={(e) => setForm(f => ({ ...f, organizerName: e.target.value }))} placeholder="Full name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Organiser Email</label>
                  <input type="email" value={form.organizerEmail} onChange={(e) => setForm(f => ({ ...f, organizerEmail: e.target.value }))} placeholder="email@example.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Organiser Phone</label>
                  <input type="tel" value={form.organizerPhone} onChange={(e) => setForm(f => ({ ...f, organizerPhone: e.target.value }))} placeholder="07700 000000" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Event Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls + " [color-scheme:dark]"} />
                </div>
                <div>
                  <label className={labelCls}>Expected Party Size *</label>
                  <input type="number" min="1" max="500" value={form.partySize} onChange={(e) => setForm(f => ({ ...f, partySize: e.target.value }))} placeholder="e.g. 40" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <select value={form.locationSlug} onChange={(e) => setForm(f => ({ ...f, locationSlug: e.target.value }))} className={inputCls}>
                    <option value="cricklewood">Cricklewood</option>
                    <option value="streatham">Streatham Hill</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Notes (internal)</label>
                  <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any internal notes…" rows={2} className={inputCls + " resize-none"} />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">{formError}</p>
              )}

              <div className="flex gap-3">
                <button onClick={createGroup} disabled={creating} className="px-5 py-2 bg-gold-300 text-[#1a1a1a] rounded-xl text-sm font-semibold hover:bg-gold-200 transition disabled:opacity-50">
                  {creating ? "Creating…" : "Create Group & Generate Link"}
                </button>
                <button onClick={() => { setShowForm(false); setFormError(""); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {filterStatus && (
          <button onClick={() => { setFilterStatus(""); setPage(1); }} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition">
            Clear
          </button>
        )}
      </div>

      {/* Groups table */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading groups…</div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No set menu groups yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-3">Group ID</th>
                  <th className="px-4 py-3">Organiser</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Selections</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Toggle</th>
                  <th className="px-4 py-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const guestUrl = `${SITE_URL}/set-menu/${g.groupCode}`;
                  const isExpanded = expanded === g.id;
                  return (
                    <>
                      <tr
                        key={g.id}
                        className="border-b border-gray-800/50 hover:bg-white/[0.02] cursor-pointer"
                        onClick={() => setExpanded(isExpanded ? null : g.id)}
                      >
                        <td className="px-4 py-3 text-sm font-mono text-gold-300 font-semibold">{g.groupCode}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">{g.organizerName}</p>
                          {g.organizerPhone && <p className="text-xs text-gray-500">{g.organizerPhone}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">{formatDate(g.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{LOCATIONS[g.locationSlug] || g.locationSlug}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-semibold">{g.selections.length}</span>
                            <span className="text-xs text-gray-500">/ {g.partySize}</span>
                            <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gold-300/60 rounded-full"
                                style={{ width: `${Math.min(100, (g.selections.length / g.partySize) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[g.status] || "bg-gray-700 text-gray-300"}`}>
                            {g.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStatus(g.id, g.status); }}
                            disabled={toggling === g.id}
                            className={`text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                              g.status === "active"
                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                          >
                            {toggling === g.id ? "…" : g.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); copyLink(guestUrl, g.groupCode); }}
                            className="text-xs px-3 py-1.5 bg-gold-300/10 text-gold-300 rounded-lg hover:bg-gold-300/20 transition"
                          >
                            {copied === g.groupCode ? "Copied!" : "Copy Link"}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${g.id}-detail`} className="bg-[#141414]">
                          <td colSpan={7} className="px-6 py-5">
                            {/* Organiser details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-5 pb-5 border-b border-gray-800">
                              <div>
                                <span className="text-gray-500 block text-xs mb-0.5">Email</span>
                                <span className="text-white">{g.organizerEmail || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-xs mb-0.5">Phone</span>
                                <span className="text-white">{g.organizerPhone || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-xs mb-0.5">Created</span>
                                <span className="text-white">{new Date(g.createdAt).toLocaleDateString("en-GB")}</span>
                              </div>
                              {g.notes && (
                                <div className="col-span-2 md:col-span-1">
                                  <span className="text-gray-500 block text-xs mb-0.5">Notes</span>
                                  <span className="text-white">{g.notes}</span>
                                </div>
                              )}
                            </div>

                            {/* Guest selections */}
                            <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Guest Selections ({g.selections.length})</p>
                            {g.selections.length === 0 ? (
                              <p className="text-sm text-gray-600">No selections yet</p>
                            ) : (
                              <div className="space-y-2">
                                {g.selections.map((s, i) => (
                                  <div key={s.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-600 w-5 text-right">{i + 1}.</span>
                                        <span className="text-sm font-semibold text-white">{s.guestName}</span>
                                      </div>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${APPETISER_COLORS[s.appetiser] || "bg-gray-700 text-gray-300"}`}>
                                        {s.appetiser}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 ml-8 text-xs text-gray-500">
                                      <span>Starter: <span className="text-gray-300">{s.starter}</span></span>
                                      <span>Main: <span className="text-gray-300">{s.main}</span></span>
                                      <span>Protein: <span className="text-gray-300">{s.protein}</span></span>
                                      <span>Dessert: <span className="text-gray-300">{s.dessert}</span></span>
                                      {s.allergies && <span className="text-amber-400">⚠ {s.allergies}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Appetiser summary */}
                            {g.selections.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap gap-4">
                                {["Puff Puff", "Samosa", "Spring Rolls"].map((a) => {
                                  const count = g.selections.filter((s) => s.appetiser === a).length;
                                  return (
                                    <div key={a} className="text-sm">
                                      <span className="text-gray-500">{a}: </span>
                                      <span className="text-white font-semibold">{count}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition">
              ← Previous
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
