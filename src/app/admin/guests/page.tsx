"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, FileText, Mail, Search, Send, Upload, Users, X } from "lucide-react";
import {
  OwnLayout, PageHead, Sheet, SheetFooter, Tag, Avatar, Seg, Empty, btn, field, fieldArea, table, tableWrap, statusTone, statusLabel,
} from "@/components/admin/ui";

interface GuestRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string;
  notes: string;
  totalBookings: number;
  totalVisits: number;
  totalSpendPence: number;
  lastBooking: { date: string; status: string } | null;
  createdAt: string;
}

interface ComposeState {
  mode: "single" | "all";
  guestId?: string;
  toLabel: string;
  toName?: string;
  subject: string;
  message: string;
  provider: "smtp" | "resend";
  sending: boolean;
  error: string;
  success: string;
  failures: { name: string; email: string }[];
}

/** "2026-11-15" to "Sun 15 Nov". Anything else is shown as it is. */
function niceDate(d: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
}

function TagChips({ tags }: { tags: string }) {
  if (!tags) return null;
  return (
    <>
      {tags.split(",").map((tag) => {
        const t = tag.trim();
        if (!t) return null;
        const hot = t.toLowerCase() === "vip";
        return (
          <span key={tag} className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] whitespace-nowrap ${hot ? "bg-gold-100 text-gold-800" : "bg-stone-100 text-stone-600"}`}>
            {t}
          </span>
        );
      })}
    </>
  );
}

const label = "mb-1.5 ml-1 block text-xs font-light text-stone-500";

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Compose panel
  const [compose, setCompose] = useState<ComposeState | null>(null);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));

    const res = await fetch(`/api/admin/guests?${params}`);
    const data = await res.json();
    setGuests(data.guests || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function startEdit(guest: GuestRow) {
    setEditingId(guest.id);
    setEditTags(guest.tags || "");
    setEditNotes(guest.notes || "");
  }

  async function saveEdit() {
    if (!editingId) return;
    await fetch("/api/admin/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, tags: editTags, notes: editNotes }),
    });
    setEditingId(null);
    fetchGuests();
  }

  async function exportPdf() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/guests?export=true&page=1");
      const data = await res.json();
      const allGuests: GuestRow[] = data.guests || [];

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text("Guest CRM — Demi's Restaurant", 14, 16);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Exported ${new Date().toLocaleDateString("en-GB")} · ${allGuests.length} guests`, 14, 23);

      autoTable(doc, {
        startY: 28,
        head: [["Name", "Email", "Phone", "Tags", "Bookings", "Visits", "Spend", "Last Booking"]],
        body: allGuests.map((g) => [
          g.name,
          g.email || "—",
          g.phone || "—",
          g.tags || "—",
          g.totalBookings,
          g.totalVisits,
          `£${(g.totalSpendPence / 100).toFixed(2)}`,
          g.lastBooking ? `${g.lastBooking.date} (${g.lastBooking.status})` : "—",
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [26, 26, 26], textColor: [232, 204, 156] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`demis-guests-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  async function exportCsv() {
    setExportingCsv(true);
    try {
      const res = await fetch("/api/admin/guests?export=true&page=1");
      const data = await res.json();
      const allGuests: GuestRow[] = data.guests || [];

      const headers = [
        "Name", "Email", "Phone", "Tags", "Notes",
        "Bookings", "Visits", "Spend (GBP)", "Last Booking Date", "Last Booking Status", "Added",
      ];
      const esc = (v: unknown) => {
        const s = String(v ?? "");
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = allGuests.map((g) =>
        [
          g.name,
          g.email,
          g.phone,
          g.tags,
          g.notes,
          g.totalBookings,
          g.totalVisits,
          (g.totalSpendPence / 100).toFixed(2),
          g.lastBooking?.date || "",
          g.lastBooking?.status || "",
          new Date(g.createdAt).toLocaleDateString("en-GB"),
        ].map(esc).join(",")
      );
      // Prepend a BOM so Excel reads accented characters correctly.
      const csv = "﻿" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `demis-guests-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCsv(false);
    }
  }

  function openComposeSingle(guest: GuestRow) {
    setCompose({
      mode: "single",
      guestId: guest.id,
      toLabel: `${guest.name} <${guest.email}>`,
      toName: guest.name,
      subject: "",
      message: "",
      provider: "smtp",
      sending: false,
      error: "",
      success: "",
      failures: [],
    });
  }

  function openComposeAll() {
    setCompose({
      mode: "all",
      toLabel: "All guests with email address",
      subject: "",
      message: "",
      provider: "smtp",
      sending: false,
      error: "",
      success: "",
      failures: [],
    });
  }

  async function sendEmail() {
    if (!compose) return;
    if (!compose.subject.trim()) {
      setCompose((c) => c && { ...c, error: "Subject is required" });
      return;
    }
    if (!compose.message.trim()) {
      setCompose((c) => c && { ...c, error: "Message is required" });
      return;
    }

    setCompose((c) => c && { ...c, sending: true, error: "" });

    const body =
      compose.mode === "all"
        ? { all: true, subject: compose.subject, message: compose.message, provider: compose.provider }
        : { guestId: compose.guestId, subject: compose.subject, message: compose.message, provider: compose.provider };

    const res = await fetch("/api/admin/email/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setCompose((c) => c && { ...c, sending: false, error: data.error || "Failed to send" });
    } else if (typeof data.queued === "number") {
      // Bulk send is queued and drained at 15/hour by the cron
      const successMsg = `${data.queued} email${data.queued !== 1 ? "s" : ""} queued, sending at 15 an hour. Track progress in Email Logs.`;
      setCompose((c) => c && { ...c, sending: false, success: successMsg, failures: [] });
      setTimeout(() => setCompose(null), 3500);
    } else {
      const successMsg = data.failed > 0
        ? `Sent to ${data.sent} · ${data.failed} failed`
        : `Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}`;
      setCompose((c) => c && { ...c, sending: false, success: successMsg, failures: data.failures || [] });
      if (data.failed === 0) setTimeout(() => setCompose(null), 2500);
    }
  }

  const composingFor = compose?.mode === "single" ? compose.guestId : undefined;

  const editPanel = (
    <div className="grid gap-3 rounded-[18px] bg-stone-50 p-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] md:items-end">
      <label className="block">
        <span className={label}>Tags (comma-separated)</span>
        <input
          type="text"
          value={editTags}
          onChange={(e) => setEditTags(e.target.value)}
          placeholder="VIP, regular, birthday"
          className={`${field} !h-10 !bg-white`}
        />
      </label>
      <label className="block">
        <span className={label}>Notes</span>
        <textarea
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          rows={1}
          placeholder="Allergies, preferences..."
          className={`${fieldArea} min-h-[40px] resize-y !bg-white !py-2.5`}
        />
      </label>
      <div className="flex gap-1.5">
        <button onClick={() => setEditingId(null)} className={`${btn.small} !h-10 !px-4`}>
          Cancel
        </button>
        <button onClick={saveEdit} className={btn.dark}>
          Save
        </button>
      </div>
    </div>
  );

  return (
    <OwnLayout>
      <PageHead
        title="Guests"
        subtitle={`${total.toLocaleString("en-GB")} guests, everyone who has booked with us or been imported`}
        actions={
          <>
            <Link href="/admin/guests/import" className={btn.glass}>
              <Upload className="h-5 w-5" strokeWidth={1.5} />
              Import
            </Link>
            <button onClick={exportPdf} disabled={exporting} className={`${btn.glass} disabled:opacity-50`}>
              <FileText className="h-5 w-5" strokeWidth={1.5} />
              {exporting ? "Exporting…" : "Export PDF"}
            </button>
            <button onClick={exportCsv} disabled={exportingCsv} className={`${btn.glass} disabled:opacity-50`}>
              <Download className="h-5 w-5" strokeWidth={1.5} />
              {exportingCsv ? "Exporting…" : "Export CSV"}
            </button>
            <button onClick={openComposeAll} className={btn.primary}>
              <Mail className="h-5 w-5" strokeWidth={1.5} />
              Email all guests
            </button>
          </>
        }
      />

      <div className={`grid gap-3 ${compose ? "lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        {/* Guest list */}
        <Sheet label="Guest list" className="overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pb-4 pt-[18px] md:flex-row md:items-center md:px-5">
            <div className="flex items-baseline gap-3">
              <h2 className="font-outfit text-xl font-normal tracking-tight text-stone-900">Guests</h2>
              <span className="text-[13px] font-light text-stone-500">Click a name for their profile</span>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2 md:ml-auto md:w-[380px]">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" strokeWidth={1.75} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, email or phone"
                  aria-label="Search guests"
                  className={`${field} !pl-10`}
                />
              </div>
              <button type="submit" className={`${btn.dark} !h-11`}>
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                    setPage(1);
                  }}
                  className={`${btn.light} !h-11`}
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {loading ? (
            <Empty>Loading guests...</Empty>
          ) : guests.length === 0 ? (
            <Empty>No guests found</Empty>
          ) : (
            <>
              {/* Phones: one card per guest */}
              <ul className="md:hidden">
                {guests.map((g) => (
                  <li key={g.id} className={`border-t border-stone-100 px-4 py-3.5 ${composingFor === g.id ? "bg-gold-50" : ""}`}>
                    <div className="flex items-start gap-3">
                      <Avatar name={g.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link href={`/admin/guests/${g.id}`} className="text-[15px] text-stone-900 hover:text-gold-700">
                            {g.name}
                          </Link>
                          <TagChips tags={g.tags} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-stone-500">
                          {g.email} {g.phone && `· ${g.phone}`}
                        </p>
                        <p className="mt-1.5 text-xs text-stone-500">
                          <span className="text-stone-900">{g.totalBookings}</span> bookings · <span className="text-stone-900">{g.totalVisits}</span> visits ·{" "}
                          <span className="text-stone-900">£{(g.totalSpendPence / 100).toFixed(0)}</span> spend
                        </p>
                        {g.lastBooking && (
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-stone-500">
                            Last booking {niceDate(g.lastBooking.date)}
                            <Tag tone={statusTone(g.lastBooking.status)}>{statusLabel(g.lastBooking.status)}</Tag>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {g.email && <MailButton on={composingFor === g.id} name={g.name} onClick={() => openComposeSingle(g)} />}
                        <button onClick={() => startEdit(g)} className={btn.small}>
                          Edit
                        </button>
                      </div>
                    </div>
                    {editingId === g.id && <div className="mt-3">{editPanel}</div>}
                  </li>
                ))}
              </ul>

              {/* iPad and up: the table */}
              <div className={`hidden md:block ${tableWrap}`}>
                <table className={table}>
                  <thead>
                    <tr>
                      <th className="!pl-5">Guest</th>
                      <th className="!text-right">Bookings</th>
                      <th className="!text-right">Visits</th>
                      <th className="!text-right">Spend</th>
                      <th>Last booking</th>
                      <th className="!pr-5"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((g) => (
                      <GuestRows key={g.id} g={g} on={composingFor === g.id} editing={editingId === g.id} editPanel={editPanel} onMail={() => openComposeSingle(g)} onEdit={() => startEdit(g)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <SheetFooter>
            <span className="text-stone-500">
              {totalPages > 1 ? `Page ${page} of ${totalPages}` : `${total.toLocaleString("en-GB")} ${total === 1 ? "guest" : "guests"}`}
            </span>
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

        {/* Send email: a side sheet on computers and iPad landscape, a pop-up below that */}
        {compose && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center lg:static lg:z-auto lg:block lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Sheet label="Send email" className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:max-w-none">
              <div className="mb-4 flex items-center gap-2.5">
                <h2 className="font-outfit text-xl font-normal tracking-tight text-stone-900">Send email</h2>
                <button
                  onClick={() => setCompose(null)}
                  disabled={compose.sending}
                  aria-label="Close"
                  className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:text-stone-900 disabled:opacity-50"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>

              <span className={label}>To</span>
              <div className="mb-3.5 flex h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-2 pr-4 text-sm text-stone-600">
                {compose.mode === "single" && compose.toName ? (
                  <Avatar name={compose.toName} />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-800">
                    <Users className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                )}
                <span className="truncate">{compose.toLabel}</span>
              </div>

              <label className={label} htmlFor="compose-subject">Subject</label>
              <input
                id="compose-subject"
                type="text"
                value={compose.subject}
                onChange={(e) => setCompose((c) => c && { ...c, subject: e.target.value })}
                placeholder="e.g. Special offer for you"
                className={`${field} mb-3.5`}
                autoFocus
              />

              <label className={label} htmlFor="compose-message">Message</label>
              <textarea
                id="compose-message"
                value={compose.message}
                onChange={(e) => setCompose((c) => c && { ...c, message: e.target.value })}
                rows={8}
                placeholder="Write your message here..."
                className={`${fieldArea} resize-none`}
              />
              <p className="mx-1 mb-3.5 mt-2 text-xs font-light leading-relaxed text-stone-500">
                Type <code className="rounded-md bg-gold-50 px-1.5 py-px font-outfit text-gold-700">{"{name}"}</code> for their first name and{" "}
                <code className="rounded-md bg-gold-50 px-1.5 py-px font-outfit text-gold-700">{"{feast}"}</code> for a link to the Sunday Feast page. Links are
                tracked, see who clicked in Link Clicks.
              </p>

              <span className={label}>Send via</span>
              <div className="mb-4 [&>div]:flex [&>div]:w-full [&_button]:flex-1">
                <Seg
                  label="Send via"
                  value={compose.provider}
                  onChange={(p) => setCompose((c) => c && { ...c, provider: p })}
                  options={[
                    { value: "smtp", label: <>SMTP <span className="text-[11px] opacity-70">{compose.mode === "all" ? "15 an hour, queued" : "inbox-friendly"}</span></> },
                    { value: "resend", label: <>Resend <span className="text-[11px] opacity-70">fast, no cap</span></> },
                  ]}
                />
              </div>

              {compose.error && <p className="mb-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{compose.error}</p>}
              {compose.success && (
                <div className="mb-3">
                  <p className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{compose.success}</p>
                  {compose.failures.length > 0 && (
                    <div className="mt-2 rounded-2xl bg-red-50 px-4 py-3">
                      <p className="mb-2 text-xs font-medium text-red-700">Failed deliveries:</p>
                      <ul className="space-y-1">
                        {compose.failures.map((f) => (
                          <li key={f.email} className="text-xs text-stone-500">
                            {f.name}: <span className="text-red-700">{f.email}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-auto flex gap-2">
                <button onClick={() => setCompose(null)} disabled={compose.sending} className={`${btn.light} !h-11`}>
                  Cancel
                </button>
                <button onClick={sendEmail} disabled={compose.sending} className={`${btn.primary} flex-1 justify-center`}>
                  <Send className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {compose.sending ? "Sending… (this may take a moment)" : "Send"}
                </button>
              </div>
            </Sheet>
          </div>
        )}
      </div>
    </OwnLayout>
  );
}

function MailButton({ on, name, onClick }: { on: boolean; name: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Email this guest"
      aria-label={`Email ${name}`}
      className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
        on ? "border-gold-300 bg-gold-300 text-ink-900" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900"
      }`}
    >
      <Mail className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

function GuestRows({
  g, on, editing, editPanel, onMail, onEdit,
}: { g: GuestRow; on: boolean; editing: boolean; editPanel: React.ReactNode; onMail: () => void; onEdit: () => void }) {
  return (
    <>
      <tr className={on ? "bg-gold-50" : "hover:bg-stone-50"}>
        <td className="!pl-5">
          <div className="flex items-center gap-3">
            <Avatar name={g.name} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/admin/guests/${g.id}`} className="text-stone-900 transition hover:text-gold-700">
                  {g.name}
                </Link>
                <TagChips tags={g.tags} />
              </div>
              <p className="max-w-[340px] truncate text-xs text-stone-500">
                {g.email} {g.phone && `· ${g.phone}`}
              </p>
            </div>
          </div>
        </td>
        <td className="text-right tabular-nums">{g.totalBookings}</td>
        <td className="text-right tabular-nums">{g.totalVisits}</td>
        <td className="text-right tabular-nums">£{(g.totalSpendPence / 100).toFixed(0)}</td>
        <td className="whitespace-nowrap">
          {g.lastBooking ? (
            <>
              <div className="mb-1 text-[13px]">{niceDate(g.lastBooking.date)}</div>
              <Tag tone={statusTone(g.lastBooking.status)}>{statusLabel(g.lastBooking.status)}</Tag>
            </>
          ) : (
            <span className="text-stone-300">·</span>
          )}
        </td>
        <td className="!pr-5 text-right">
          <span className="inline-flex gap-1.5">
            {g.email && <MailButton on={on} name={g.name} onClick={onMail} />}
            <button onClick={onEdit} className={btn.small}>
              Edit
            </button>
          </span>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={6} className="!border-t-0 !px-5 !pb-3.5 !pt-0">
            {editPanel}
          </td>
        </tr>
      )}
    </>
  );
}
