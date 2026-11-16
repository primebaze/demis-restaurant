"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, FileUp, Plus, Search, Send, UserPlus, X } from "lucide-react";
import { OwnLayout, PageHead, Sheet, SheetFooter, Tag, Seg, Empty, btn, field, fieldArea, table, tableWrap } from "@/components/admin/ui";

type Template = {
  key: string;
  name: string;
  subject: string;
  body: string;
};

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

  // Add one contact by hand
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  async function addContact() {
    if (!newEmail.trim()) return;
    setAddingContact(true);
    setUploadResult(null);
    try {
      const res = await fetch("/api/admin/mailing/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, name: newName }),
      });
      const d = await res.json();
      if (!res.ok) { setUploadResult(d.error || "Could not add contact"); return; }
      setUploadResult(d.existed ? `${newEmail.trim()} is already on the list.` : `Added ${newEmail.trim()}.`);
      setNewEmail("");
      setNewName("");
      setPage(1);
      await fetchContacts();
    } finally {
      setAddingContact(false);
    }
  }

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

  // ── Saved emails ──
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateNote, setTemplateNote] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/mailing/templates");
    const data = await res.json();
    setTemplates(data.templates || []);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function loadTemplate(t: Template) {
    setSubject(t.subject);
    setBody(t.body);
    setTemplateNote(`Loaded "${t.name}". Check it over, then send.`);
  }

  // Saving under a name that already exists overwrites it; that is how you edit
  // one: load it, change the wording, save it back.
  async function saveTemplate() {
    const name = window.prompt("Save this email as:", "")?.trim();
    if (!name) return;
    const res = await fetch("/api/admin/mailing/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, body }),
    });
    if (!res.ok) {
      setTemplateNote("Could not save that one.");
      return;
    }
    await fetchTemplates();
    setTemplateNote(`Saved as "${name}".`);
  }

  async function deleteTemplate(t: Template) {
    if (!window.confirm(`Delete the saved email "${t.name}"? This does not affect anything already sent.`))
      return;
    await fetch(`/api/admin/mailing/templates?key=${encodeURIComponent(t.key)}`, { method: "DELETE" });
    await fetchTemplates();
    setTemplateNote(`Deleted "${t.name}".`);
  }
  const [emailStyle, setEmailStyle] = useState<"plain" | "branded">("branded");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pendingLimit, setPendingLimit] = useState<number | null>(null);
  const [batchSize, setBatchSize] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  // Select / clear all subscribed contacts on the current page.
  function toggleSelectPage() {
    const pageIds = contacts.filter((c) => !c.unsubscribed).map((c) => c.id);
    setSelected((s) => {
      const allOn = pageIds.every((id) => s.has(id));
      const next = new Set(s);
      if (allOn) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function send(test?: string, limit?: number) {
    if (!subject.trim() || !body.trim()) {
      setSendResult("Add a subject and a message first.");
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const ids = !test && selected.size > 0 ? Array.from(selected) : undefined;
      const res = await fetch("/api/admin/mailing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, style: emailStyle, test: test || undefined, ids, limit }),
      });
      const d = await res.json();
      if (!res.ok) setSendResult(d.error || "Send failed");
      else if (d.test) setSendResult(`Test sent to ${test}. Check the inbox.`);
      else {
        const parts = [`Sent to ${d.sent} of ${d.total}`];
        if (d.failed) parts.push(`${d.failed} failed`);
        if (d.skipped) parts.push(`skipped ${d.skipped} already emailed`);
        let msg = parts.join(", ") + ".";
        if (d.remaining) msg += ` ${d.remaining} still to go.`;
        setSendResult(msg);
        setSelected(new Set());
      }
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


  const pageSubs = contacts.filter((c) => !c.unsubscribed);
  const allPageOn = pageSubs.length > 0 && pageSubs.every((c) => selected.has(c.id));
  const startConfirm = (limit: number | null) => {
    if (!subject.trim() || !body.trim()) { setSendResult("Add a subject and a message first."); return; }
    setSendResult(null); setPendingLimit(limit); setConfirming(true);
  };
  const box = "h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-gold-300 align-middle disabled:cursor-not-allowed disabled:opacity-30";
  const codeCls = "rounded-md bg-stone-100 px-1.5 py-px font-outfit text-stone-900";

  return (
    <OwnLayout>
      <PageHead
        title="Email Blast"
        subtitle="Marketing emails to your client list. It is kept apart from bookings and never touches the website."
        actions={
          <label className={`${btn.glass} cursor-pointer ${uploading ? "opacity-60" : ""}`}>
            <FileUp className="h-5 w-5" strokeWidth={1.5} />
            {uploading ? "Reading file…" : "Upload a client list"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/pdf"
              onChange={handleUpload}
              className="sr-only"
              disabled={uploading}
            />
          </label>
        }
      />

      {/* Numbers, and the last upload or add */}
      <section aria-label="Contact numbers" className="glass mb-4 grid grid-cols-3 gap-y-1 rounded-[22px] px-1.5 py-2 text-white lg:grid-cols-[1fr_1fr_1fr_2.4fr]">
        {[
          { label: "Subscribed", value: summary.subscribed },
          { label: "Unsubscribed", value: summary.unsubscribed },
          { label: "Total contacts", value: summary.all },
        ].map((s) => (
          <div key={s.label} className="px-4 py-2.5">
            <div className="text-[13px] font-light text-white/85">{s.label}</div>
            <div className="mt-0.5 text-2xl font-light md:text-[26px]">{s.value.toLocaleString("en-GB")}</div>
          </div>
        ))}
        <div className="col-span-3 flex items-center gap-3 border-t border-white/20 px-4 py-2.5 lg:col-span-1 lg:border-l lg:border-t-0" aria-live="polite">
          {uploadResult ? (
            <>
              <CheckCircle2 className="h-6 w-6 shrink-0" strokeWidth={1.5} />
              <p className="text-sm font-light leading-snug">{uploadResult}</p>
            </>
          ) : (
            <>
              <FileUp className="h-6 w-6 shrink-0 opacity-85" strokeWidth={1.5} />
              <p className="text-[13px] font-light leading-snug text-white/85">
                Excel (.xlsx), CSV, or PDF. Emails are extracted and duplicates are merged automatically.
              </p>
            </>
          )}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        {/* Contacts */}
        <Sheet label="Contacts" className="overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pt-[18px] md:flex-row md:items-center md:px-5">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-outfit text-xl font-normal tracking-tight text-stone-900">Contacts</h2>
              <span className="text-[13px] font-light text-stone-500">{total.toLocaleString("en-GB")}</span>
            </div>
            <div className="relative md:ml-auto md:w-60">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-500" strokeWidth={1.75} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search email or name…"
                aria-label="Search contacts"
                className={`${field} !pl-10`}
              />
            </div>
          </div>

          {/* Add one by hand */}
          <div className="mt-3 flex flex-col gap-2 px-4 sm:flex-row md:px-5">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addContact(); }}
              placeholder="email@example.com"
              aria-label="New contact email"
              className={`${field} sm:flex-[1.2]`}
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addContact(); }}
              placeholder="Name (optional)"
              aria-label="New contact name"
              className={`${field} sm:flex-1`}
            />
            <button onClick={addContact} disabled={addingContact || !newEmail.trim()} className={`${btn.dark} !h-11 shrink-0 justify-center`}>
              <UserPlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {addingContact ? "Adding…" : "Add"}
            </button>
          </div>

          <p className="mt-2.5 px-4 pb-3 text-xs font-light text-stone-500 md:px-5">
            Tick contacts to send to just them (e.g. a warm-up batch). Leave everything unticked to send to all subscribers.
            {selected.size > 0 && <span className="text-stone-900"> · {selected.size} selected</span>}
          </p>

          {loading ? (
            <Empty>Loading…</Empty>
          ) : contacts.length === 0 ? (
            <Empty>No contacts yet. Upload a CSV or PDF to get started.</Empty>
          ) : (
            <>
              {/* Phones: one card per contact */}
              <div className="md:hidden">
                <label className="flex items-center gap-3 border-t border-stone-100 px-4 py-2.5 text-xs text-stone-500">
                  <input type="checkbox" aria-label="Select all on this page" checked={allPageOn} onChange={toggleSelectPage} className={box} />
                  Select all on this page
                </label>
                <ul>
                  {contacts.map((c) => (
                    <li key={c.id} className={`flex items-center gap-3 border-t border-stone-100 px-4 py-3 ${selected.has(c.id) ? "bg-stone-100" : ""}`}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.email}`}
                        checked={selected.has(c.id)}
                        disabled={c.unsubscribed}
                        onChange={() => toggleSelect(c.id)}
                        className={box}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-stone-900">{c.email}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span>{c.name || "Not given"}</span>
                          <span className="text-[11px] uppercase tracking-wider">{c.source}</span>
                          {c.unsubscribed ? <Tag tone="bad">Unsubscribed</Tag> : <Tag tone="ok">Subscribed</Tag>}
                        </div>
                      </div>
                      <button onClick={() => deleteContact(c.id)} className="shrink-0 text-[13px] text-stone-500 transition hover:text-red-700">
                        Delete
                      </button>
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
                        <input type="checkbox" aria-label="Select all on this page" checked={allPageOn} onChange={toggleSelectPage} className={box} />
                      </th>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th className="!pr-5"><span className="sr-only">Delete</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c.id} className={selected.has(c.id) ? "bg-ember-50" : "hover:bg-stone-50"}>
                        <td className="!pl-5">
                          <input
                            type="checkbox"
                            aria-label={`Select ${c.email}`}
                            checked={selected.has(c.id)}
                            disabled={c.unsubscribed}
                            onChange={() => toggleSelect(c.id)}
                            className={box}
                          />
                        </td>
                        <td className="max-w-[220px] truncate text-stone-900">{c.email}</td>
                        <td className="max-w-[140px] truncate text-stone-500">{c.name || "Not given"}</td>
                        <td className="text-[11px] uppercase tracking-wider text-stone-500">{c.source}</td>
                        <td>{c.unsubscribed ? <Tag tone="bad">Unsubscribed</Tag> : <Tag tone="ok">Subscribed</Tag>}</td>
                        <td className="!pr-5 text-right">
                          <button onClick={() => deleteContact(c.id)} className="text-[13px] text-stone-500 transition hover:text-red-700">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <SheetFooter>
            <span className="text-stone-500">{totalPages > 1 ? `Page ${page} of ${totalPages}` : `${total.toLocaleString("en-GB")} ${total === 1 ? "contact" : "contacts"}`}</span>
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

        {/* Compose */}
        <Sheet label="Compose" className="p-4 md:p-5 lg:sticky lg:top-[96px] lg:self-start">
          <div className="flex items-center gap-3">
            <h2 className="font-outfit text-xl font-normal tracking-tight text-stone-900">Compose</h2>
            <button
              onClick={saveTemplate}
              disabled={!subject.trim() || !body.trim()}
              className="ml-auto inline-flex h-8 items-center gap-1 rounded-full border border-stone-200 bg-white px-3 text-[13px] text-stone-900 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-500"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Save current
            </button>
          </div>

          {/* Saved emails: one click fills the form, you still press Send. */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-light text-stone-500">Saved emails</span>
            {templates.length === 0 && <span className="text-xs text-stone-500">None yet</span>}
            {templates.map((t) => (
              <span key={t.key} className="inline-flex h-8 items-center overflow-hidden rounded-full border border-stone-200 bg-white">
                <button onClick={() => loadTemplate(t)} title="Load this into the form" className="h-full pl-3 pr-2 text-[13px] text-stone-800 transition hover:bg-stone-50">
                  {t.name}
                </button>
                <button
                  onClick={() => deleteTemplate(t)}
                  title={`Delete "${t.name}"`}
                  aria-label={`Delete saved email ${t.name}`}
                  className="flex h-full items-center border-l border-stone-100 px-2 text-stone-500 transition hover:bg-stone-50 hover:text-red-700"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </span>
            ))}
          </div>
          {templateNote ? <p className="mt-2 text-[11px] text-stone-500">{templateNote}</p> : null}

          <div className="mt-3.5 space-y-2.5">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" aria-label="Subject line" className={field} />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Hi {name},\n\nWrite your message here… links become clickable, blank lines start new paragraphs."}
              aria-label="Message"
              rows={8}
              className={`${fieldArea} resize-y`}
            />
            <p className="mx-1 text-xs font-light leading-relaxed text-stone-500">
              Use <code className={codeCls}>{"{name}"}</code> for the recipient&apos;s first name, <code className={codeCls}>{"{buffet}"}</code> or{" "}
              <code className={codeCls}>{"{feast}"}</code> for a tracked booking link, and <code className={codeCls}>{"{vote}"}</code> for the awards link. Clicks on those
              show up under Link Clicks.
            </p>

            {/* Email style and a test send */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Seg
                label="Email style"
                value={emailStyle}
                onChange={setEmailStyle}
                options={[
                  { value: "branded", label: "Demi's template" },
                  { value: "plain", label: "Plain / personal" },
                ]}
              />
              <div className="flex min-w-[220px] flex-1 gap-2">
                <input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Test email address"
                  className={`${field} !h-10 min-w-0 flex-1`}
                />
                <button onClick={() => send(testEmail.trim())} disabled={sending || !testEmail.trim()} className={`${btn.light} shrink-0`}>
                  Send test
                </button>
              </div>
            </div>
          </div>

          {/* Send: separated, with a two-step confirm to prevent accidental blasts */}
          <div className="mt-4 border-t border-stone-100 pt-4">
            {selected.size > 0 && (
              <p className="mb-2 text-center text-xs text-stone-500">
                Sending to <span className="font-medium text-stone-900">{selected.size} selected</span> ·{" "}
                <button onClick={() => setSelected(new Set())} className="underline hover:text-stone-900">clear</button>
              </p>
            )}
            {!confirming ? (
              <div className="space-y-3">
                <button onClick={() => startConfirm(null)} disabled={sending} className={`${btn.primary} w-full justify-center`}>
                  <Send className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {sending ? "Sending…" : selected.size > 0 ? `Send to ${selected.size} selected` : `Send to all ${summary.subscribed.toLocaleString("en-GB")} subscribers`}
                </button>

                {/* Warm-up: send the next N who haven't received it yet */}
                {selected.size === 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-stone-500">
                    <span>or send the next</span>
                    <input
                      type="number"
                      min={1}
                      value={batchSize}
                      onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                      aria-label="How many to send next"
                      className="h-8 w-16 rounded-full border border-stone-200 bg-stone-50 px-2 text-center text-[13px] text-stone-900 outline-none focus:border-stone-500"
                    />
                    <button onClick={() => startConfirm(batchSize)} disabled={sending} className={btn.small}>
                      Send next {batchSize} not yet emailed
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-[18px] bg-stone-50 p-4">
                <p className="text-center text-sm text-stone-900">
                  {pendingLimit != null
                    ? <>Send to the next <span className="font-medium text-stone-900">{pendingLimit}</span> who haven&apos;t received this yet? This can&apos;t be undone.</>
                    : selected.size > 0
                    ? <>Send this to the <span className="font-medium text-stone-900">{selected.size} selected</span> {selected.size === 1 ? "contact" : "contacts"}? Anyone who already got it is skipped. This can&apos;t be undone.</>
                    : <>Send this to all <span className="font-medium text-stone-900">{summary.subscribed}</span> subscribers? Anyone who already got it is skipped. This can&apos;t be undone.</>}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(false)} disabled={sending} className={`${btn.light} !h-11 flex-1 justify-center`}>
                    Cancel
                  </button>
                  <button
                    onClick={() => { setConfirming(false); send(undefined, pendingLimit ?? undefined); }}
                    disabled={sending}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-red-700 px-5 text-[15px] font-medium text-white transition hover:bg-red-800 disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Yes, send now"}
                  </button>
                </div>
              </div>
            )}
            {sendResult && <p className="mt-3 text-center text-xs text-stone-700" aria-live="polite">{sendResult}</p>}
          </div>
        </Sheet>
      </div>
    </OwnLayout>
  );
}
