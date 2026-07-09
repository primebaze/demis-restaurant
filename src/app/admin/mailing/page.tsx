"use client";

import { useEffect, useState, useCallback } from "react";

type Contact = {
  id: string;
  email: string;
  name: string;
  source: string;
  unsubscribed: boolean;
  createdAt: string;
};

export default function MailingPage() {
  const [summary, setSummary] = useState({ subscribed: 0, unsubscribed: 0, all: 0 });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/mailing/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setSummary(data.summary || { subscribed: 0, unsubscribed: 0, all: 0 });
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // ── Upload ──
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/mailing/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) {
        setUploadResult(d.error || "Upload failed");
      } else {
        setUploadResult(
          `Added ${d.added} new · merged ${d.merged} · ${d.existing} already on the list · ${d.invalid} invalid. Total contacts: ${d.contactCount}.`
        );
        setPage(1);
        await fetchContacts();
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  // ── Compose / send ──
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [emailStyle, setEmailStyle] = useState<"plain" | "branded">("plain");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  async function send(test?: string) {
    if (!subject.trim() || !body.trim()) {
      setSendResult("Add a subject and a message first.");
      return;
    }
    if (!test && !confirm(`Send this email to all ${summary.subscribed} subscribed contacts?`)) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/mailing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, style: emailStyle, test: test || undefined }),
      });
      const d = await res.json();
      if (!res.ok) setSendResult(d.error || "Send failed");
      else if (d.test) setSendResult(`Test sent to ${test}. Check the inbox.`);
      else setSendResult(`Sent to ${d.sent} of ${d.total}${d.failed ? ` (${d.failed} failed)` : ""}.`);
    } finally {
      setSending(false);
    }
  }

  async function deleteContact(id: string) {
    if (!confirm("Remove this contact from the list?")) return;
    await fetch("/api/admin/mailing/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    fetchContacts();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Email Blast</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Send marketing emails to your client list. This list is separate from your bookings and never touches the website.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Subscribed", value: summary.subscribed },
          { label: "Unsubscribed", value: summary.unsubscribed },
          { label: "Total contacts", value: summary.all },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Upload a client list</h2>
          <p className="text-xs text-gray-500 mb-4">Excel (.xlsx), CSV, or PDF. Emails are extracted and duplicates are merged automatically.</p>
          <label className="flex items-center justify-center h-28 border border-dashed border-gray-700 rounded-xl cursor-pointer text-sm text-gray-500 hover:border-gold-400 transition">
            {uploading ? "Reading file…" : "Click to upload .xlsx, .csv or .pdf"}
            <input type="file" accept=".xlsx,.xls,.csv,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          {uploadResult && <p className="mt-3 text-xs text-gray-300">{uploadResult}</p>}
        </div>

        {/* Compose */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Compose</h2>
          <div className="space-y-3">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
              className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Hi {name},\n\nWrite your message here… links become clickable, blank lines start new paragraphs."}
              rows={7}
              className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400 resize-y"
            />
            <p className="text-[11px] text-gray-500">
              Tip: type <code className="text-gold-300">{"{name}"}</code> in the subject or message and it becomes each person&apos;s first name (e.g. &ldquo;Hi Cordelia,&rdquo;). No name on file falls back to &ldquo;there&rdquo;.
            </p>
            {/* Email style */}
            <div>
              <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden">
                {([
                  { key: "plain", label: "Plain (better for inbox)" },
                  { key: "branded", label: "Branded" },
                ] as const).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setEmailStyle(o.key)}
                    className={`px-3 py-1.5 text-xs transition ${emailStyle === o.key ? "bg-gold-300 text-[#1a1a1a] font-semibold" : "bg-[#0f0f0f] text-gray-400 hover:text-white"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Plain looks like a personal note and lands in the main inbox more often. Branded uses the Demi&apos;s logo template (more likely to be filed under Promotions).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 min-w-[160px] px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
              />
              <button
                onClick={() => send(testEmail.trim())}
                disabled={sending || !testEmail.trim()}
                className="px-3 py-2 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-white/5 transition disabled:opacity-40"
              >
                Send test
              </button>
            </div>
            <button
              onClick={() => send()}
              disabled={sending}
              className="w-full px-4 py-2.5 bg-gold-300 text-black font-semibold rounded-lg text-sm hover:bg-gold-400 transition disabled:opacity-50"
            >
              {sending ? "Sending…" : `Send to ${summary.subscribed} subscribers`}
            </button>
            {sendResult && <p className="text-xs text-gray-300">{sendResult}</p>}
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Contacts ({total})</h2>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search email or name…"
            className="px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400 w-64 max-w-full"
          />
        </div>

        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500 text-sm">Loading…</p>
          ) : contacts.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm">No contacts yet. Upload a CSV or PDF to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm text-white">{c.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{c.name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 uppercase">{c.source}</td>
                      <td className="px-4 py-3">
                        {c.unsubscribed ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Unsubscribed</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Subscribed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteContact(c.id)} className="text-xs text-red-400 hover:text-red-300 transition">
                          Delete
                        </button>
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
    </div>
  );
}
