"use client";

import { useEffect, useState, useCallback } from "react";

type Log = {
  id: string;
  recipient: string;
  subject: string;
  type: string;
  provider: string;
  status: string;
  error: string;
  campaign: string;
  createdAt: string;
  sentAt: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700",
  queued: "bg-amber-50 text-amber-800",
  failed: "bg-red-50 text-red-700",
};

const TYPE_COLORS: Record<string, string> = {
  transactional: "bg-stone-100 text-stone-800",
  direct: "bg-gold-100 text-gold-700",
  bulk: "bg-stone-100 text-stone-500",
  admin: "bg-stone-100 text-stone-700",
};

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState({ sentLastHour: 0, queued: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/email-logs?${params}`);
    const data = await res.json();
    setLogs(data.logs || []);
    setSummary(data.summary || { sentLastHour: 0, queued: 0, failed: 0 });
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const [resending, setResending] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ subject: string; recipient: string; bodyHtml: string } | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((s) => (s.size === logs.length ? new Set() : new Set(logs.map((l) => l.id))));
  }

  async function deleteLogs(payload: { ids?: string[]; all?: boolean }) {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/email-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || "Delete failed"); return; }
      setSelected(new Set());
      setPage(1);
      await fetchLogs();
    } finally {
      setDeleting(false);
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected log${selected.size === 1 ? "" : "s"}?`)) return;
    await deleteLogs({ ids: Array.from(selected) });
  }

  async function deleteAll() {
    if (!confirm("Delete ALL email logs? This cannot be undone.")) return;
    await deleteLogs({ all: true });
  }

  async function viewEmail(id: string) {
    setViewLoading(true);
    setViewing({ subject: "", recipient: "", bodyHtml: "" });
    try {
      const res = await fetch(`/api/admin/email-logs/${id}`);
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Could not load email"); setViewing(null); return; }
      setViewing({ subject: data.subject, recipient: data.recipient, bodyHtml: data.bodyHtml || "" });
    } finally {
      setViewLoading(false);
    }
  }

  async function resend(id: string) {
    setResending(id);
    try {
      const res = await fetch(`/api/admin/email-logs/${id}/resend`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Resend failed");
      await fetchLogs();
    } finally {
      setResending(null);
    }
  }

  const stats = [
    { label: "Sent (last hour)", value: summary.sentLastHour },
    { label: "Queued", value: summary.queued },
    { label: "Failed", value: summary.failed },
    { label: "Total logged", value: total },
  ];

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-stone-500 mt-0.5">Every email sent, queued or failed — who received it and when.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-4 border bg-white border-stone-100">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1 truncate">{s.label}</p>
            <p className="text-2xl font-bold text-stone-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-gold-400"
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="queued">Queued</option>
          <option value="failed">Failed</option>
        </select>
        {filterStatus && (
          <button onClick={() => { setFilterStatus(""); setPage(1); }} className="px-3 py-2 text-sm text-stone-500 hover:text-stone-900 transition">
            Clear
          </button>
        )}
        <div className="flex-1" />
        {selected.size > 0 && (
          <button onClick={deleteSelected} disabled={deleting} className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
            Delete selected ({selected.size})
          </button>
        )}
        {total > 0 && (
          <button onClick={deleteAll} disabled={deleting} className="px-3 py-2 text-sm text-stone-500 hover:text-red-700 transition disabled:opacity-50">
            Delete all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-stone-500">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-stone-500">No email logs yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-stone-500 border-b border-stone-100">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={logs.length > 0 && selected.size === logs.length}
                      onChange={toggleSelectAll}
                      className="accent-gold-300 w-4 h-4 align-middle"
                    />
                  </th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Via</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleSelect(l.id)}
                        className="accent-gold-300 w-4 h-4 align-middle"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-900">{l.recipient}</td>
                    <td className="px-4 py-3 text-sm text-stone-700 max-w-xs truncate" title={l.subject}>{l.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[l.type] || "bg-stone-100 text-stone-700"}`}>
                        {l.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500 uppercase">{l.provider}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status] || "bg-stone-100 text-stone-700"}`} title={l.error || undefined}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500">{fmt(l.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-stone-500">{fmt(l.sentAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewEmail(l.id)}
                          className="text-xs px-3 py-1.5 bg-stone-50 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-100 transition"
                          title="View the full email"
                        >
                          View
                        </button>
                        {l.type === "bulk" && (
                          <button
                            onClick={() => resend(l.id)}
                            disabled={resending === l.id}
                            className="text-xs px-3 py-1.5 bg-gold-100 text-gold-700 rounded-lg hover:bg-gold-100 transition disabled:opacity-50"
                            title="Send this email again now"
                          >
                            {resending === l.id ? "…" : "Resend"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-30 transition">
              ← Previous
            </button>
            <span className="text-sm text-stone-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-30 transition">
              Next →
            </button>
          </div>
        )}
      </div>

      {/* View email modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-2xl bg-white border border-stone-100 rounded-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-stone-100">
              <p className="text-sm font-semibold text-stone-900 truncate">{viewing.subject || "…"}</p>
              <p className="text-xs text-stone-500 truncate">To: {viewing.recipient}</p>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              {viewLoading ? (
                <div className="p-8 text-center text-stone-500">Loading…</div>
              ) : viewing.bodyHtml ? (
                <iframe title="Email preview" srcDoc={viewing.bodyHtml} className="w-full h-[60vh]" sandbox="" />
              ) : (
                <div className="p-8 text-center text-stone-500">No stored body for this email (logged before full-body capture).</div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-stone-100 text-right">
              <button onClick={() => setViewing(null)} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-900 transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
