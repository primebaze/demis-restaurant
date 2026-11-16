"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  CalendarDays, CalendarX2, Check, ChevronLeft, ChevronRight, CircleCheck, Clock, Forward, ListX, Loader2, Mail, MailPlus,
  Plus, Send, Trash2, Undo2, UserCheck, Users, X,
} from "lucide-react";
import {
  OwnLayout, PageHead, GlassStats, Sheet, SheetTitle, SheetFooter, Tag, Empty, btn, field, fieldArea, table, tableWrap, type Tone, useTypedConfirm } from "@/components/admin/ui";

type Booking = { id: string; name: string; email: string; phone: string; partySize: number; arrivalTime: string; status: string; confirmSentAt: string | null; confirmedAt: string | null; createdAt: string };
type Summary = { reservations: number; people: number; confirmed: number; cancelled: number };

const STATUS: Record<string, { tone: Tone; label: string }> = {
  booked: { tone: "gold", label: "Booked" },
  arrived: { tone: "ok", label: "Arrived" },
  cancelled: { tone: "off", label: "Cancelled" },
};

/** Glass segmented group that sits on the photo. */
const gseg = "inline-flex h-[46px] items-center gap-0.5 rounded-full border border-white/10 bg-[rgba(58,52,48,0.48)] p-1 backdrop-blur-xl";
const gsegBtn = "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-light whitespace-nowrap transition disabled:opacity-40";
/** Small round icon button on a white sheet. */
const ibtn =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sand-300 bg-sand-50 text-stone-600 transition hover:border-stone-300 hover:text-stone-900 disabled:opacity-40";

/** "2026-11-22" to "22 Nov". */
function shortDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
}

function StatusBits({ b }: { b: Booking }) {
  const s = STATUS[b.status] || { tone: "off" as Tone, label: b.status };
  return (
    <div className="flex flex-col items-start gap-0.5">
      <Tag tone={s.tone}>{s.label}</Tag>
      {b.status !== "cancelled" &&
        (b.confirmedAt ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-stone-900" title={`Confirmed ${fmt(b.confirmedAt)}`}>
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            confirmed
          </span>
        ) : b.confirmSentAt ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-stone-500" title={`Confirmation requested ${fmt(b.confirmSentAt)}`}>
            <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
            awaiting
          </span>
        ) : null)}
    </div>
  );
}

type RowActionProps = {
  b: Booking;
  sending: boolean;
  onConfirm: () => void;
  onStatus: (status: string) => void;
  onDelete: () => void;
};

/** Row actions: icon buttons in the table, labelled buttons on phone cards. */
function RowActions({ b, sending, onConfirm, onStatus, onDelete, labels = false }: RowActionProps & { labels?: boolean }) {
  const confirmTitle = b.confirmedAt ? `Resend the confirmation email to ${b.name}` : `Email ${b.name} a link to confirm they're coming`;
  const confirmIcon = sending ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : b.confirmSentAt ? <Forward className="h-4 w-4" strokeWidth={1.5} /> : <MailPlus className="h-4 w-4" strokeWidth={1.5} />;
  const items: ReactNode[] = [];
  if (b.email && b.status !== "cancelled") {
    items.push(
      labels ? (
        <button key="c" onClick={onConfirm} disabled={sending} title={confirmTitle} className={btn.small}>
          {confirmIcon}
          {sending ? "Sending…" : b.confirmSentAt ? "Resend" : "Ask to confirm"}
        </button>
      ) : (
        <button key="c" onClick={onConfirm} disabled={sending} title={confirmTitle} aria-label={confirmTitle} className={ibtn}>
          {confirmIcon}
        </button>
      ),
    );
  }
  if (b.status !== "arrived") {
    items.push(
      <button key="a" onClick={() => onStatus("arrived")} className={btn.small}>
        <UserCheck className="h-4 w-4" strokeWidth={1.5} />
        Arrived
      </button>,
    );
  }
  const cancelLabel = b.status !== "cancelled" ? "Cancel" : "Restore";
  const cancelIcon = b.status !== "cancelled" ? <CalendarX2 className="h-4 w-4" strokeWidth={1.5} /> : <Undo2 className="h-4 w-4" strokeWidth={1.5} />;
  const onCancel = () => onStatus(b.status !== "cancelled" ? "cancelled" : "booked");
  items.push(
    labels ? (
      <button key="x" onClick={onCancel} className={btn.small}>
        {cancelIcon}
        {cancelLabel}
      </button>
    ) : (
      <button key="x" onClick={onCancel} title={cancelLabel} aria-label={`${cancelLabel} ${b.name}`} className={ibtn}>
        {cancelIcon}
      </button>
    ),
  );
  items.push(
    labels ? (
      <button key="d" onClick={onDelete} className={`${btn.small} text-red-700`}>
        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
        Delete
      </button>
    ) : (
      <button key="d" onClick={onDelete} title="Delete" aria-label={`Delete ${b.name}`} className={`${ibtn} hover:text-red-700`}>
        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
      </button>
    ),
  );
  return <div className={labels ? "flex flex-wrap gap-1.5" : "inline-flex items-center gap-1.5"}>{items}</div>;
}

function shiftWeeks(iso: string, weeks: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + weeks * 7);
  return dt.toISOString().slice(0, 10);
}

function fmt(s: string) {
  return new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminSundayBuffetPage() {
  const [askToType, typeDialog] = useTypedConfirm();
  const [date, setDate] = useState("");
  const [resolvedDate, setResolvedDate] = useState("");
  const [prettyDate, setPrettyDate] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<Summary>({ reservations: 0, people: 0, confirmed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  // "Email everyone" composer (bulk custom message)
  const [mailOpen, setMailOpen] = useState(false);
  const [mailSubject, setMailSubject] = useState("");
  const [mailMessage, setMailMessage] = useState("");
  const [mailing, setMailing] = useState(false);
  const [mailNote, setMailNote] = useState("");
  // "day" = guests booked for the Sunday on screen; "all" = everyone from past Sundays.
  const [mailScope, setMailScope] = useState<"day" | "all">("day");
  const [allCount, setAllCount] = useState<number | null>(null);

  // Saved emails scoped to this screen — they omit the greeting and sign-off,
  // which this route adds, so they are not interchangeable with blast templates.
  type MailTemplate = { key: string; name: string; subject: string; body: string };
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>([]);

  const fetchMailTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/mailing/templates?scope=buffet");
    if (!res.ok) return;
    const data = await res.json();
    setMailTemplates(data.templates || []);
  }, []);

  useEffect(() => {
    fetchMailTemplates();
  }, [fetchMailTemplates]);

  async function saveMailTemplate() {
    const name = window.prompt("Save this email as:", "")?.trim();
    if (!name) return;
    const res = await fetch("/api/admin/mailing/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject: mailSubject, body: mailMessage, scope: "buffet" }),
    });
    if (!res.ok) { setMailNote("Could not save that one."); return; }
    await fetchMailTemplates();
    setMailNote(`Saved as "${name}".`);
  }

  // "Ask guests to confirm attendance" — bulk + per-guest
  const [confirming, setConfirming] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const withEmail = bookings.filter((b) => b.status !== "cancelled" && b.email).length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/sunday-buffet${date ? `?date=${date}` : ""}`);
    const d = await res.json();
    setBookings(d.bookings || []);
    setSummary(d.summary || { reservations: 0, people: 0, confirmed: 0, cancelled: 0 });
    setResolvedDate(d.date || "");
    setPrettyDate(d.prettyDate || "");
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/sunday-buffet/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    fetchData();
  }
  async function remove(id: string) {
    if (!confirm("Delete this reservation?")) return;
    await fetch(`/api/admin/sunday-buffet/${id}`, { method: "DELETE" });
    fetchData();
  }
  async function openMail() {
    const opening = !mailOpen;
    setMailOpen(opening);
    if (!opening) return;
    if (withEmail === 0) setMailScope("all");
    fetch("/api/admin/sunday-buffet/mail?scope=all")
      .then((r) => r.json())
      .then((d) => setAllCount(typeof d.total === "number" ? d.total : 0))
      .catch(() => setAllCount(0));
  }

  async function sendMailEveryone() {
    const total = allCount ?? 0;
    if (!confirm(`Email all ${total} past buffet guests? Each person gets one email.`)) return;
    setMailing(true);
    setMailNote("");
    let sent = 0, failed = 0, offset: number | null = 0;
    try {
      // The server sends 25 at a time; keep asking until it says we're done.
      while (offset !== null) {
        const res: Response = await fetch("/api/admin/sunday-buffet/mail", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "all", offset, subject: mailSubject, message: mailMessage }),
        });
        const d: { sent: number; failed: number; total: number; nextOffset: number | null; error?: string } = await res.json();
        if (!res.ok) {
          setMailNote(`${d.error || "Could not send."}${sent ? ` ${sent} sent before it stopped.` : ""}`);
          return;
        }
        sent += d.sent; failed += d.failed;
        offset = d.nextOffset;
        if (offset !== null) setMailNote(`Sending… ${sent + failed} of ${d.total}`);
      }
      setMailNote(`Sent to ${sent} of ${sent + failed}${failed ? ` (${failed} failed)` : ""}.`);
      setMailSubject(""); setMailMessage("");
    } finally {
      setMailing(false);
    }
  }

  async function sendMailAll() {
    if (!mailSubject.trim() || !mailMessage.trim()) { setMailNote("Add a subject and a message first."); return; }
    if (mailScope === "all") return sendMailEveryone();
    if (!confirm(`Email all ${withEmail} guest${withEmail === 1 ? "" : "s"} booked for ${prettyDate}?`)) return;
    setMailing(true);
    setMailNote("");
    try {
      const res = await fetch("/api/admin/sunday-buffet/mail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: resolvedDate, subject: mailSubject, message: mailMessage }),
      });
      const d = await res.json();
      if (!res.ok) { setMailNote(d.error || "Could not send."); return; }
      setMailNote(`Sent to ${d.sent} of ${d.total}${d.failed ? ` (${d.failed} failed)` : ""}.`);
      setMailSubject(""); setMailMessage("");
    } finally {
      setMailing(false);
    }
  }

  async function askToConfirm(b?: Booking) {
    const prompt = b
      ? `Send ${b.name} the confirmation email now?`
      : `Email all ${withEmail} guest${withEmail === 1 ? "" : "s"} a link to confirm they're coming on ${prettyDate}?`;
    if (!confirm(prompt)) return;
    if (b) setConfirmingId(b.id); else setConfirming(true);
    setConfirmNote("");
    try {
      const res = await fetch("/api/admin/sunday-buffet/confirm-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: resolvedDate, id: b?.id }),
      });
      const d = await res.json();
      if (!res.ok) { setConfirmNote(d.error || "Could not send."); return; }
      setConfirmNote(b ? `Confirmation email sent to ${b.name}.` : `Confirmation request sent to ${d.sent} of ${d.total}${d.failed ? ` (${d.failed} failed)` : ""}.`);
    } finally {
      if (b) setConfirmingId(null); else setConfirming(false);
    }
  }

  async function resetDay() {
    if (!(await askToType({ title: "Clear all reservations?", message: <>Deletes every Sunday Buffet reservation for {prettyDate}.</>, action: "Clear all" }))) return;
    await fetch("/api/admin/sunday-buffet", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", date: resolvedDate }),
    });
    fetchData();
  }

  const isThisSunday = date === "";
  const dayLabel = shortDate(resolvedDate);

  return (
    <OwnLayout>
      <PageHead
        title="Sunday Buffet"
        subtitle={`${prettyDate ? `Reservations for ${prettyDate} · ` : ""}Streatham Hill · 12.30pm to 4pm`}
        actions={
          <div className={gseg} role="group" aria-label="Choose a Sunday">
            <button onClick={() => setDate(shiftWeeks(resolvedDate, -1))} disabled={!resolvedDate} aria-label="Previous Sunday" className={`${gsegBtn} w-9 justify-center px-0 text-white hover:bg-white/10`}>
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setDate("")}
              aria-pressed={isThisSunday}
              title={isThisSunday ? undefined : "Back to this Sunday"}
              className={`${gsegBtn} ${isThisSunday ? "bg-sand-50 font-normal text-stone-900" : "text-white hover:bg-white/10"}`}
            >
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
              {isThisSunday || !resolvedDate
                ? "This Sunday"
                : new Date(resolvedDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </button>
            <button onClick={() => setDate(shiftWeeks(resolvedDate, 1))} disabled={!resolvedDate} aria-label="Next Sunday" className={`${gsegBtn} w-9 justify-center px-0 text-white hover:bg-white/10`}>
              <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        }
      />

      <GlassStats
        items={[
          { label: "Reservations", value: summary.reservations },
          { label: "People", value: summary.people },
          { label: "Confirmed", value: summary.confirmed },
          { label: "Cancelled", value: summary.cancelled },
        ]}
      />

      <div className={`grid items-start gap-3 ${mailOpen ? "lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_372px]" : ""}`}>
        <Sheet label="Reservations" className="min-w-0 pt-[18px]">
          <div className="px-4 md:px-5">
            <SheetTitle
              aside={
                <button onClick={resetDay} title="Clear all for this Sunday" aria-label="Clear all for this Sunday" className={`${ibtn} h-10 w-10 hover:text-red-700`}>
                  <ListX className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </button>
              }
            >
              Reservations
            </SheetTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => askToConfirm()} disabled={withEmail === 0 || confirming} className={`${btn.primary} h-10 px-4 text-sm`}>
                {confirming ? <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} /> : <CircleCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                {confirming ? "Sending…" : `Ask guests to confirm${withEmail ? ` (${withEmail})` : ""}`}
              </button>
              <button onClick={openMail} aria-expanded={mailOpen} className={btn.dark}>
                <Mail className="h-[18px] w-[18px]" strokeWidth={1.5} />
                Email everyone{withEmail ? ` (${withEmail})` : ""}
              </button>
            </div>
            {confirmNote && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-sand-200 px-3 py-2 text-[13px] text-stone-900" role="status">
                <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {confirmNote}
              </p>
            )}
          </div>

          <div className={`mt-3 transition-opacity ${loading && bookings.length ? "opacity-50" : ""}`}>
            {loading && bookings.length === 0 ? (
              <Empty>Loading…</Empty>
            ) : bookings.length === 0 ? (
              <Empty>No reservations for this Sunday yet.</Empty>
            ) : (
              <>
                {/* Phones: one card per booking */}
                <ul className="divide-y divide-sand-200 border-t border-sand-200 md:hidden">
                  {bookings.map((b) => (
                    <li key={b.id} className={`px-4 py-3.5 ${b.status === "cancelled" ? "text-stone-500" : ""}`}>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px]">{b.name}</div>
                          {b.email && <div className="truncate text-xs text-stone-500">{b.email}</div>}
                          {b.phone && (
                            <a href={`tel:${b.phone.replace(/\s+/g, "")}`} className="text-xs text-stone-500 underline-offset-2 hover:underline">
                              {b.phone}
                            </a>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-medium tabular-nums">{b.arrivalTime}</div>
                          <div className="mt-0.5 inline-flex items-center gap-1 text-sm">
                            <Users className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
                            {b.partySize}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <StatusBits b={b} />
                        <span className="pt-1 text-xs text-stone-500">Booked {fmt(b.createdAt)}</span>
                      </div>
                      <div className="mt-3">
                        <RowActions b={b} labels sending={confirmingId === b.id} onConfirm={() => askToConfirm(b)} onStatus={(s) => setStatus(b.id, s)} onDelete={() => remove(b.id)} />
                      </div>
                    </li>
                  ))}
                </ul>

                {/* iPad and up: the table */}
                <div className={`${tableWrap} hidden px-2 md:block`}>
                  <table className={table}>
                    <thead>
                      <tr>
                        <th>Guest</th>
                        <th>Arrives</th>
                        <th>Party</th>
                        <th>Booked</th>
                        <th>Status</th>
                        <th><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id} className={`hover:bg-sand-100 ${b.status === "cancelled" ? "text-stone-500" : ""}`}>
                          <td className="whitespace-nowrap">
                            <div>
                              {b.name}
                              {b.phone && <span className="ml-2 text-xs text-stone-500">{b.phone}</span>}
                            </div>
                            <div className="text-xs text-stone-500">{b.email || "No email"}</div>
                          </td>
                          <td className="font-medium tabular-nums">{b.arrivalTime}</td>
                          <td>
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
                              {b.partySize}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-[13px] text-stone-500">{fmt(b.createdAt)}</td>
                          <td><StatusBits b={b} /></td>
                          <td className="text-right">
                            <RowActions b={b} sending={confirmingId === b.id} onConfirm={() => askToConfirm(b)} onStatus={(s) => setStatus(b.id, s)} onDelete={() => remove(b.id)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div className="mt-1">
            <SheetFooter>
              <span className="text-stone-500">
                {bookings.length} {bookings.length === 1 ? "reservation" : "reservations"}
                {dayLabel ? ` for ${dayLabel}` : ""}
              </span>
            </SheetFooter>
          </div>
        </Sheet>

        {mailOpen && (
          <Sheet label="Email everyone" className="order-first flex flex-col p-[18px] lg:order-none lg:sticky lg:top-[96px] lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto lg:overscroll-contain lg:self-start">
            <SheetTitle
              aside={
                <button onClick={() => { setMailOpen(false); setMailNote(""); }} aria-label="Close" className={ibtn}>
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              }
            >
              Email everyone
            </SheetTitle>
            <div className="mt-3 inline-flex flex-wrap gap-0.5 self-start rounded-full bg-sand-200 p-1" role="group" aria-label="Who gets it">
              <button
                onClick={() => setMailScope("day")}
                disabled={withEmail === 0}
                aria-pressed={mailScope === "day"}
                className={`h-8 rounded-full px-3.5 text-[13px] whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-40 ${mailScope === "day" ? "bg-sand-50 text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}
              >
                Booked for {dayLabel || prettyDate} ({withEmail})
              </button>
              <button
                onClick={() => setMailScope("all")}
                aria-pressed={mailScope === "all"}
                className={`h-8 rounded-full px-3.5 text-[13px] whitespace-nowrap transition ${mailScope === "all" ? "bg-sand-50 text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}
              >
                All past guests ({allCount ?? "…"})
              </button>
            </div>
            {mailScope === "day" ? (
              <>
                <p className="mt-3 text-sm">Email everyone booked for {prettyDate}</p>
                <p className="mt-0.5 text-xs font-light leading-relaxed text-stone-500">Goes to the {withEmail} guest{withEmail === 1 ? "" : "s"} with an email (cancelled excluded). Sent from your normal bookings address.</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm">Email everyone who has been to the buffet</p>
                <p className="mt-0.5 text-xs font-light leading-relaxed text-stone-500">Goes to {allCount ?? "…"} {allCount === 1 ? "person" : "people"} booked for a Sunday that has already happened, one email each even if they came more than once. Upcoming and cancelled bookings are left out. Sent from your normal bookings address.</p>
              </>
            )}
            {/* Saved emails for this screen. One click fills the form; you still press Send. */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {mailTemplates.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setMailSubject(t.subject); setMailMessage(t.body); setMailNote(`Loaded "${t.name}".`); }}
                  className="inline-flex h-7 items-center rounded-full bg-sand-200 px-3 text-xs text-stone-700 transition hover:bg-sand-300"
                >
                  {t.name}
                </button>
              ))}
              <button
                onClick={saveMailTemplate}
                disabled={!mailSubject.trim() || !mailMessage.trim()}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-stone-300 bg-sand-50 px-3 text-xs text-stone-900 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:text-stone-500"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                Save current
              </button>
            </div>
            <input value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} placeholder="Subject" aria-label="Subject" className={`${field} mt-3`} />
            <textarea
              value={mailMessage}
              onChange={(e) => setMailMessage(e.target.value)}
              rows={8}
              aria-label="Message"
              placeholder="Your message. Line breaks are kept."
              className={`${fieldArea} mt-2 resize-y leading-relaxed`}
            />
            <p className="ml-1 mt-1.5 text-xs text-stone-500">Each guest is greeted by name automatically.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={sendMailAll} disabled={mailing} className={btn.primary}>
                {mailing ? <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} /> : <Send className="h-[18px] w-[18px]" strokeWidth={1.5} />}
                {mailing ? "Sending…" : `Send to ${mailScope === "all" ? (allCount ?? "…") : withEmail}`}
              </button>
              <button onClick={() => { setMailOpen(false); setMailNote(""); }} className={btn.light}>Cancel</button>
            </div>
            {mailNote && <p className="mt-2.5 text-xs text-stone-600" role="status">{mailNote}</p>}
          </Sheet>
        )}
      </div>
      {typeDialog}
    </OwnLayout>
  );
}
