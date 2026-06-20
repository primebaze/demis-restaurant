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
  sent: "bg-emerald-500/20 text-emerald-400",
  queued: "bg-amber-500/20 text-amber-400",
  failed: "bg-red-500/20 text-red-400",
};

const TYPE_COLORS: Record<string, string> = {
  transactional: "bg-blue-500/15 text-blue-300",
  direct: "bg-gold-300/15 text-gold-300",
  bulk: "bg-purple-500/15 text-purple-300",
  admin: "bg-gray-500/15 text-gray-300",
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
        <h1 className="text-2xl font-bold text-white">Email Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Every email sent, queued or failed — who received it and when.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 truncate">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="queued">Queued</option>
          <option value="failed">Failed</option>
        </select>
        {filterStatus && (
          <button onClick={() => { setFilterStatus(""); setPage(1); }} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No email logs yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
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
                  <tr key={l.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-sm text-white">{l.recipient}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate" title={l.subject}>{l.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[l.type] || "bg-gray-700 text-gray-300"}`}>
                        {l.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 uppercase">{l.provider}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status] || "bg-gray-700 text-gray-300"}`} title={l.error || undefined}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{fmt(l.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{fmt(l.sentAt)}</td>
                    <td className="px-4 py-3">
                      {l.type === "bulk" && (
                        <button
                          onClick={() => resend(l.id)}
                          disabled={resending === l.id}
                          className="text-xs px-3 py-1.5 bg-gold-300/10 text-gold-300 rounded-lg hover:bg-gold-300/20 transition disabled:opacity-50"
                          title="Send this email again now"
                        >
                          {resending === l.id ? "…" : "Resend"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
