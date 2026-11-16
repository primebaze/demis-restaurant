"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { OwnLayout, PageHead, GlassStats, Sheet, SheetFooter, Tag, Seg, Empty, btn, table, tableWrap, type Tone } from "@/components/admin/ui";

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

const STATUS_TONE: Record<string, Tone> = { sent: "ok", queued: "wait", failed: "bad" };

const TYPE_COLORS: Record<string, string> = {
  transactional: "bg-stone-100 text-stone-700",
  direct: "bg-stone-100 text-stone-900",
  bulk: "bg-stone-100 text-stone-500",
  admin: "bg-stone-100 text-stone-700",
};

function fmt(dateStr: string | null) {
  if (!dateStr) return "Not yet";
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

  const box = "h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-gold-300 align-middle";
  const allOn = logs.length > 0 && selected.size === logs.length;

  const typeTag = (t: string) => (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs whitespace-nowrap ${TYPE_COLORS[t] || "bg-stone-100 text-stone-700"}`}>{t}</span>
  );
  const statusTag = (l: Log) => (
    <span title={l.error || undefined}>
      <Tag tone={STATUS_TONE[l.status] || "off"}>{l.status.charAt(0).toUpperCase() + l.status.slice(1)}</Tag>
    </span>
  );
  const actions = (l: Log) => (
    <span className="inline-flex gap-1.5">
      {l.type === "bulk" && (
        <button
          onClick={() => resend(l.id)}
          disabled={resending === l.id}
          title="Send this email again now"
          className="inline-flex h-8 items-center rounded-full border border-stone-200 bg-stone-100 px-3 text-[13px] text-stone-900 transition hover:bg-stone-100 disabled:opacity-50"
        >
          {resending === l.id ? "…" : "Resend"}
        </button>
      )}
      <button onClick={() => viewEmail(l.id)} title="View the full email" className={btn.small}>
        View
      </button>
    </span>
  );

  return (
    <OwnLayout>
      <PageHead title="Email Logs" subtitle="Every email sent, queued or failed: who received it and when" />

      <GlassStats items={stats.map((s) => ({ label: s.label, value: s.value.toLocaleString("en-GB") }))} />

      <Sheet label="All emails" className="overflow-hidden">
        <div className="flex flex-col gap-3 px-4 pb-3.5 pt-[18px] lg:flex-row lg:items-center md:px-5">
          <div className="flex items-baseline gap-3">
            <h2 className="font-outfit text-xl font-normal tracking-tight text-stone-900">All emails</h2>
            <span className="text-[13px] font-light text-stone-500">Bulk sends drain at 15 an hour</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Seg
              label="Status"
              value={filterStatus}
              onChange={(v) => { setFilterStatus(v); setPage(1); }}
              options={[
                { value: "", label: "All" },
                { value: "sent", label: "Sent" },
                { value: "queued", label: "Queued" },
                { value: "failed", label: "Failed" },
              ]}
            />
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-4 text-sm text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                Delete selected ({selected.size})
              </button>
            )}
            {total > 0 && (
              <button onClick={deleteAll} disabled={deleting} className={`${btn.light} hover:text-red-700`}>
                Delete all
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <Empty>Loading…</Empty>
        ) : logs.length === 0 ? (
          <Empty>No email logs yet</Empty>
        ) : (
          <>
            {/* Phones: one card per email */}
            <div className="md:hidden">
              <label className="flex items-center gap-3 border-t border-stone-100 px-4 py-2.5 text-xs text-stone-500">
                <input type="checkbox" aria-label="Select all" checked={allOn} onChange={toggleSelectAll} className={box} />
                Select all on this page
              </label>
              <ul>
                {logs.map((l) => (
                  <li key={l.id} className={`flex gap-3 border-t border-stone-100 px-4 py-3 ${selected.has(l.id) ? "bg-stone-100" : ""}`}>
                    <input
                      type="checkbox"
                      aria-label={`Select email to ${l.recipient}`}
                      checked={selected.has(l.id)}
                      onChange={() => toggleSelect(l.id)}
                      className={`${box} mt-0.5`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-stone-900">{l.recipient}</p>
                      <p className="mt-0.5 truncate text-xs text-stone-500">{l.subject}</p>
                      {l.status === "failed" && l.error && <p className="mt-1 text-xs text-red-700">{l.error}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                        {statusTag(l)}
                        {typeTag(l.type)}
                        <span className="text-[11px] uppercase tracking-wider">{l.provider}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-stone-500">
                        Created {fmt(l.createdAt)} · sent {l.sentAt ? fmt(l.sentAt) : "not yet"}
                      </p>
                      <div className="mt-2">{actions(l)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* iPad and up: the table */}
            <div className={`hidden md:block ${tableWrap}`}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className="w-12 !pl-5">
                      <input type="checkbox" aria-label="Select all" checked={allOn} onChange={toggleSelectAll} className={box} />
                    </th>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Via</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Sent</th>
                    <th className="!pr-5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className={selected.has(l.id) ? "bg-ember-50" : "hover:bg-stone-50"}>
                      <td className="!pl-5">
                        <input
                          type="checkbox"
                          aria-label={`Select email to ${l.recipient}`}
                          checked={selected.has(l.id)}
                          onChange={() => toggleSelect(l.id)}
                          className={box}
                        />
                      </td>
                      <td className="max-w-[200px] truncate text-stone-900" title={l.recipient}>{l.recipient}</td>
                      <td className="max-w-[260px] text-stone-500">
                        <span className="block truncate" title={l.subject}>{l.subject}</span>
                        {l.status === "failed" && l.error && (
                          <span className="block truncate text-xs text-red-700" title={l.error}>{l.error}</span>
                        )}
                      </td>
                      <td>{typeTag(l.type)}</td>
                      <td className="text-[11px] uppercase tracking-wider text-stone-500">{l.provider}</td>
                      <td>{statusTag(l)}</td>
                      <td className="whitespace-nowrap text-stone-500">{fmt(l.createdAt)}</td>
                      <td className="whitespace-nowrap text-stone-500">{fmt(l.sentAt)}</td>
                      <td className="!pr-5 whitespace-nowrap text-right">{actions(l)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <SheetFooter>
          <span className="text-stone-500">{totalPages > 1 ? `Page ${page} of ${totalPages}` : `${total.toLocaleString("en-GB")} ${total === 1 ? "email" : "emails"}`}</span>
          {totalPages > 1 && (
            <>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={`${btn.small} ml-auto`}>
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-stone-900 px-3 text-[13px] text-white transition hover:bg-black disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </>
          )}
        </SheetFooter>
      </Sheet>

      {/* View email */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div
            role="dialog"
            aria-label="Email preview"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white text-stone-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 border-b border-stone-100 px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate font-outfit text-lg font-normal">{viewing.subject || "…"}</h2>
                <p className="truncate text-xs text-stone-500">To: {viewing.recipient}</p>
              </div>
              <button onClick={() => setViewing(null)} aria-label="Close" className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:text-stone-900">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              {viewLoading ? (
                <Empty>Loading…</Empty>
              ) : viewing.bodyHtml ? (
                <iframe title="Email preview" srcDoc={viewing.bodyHtml} className="h-[60vh] w-full" sandbox="" />
              ) : (
                <Empty>No stored body for this email (logged before full-body capture).</Empty>
              )}
            </div>
            <div className="border-t border-stone-100 px-5 py-3 text-right">
              <button onClick={() => setViewing(null)} className={btn.light}>Close</button>
            </div>
          </div>
        </div>
      )}
    </OwnLayout>
  );
}
