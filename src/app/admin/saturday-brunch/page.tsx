"use client";

import { useEffect, useState, useCallback } from "react";

type Booking = { id: string; name: string; email: string; phone: string; partySize: number; arrivalTime: string; package: string; packageLabel: string; pricePerHead: number; heardFrom: string; fromPopup?: boolean; status: string; confirmSentAt: string | null; confirmedAt: string | null; createdAt: string };
type Summary = { reservations: number; people: number; drinkers: number; confirmed: number; cancelled: number; revenue: number; fromPopup?: number };

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-gold-300/15 text-gold-300",
  arrived: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
};

function shiftWeeks(iso: string, weeks: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + weeks * 7);
  return dt.toISOString().slice(0, 10);
}

function fmt(s: string) {
  return new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type DateRow = { date: string; prettyDate: string; blocked: boolean; hidden: boolean; capacity: number | null; booked: number; soldOut: boolean; note: string };

const EMPTY: Summary = { reservations: 0, people: 0, drinkers: 0, confirmed: 0, cancelled: 0, revenue: 0 };

export default function AdminSaturdayBrunchPage() {
  const [date, setDate] = useState("");
  const [resolvedDate, setResolvedDate] = useState("");
  const [prettyDate, setPrettyDate] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY);
  // "Where did you hear about us?" answers for the selected Sunday.
  const [heardFrom, setHeardFrom] = useState<{ label: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRows, setDateRows] = useState<DateRow[]>([]);
  const [savingDate, setSavingDate] = useState("");

  // "Email everyone" composer (bulk custom message)
  const [mailOpen, setMailOpen] = useState(false);
  const [mailSubject, setMailSubject] = useState("");
  const [mailMessage, setMailMessage] = useState("");
  const [mailing, setMailing] = useState(false);
  const [mailNote, setMailNote] = useState("");
  // "day" = guests booked for the Sunday on screen; "all" = everyone from past Sundays.
  const [mailScope, setMailScope] = useState<"day" | "all">("day");
  const [allCount, setAllCount] = useState<number | null>(null);

  // Saved emails scoped to this screen. They omit the greeting and sign-off,
  // which this route adds, so they are not interchangeable with blast templates.
  type MailTemplate = { key: string; name: string; subject: string; body: string };
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>([]);

  const fetchMailTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/mailing/templates?scope=feast");
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
      body: JSON.stringify({ name, subject: mailSubject, body: mailMessage, scope: "feast" }),
    });
    if (!res.ok) { setMailNote("Could not save that one."); return; }
    await fetchMailTemplates();
    setMailNote(`Saved as "${name}".`);
  }

  // "Ask guests to confirm attendance": everyone at once, or one guest
  const [confirming, setConfirming] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const withEmail = bookings.filter((b) => b.status !== "cancelled" && b.email).length;

  // Master on/off for brunch bookings. null while loading.
  const [bookingsOpen, setBookingsOpen] = useState<boolean | null>(null);
  const [savingOpen, setSavingOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/saturday-brunch/bookings-open")
      .then((r) => r.json())
      .then((d) => setBookingsOpen(typeof d.open === "boolean" ? d.open : true))
      .catch(() => setBookingsOpen(true));
  }, []);

  async function toggleBookings() {
    if (bookingsOpen === null) return;
    const next = !bookingsOpen;
    if (!next && !confirm("Turn off Sunday Feast bookings? Guests won't be able to book until you turn them back on.")) return;
    setSavingOpen(true);
    try {
      const res = await fetch("/api/admin/saturday-brunch/bookings-open", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: next }),
      });
      if (res.ok) setBookingsOpen(next);
    } finally {
      setSavingOpen(false);
    }
  }

  const fetchDates = useCallback(async () => {
    const res = await fetch("/api/admin/saturday-brunch/dates");
    const d = await res.json();
    setDateRows(d.dates || []);
  }, []);

  useEffect(() => { fetchDates(); }, [fetchDates]);

  async function saveDate(date: string, patch: { blocked?: boolean; hidden?: boolean; capacity?: number | null }) {
    setSavingDate(date);
    try {
      await fetch("/api/admin/saturday-brunch/dates", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ...patch }),
      });
      await fetchDates();
    } finally {
      setSavingDate("");
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/saturday-brunch${date ? `?date=${date}` : ""}`);
    const d = await res.json();
    setBookings(d.bookings || []);
    setSummary(d.summary || EMPTY);
    setHeardFrom(d.heardFrom || []);
    setResolvedDate(d.date || "");
    setPrettyDate(d.prettyDate || "");
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/saturday-brunch/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    fetchData();
  }
  async function remove(id: string) {
    if (!confirm("Delete this reservation?")) return;
    await fetch(`/api/admin/saturday-brunch/${id}`, { method: "DELETE" });
    fetchData();
  }
  async function openMail() {
    const opening = !mailOpen;
    setMailOpen(opening);
    if (!opening) return;
    if (withEmail === 0) setMailScope("all");
    fetch("/api/admin/saturday-brunch/mail?scope=all")
      .then((r) => r.json())
      .then((d) => setAllCount(typeof d.total === "number" ? d.total : 0))
      .catch(() => setAllCount(0));
  }

  async function sendMailEveryone() {
    const total = allCount ?? 0;
    if (!confirm(`Email all ${total} past Sunday Feast guests? Each person gets one email.`)) return;
    setMailing(true);
    setMailNote("");
    let sent = 0, failed = 0, offset: number | null = 0;
    try {
      // The server sends 25 at a time; keep asking until it says we're done.
      while (offset !== null) {
        const res: Response = await fetch("/api/admin/saturday-brunch/mail", {
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
      const res = await fetch("/api/admin/saturday-brunch/mail", {
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
      const res = await fetch("/api/admin/saturday-brunch/confirm-request", {
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
    if (!confirm(`Clear ALL reservations for ${prettyDate}? This cannot be undone.`)) return;
    await fetch("/api/admin/saturday-brunch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", date: resolvedDate }),
    });
    fetchData();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sunday Feast</h1>
          <p className="text-sm text-stone-500 mt-0.5">Reservations for {prettyDate || "…"}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(shiftWeeks(resolvedDate, -1))} disabled={!resolvedDate} className="px-3 py-2 text-sm bg-ink-900 border border-white/10 rounded-lg text-stone-300 hover:text-white disabled:opacity-40">← Prev</button>
          <button onClick={() => setDate("")} className="px-3 py-2 text-sm bg-ink-900 border border-white/10 rounded-lg text-stone-300 hover:text-white">This Sunday</button>
          <button onClick={() => setDate(shiftWeeks(resolvedDate, 1))} disabled={!resolvedDate} className="px-3 py-2 text-sm bg-ink-900 border border-white/10 rounded-lg text-stone-300 hover:text-white">Next →</button>
        </div>
      </div>

      {/* ── Master switch: Sunday Feast bookings on / off ── */}
      <div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 mb-6 max-w-2xl ${
        bookingsOpen === false ? "border-red-500/30 bg-red-500/[0.06]" : "border-white/[0.06] bg-ink-900"
      }`}>
        <div>
          <p className="text-sm font-semibold text-white">
            Sunday Feast bookings are{" "}
            {bookingsOpen === null ? "…" : bookingsOpen
              ? <span className="text-emerald-400">ON</span>
              : <span className="text-red-400">OFF</span>}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {bookingsOpen === false
              ? "Guests see “Bookings closed” and can’t reserve. Existing reservations are kept."
              : "Guests can reserve on the Sunday Feast page."}
          </p>
        </div>
        <button
          onClick={toggleBookings}
          disabled={bookingsOpen === null || savingOpen}
          role="switch"
          aria-checked={!!bookingsOpen}
          aria-label="Sunday Feast bookings"
          className={`relative w-16 h-9 rounded-full transition-colors disabled:opacity-50 ${bookingsOpen ? "bg-emerald-500" : "bg-white/10"}`}
        >
          <span className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow transition-transform ${bookingsOpen ? "translate-x-7" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6 max-w-3xl">
        <div className="rounded-xl p-4 border bg-ink-900 border-white/[0.06]">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Reservations</p>
          <p className="text-2xl font-bold text-white">{summary.reservations}</p>
        </div>
        <div className="rounded-xl p-4 border bg-ink-900 border-white/[0.06]">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">People</p>
          <p className="text-2xl font-bold text-gold-300">{summary.people}</p>
        </div>
        <div className="rounded-xl p-4 border bg-ink-900 border-white/[0.06]">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Confirmed</p>
          <p className="text-2xl font-bold text-emerald-400">{summary.confirmed}</p>
        </div>
        <div className="rounded-xl p-4 border bg-ink-900 border-white/[0.06]">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Expected</p>
          <p className="text-2xl font-bold text-emerald-400">£{summary.revenue}</p>
        </div>
        <div className="rounded-xl p-4 border bg-ink-900 border-white/[0.06]">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-white">{summary.cancelled}</p>
        </div>
      </div>

      {/* ── Where guests heard about the feast ── */}
      {summary.reservations > 0 && (
        <div className="bg-ink-900 border border-white/[0.06] rounded-2xl p-5 mb-6 max-w-2xl">
          <p className="text-sm text-white font-semibold mb-3">Heard about us</p>
          <div className="space-y-2">
            {heardFrom.map((h) => {
              const pct = summary.reservations ? Math.round((h.count / summary.reservations) * 100) : 0;
              return (
                <div key={h.label} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-stone-400">{h.label}</span>
                  <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gold-300 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-white tabular-nums">{h.count} <span className="text-stone-500 text-xs">{pct}%</span></span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-stone-500">Counted per booking. The question is optional on the booking form.</p>
          <p className="mt-4 pt-4 border-t border-white/[0.06] text-sm text-stone-400">
            Booked through the website pop-up:{" "}
            <span className="text-white font-semibold tabular-nums">{summary.fromPopup ?? 0}</span>
            <span className="text-stone-500"> of {summary.reservations}</span>
          </p>
        </div>
      )}

      {/* ── Availability: block / unblock each upcoming Sunday ── */}
      <div className="bg-ink-900 border border-white/[0.06] rounded-2xl p-5 mb-6">
        <p className="text-sm text-white font-semibold mb-1">Availability</p>
        <p className="text-xs text-stone-500 mb-4">
          <strong className="text-stone-400">Mark sold out</strong> keeps the date on the form but shows it crossed out. <strong className="text-stone-400">Hide</strong> removes it from the form entirely. A capacity sells the date out automatically once that many covers are booked.
        </p>
        <div className="space-y-2">
          {dateRows.length === 0 ? (
            <p className="text-xs text-stone-600">Loading dates…</p>
          ) : dateRows.map((d) => (
            <div key={d.date} className={`flex flex-wrap items-center gap-3 py-2.5 px-3 rounded-xl bg-black/30 border border-white/[0.06] ${d.hidden ? "opacity-50" : ""}`}>
              <span className="text-sm text-white min-w-[170px]">{d.prettyDate}</span>

              {d.hidden ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-stone-300">Hidden</span>
              ) : d.soldOut ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400">Sold out</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400">Open</span>
              )}

              <span className="text-xs text-stone-500">
                {d.booked} booked{d.capacity !== null ? ` of ${d.capacity}` : ""}
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <label className="text-[11px] text-stone-500">Capacity</label>
                <input
                  type="number"
                  min={0}
                  defaultValue={d.capacity ?? ""}
                  placeholder="∞"
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const next = raw === "" ? null : parseInt(raw);
                    if (next !== d.capacity) saveDate(d.date, { capacity: next });
                  }}
                  className="w-20 px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-gold-300/60"
                />
                <button
                  onClick={() => saveDate(d.date, { blocked: !d.blocked })}
                  disabled={savingDate === d.date}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition disabled:opacity-40 ${
                    d.blocked
                      ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                      : "text-red-400 border-red-500/30 hover:bg-red-500/10"
                  }`}
                >
                  {savingDate === d.date ? "…" : d.blocked ? "Reopen" : "Mark sold out"}
                </button>
                <button
                  onClick={() => saveDate(d.date, { hidden: !d.hidden })}
                  disabled={savingDate === d.date}
                  title={d.hidden ? "Show this date to guests" : "Remove this date from the booking form"}
                  className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-stone-300 hover:text-white hover:bg-white/5 transition disabled:opacity-40"
                >
                  {d.hidden ? "Show" : "Hide"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        {confirmNote && <span className="text-xs text-stone-400 mr-auto">{confirmNote}</span>}
        <button onClick={() => askToConfirm()} disabled={withEmail === 0 || confirming} className="px-3 py-2 text-xs text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/10 transition disabled:opacity-40">
          {confirming ? "Sending…" : `✓ Ask guests to confirm${withEmail ? ` (${withEmail})` : ""}`}
        </button>
        <button onClick={openMail} className="px-3 py-2 text-xs text-gold-300 border border-gold-300/30 rounded-xl hover:bg-gold-300/10 transition disabled:opacity-40">
          ✉ Email everyone{withEmail ? ` (${withEmail})` : ""}
        </button>
        <button onClick={resetDay} className="px-3 py-2 text-xs text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition">Clear all for this Sunday</button>
      </div>

      {mailOpen && (
        <div className="bg-ink-900 border border-white/[0.06] rounded-2xl p-5 mb-6">
          <div className="inline-flex gap-1 p-1 bg-black/40 rounded-xl mb-4">
            <button
              onClick={() => setMailScope("day")}
              disabled={withEmail === 0}
              className={`px-3 py-1.5 text-xs rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${mailScope === "day" ? "bg-gold-300 text-black font-semibold" : "text-stone-400 hover:text-white"}`}
            >
              Booked for {prettyDate} ({withEmail})
            </button>
            <button
              onClick={() => setMailScope("all")}
              className={`px-3 py-1.5 text-xs rounded-lg transition ${mailScope === "all" ? "bg-gold-300 text-black font-semibold" : "text-stone-400 hover:text-white"}`}
            >
              All past guests ({allCount ?? "…"})
            </button>
          </div>
          {mailScope === "day" ? (
            <>
              <p className="text-sm text-white font-semibold mb-1">Email everyone booked for {prettyDate}</p>
              <p className="text-xs text-stone-500 mb-4">Goes to the {withEmail} guest{withEmail === 1 ? "" : "s"} with an email (cancelled excluded). Sent from your normal bookings address.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-white font-semibold mb-1">Email everyone who has been to the Sunday Feast</p>
              <p className="text-xs text-stone-500 mb-4">Goes to {allCount ?? "…"} {allCount === 1 ? "person" : "people"} booked for a Sunday that has already happened, one email each even if they came more than once. Upcoming and cancelled bookings are left out. Sent from your normal bookings address.</p>
            </>
          )}
          {/* Saved emails for this screen. One click fills the form; you still press Send. */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {mailTemplates.map((t) => (
              <button
                key={t.key}
                onClick={() => { setMailSubject(t.subject); setMailMessage(t.body); setMailNote(`Loaded "${t.name}".`); }}
                className="px-3 py-1.5 text-sm text-stone-300 border border-white/10 rounded-full hover:bg-white/5 transition"
              >
                {t.name}
              </button>
            ))}
            <button
              onClick={saveMailTemplate}
              disabled={!mailSubject.trim() || !mailMessage.trim()}
              className="px-3 py-1.5 text-sm text-gold-300 border border-dashed border-white/10 rounded-full hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              + Save current
            </button>
          </div>
          <input
            value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} placeholder="Subject"
            className="w-full px-3 py-2.5 mb-3 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-stone-500 focus:outline-none focus:border-gold-300/60"
          />
          <textarea
            value={mailMessage} onChange={(e) => setMailMessage(e.target.value)} rows={6}
            placeholder="Your message. Line breaks are kept. Each guest is greeted by name automatically. Type {feast} for a link to book."
            className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-stone-500 focus:outline-none focus:border-gold-300/60 resize-y"
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={sendMailAll} disabled={mailing} className="px-4 py-2 text-sm bg-gold-300 text-black font-semibold rounded-lg hover:bg-gold-400 transition disabled:opacity-50">
              {mailing ? "Sending…" : `Send to ${mailScope === "all" ? (allCount ?? "…") : withEmail}`}
            </button>
            <button onClick={() => { setMailOpen(false); setMailNote(""); }} className="text-sm text-stone-400 hover:text-white">Cancel</button>
            {mailNote && <span className="text-xs text-stone-400">{mailNote}</span>}
          </div>
        </div>
      )}


      <div className="bg-ink-900 border border-white/[0.06] rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-stone-500">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="p-8 text-center text-stone-500">No reservations for this Sunday yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-stone-500 border-b border-white/[0.06]">
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Arrives</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Heard</th>
                  <th className="px-4 py-3">Booked</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${b.status === "cancelled" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-sm text-white">{b.name}</td>
                    <td className="px-4 py-3 text-sm text-white font-semibold tabular-nums">{b.arrivalTime}</td>
                    <td className="px-4 py-3 text-sm text-gold-300 font-semibold">{b.partySize}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-stone-400">{b.packageLabel}</span>
                      <br />
                      <span className="text-stone-500">£{b.pricePerHead} pp · £{b.pricePerHead * b.partySize}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">{b.email || "—"}{b.phone ? <><br />{b.phone}</> : null}</td>
                    <td className="px-4 py-3 text-xs text-stone-400">
                      {b.heardFrom || "—"}
                      {b.fromPopup && <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-stone-200">Pop-up</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">{fmt(b.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || "bg-white/10 text-stone-300"}`}>{b.status}</span>
                        {b.status !== "cancelled" && (
                          b.confirmedAt
                            ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400" title={`Confirmed ${fmt(b.confirmedAt)}`}>✓ confirmed</span>
                            : b.confirmSentAt
                              ? <span className="text-[11px] text-stone-600" title={`Confirmation requested ${fmt(b.confirmSentAt)}`}>awaiting</span>
                              : null
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        {b.email && b.status !== "cancelled" && (
                          <button
                            onClick={() => askToConfirm(b)}
                            disabled={confirmingId === b.id}
                            title={b.confirmedAt ? `Resend the confirmation email to ${b.name}` : `Email ${b.name} a link to confirm they're coming`}
                            className="text-gold-300 hover:text-gold-200 disabled:opacity-40 whitespace-nowrap"
                          >
                            {confirmingId === b.id ? "Sending…" : b.confirmSentAt ? "✉ Resend" : "✉ Confirm"}
                          </button>
                        )}
                        {b.status !== "arrived" && <button onClick={() => setStatus(b.id, "arrived")} className="text-emerald-400 hover:text-emerald-300">Arrived</button>}
                        {b.status !== "cancelled" ? (
                          <button onClick={() => setStatus(b.id, "cancelled")} className="text-stone-400 hover:text-white">Cancel</button>
                        ) : (
                          <button onClick={() => setStatus(b.id, "booked")} className="text-stone-400 hover:text-white">Restore</button>
                        )}
                        <button onClick={() => remove(b.id)} className="text-red-400 hover:text-red-300">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
