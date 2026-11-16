"use client";

import { useEffect, useState, useCallback } from "react";

type Booking = { id: string; name: string; email: string; phone: string; partySize: number; arrivalTime: string; status: string; confirmSentAt: string | null; confirmedAt: string | null; createdAt: string };
type Summary = { reservations: number; people: number; confirmed: number; cancelled: number };

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-gold-100 text-gold-700",
  arrived: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
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

export default function AdminSundayBuffetPage() {
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
    if (!confirm(`Clear ALL reservations for ${prettyDate}? This cannot be undone.`)) return;
    await fetch("/api/admin/sunday-buffet", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", date: resolvedDate }),
    });
    fetchData();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-stone-500 mt-0.5">Reservations for {prettyDate || "…"}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(shiftWeeks(resolvedDate, -1))} disabled={!resolvedDate} className="px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-stone-700 hover:text-stone-900 disabled:opacity-40">← Prev</button>
          <button onClick={() => setDate("")} className="px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-stone-700 hover:text-stone-900">This Sunday</button>
          <button onClick={() => setDate(shiftWeeks(resolvedDate, 1))} disabled={!resolvedDate} className="px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-stone-700 hover:text-stone-900">Next →</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 max-w-2xl">
        <div className="rounded-xl p-4 border bg-white border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Reservations</p>
          <p className="text-2xl font-bold text-stone-900">{summary.reservations}</p>
        </div>
        <div className="rounded-xl p-4 border bg-white border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">People</p>
          <p className="text-2xl font-bold text-gold-700">{summary.people}</p>
        </div>
        <div className="rounded-xl p-4 border bg-white border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Confirmed</p>
          <p className="text-2xl font-bold text-emerald-700">{summary.confirmed}</p>
        </div>
        <div className="rounded-xl p-4 border bg-white border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-stone-900">{summary.cancelled}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        {confirmNote && <span className="text-xs text-stone-500 mr-auto">{confirmNote}</span>}
        <button onClick={() => askToConfirm()} disabled={withEmail === 0 || confirming} className="px-3 py-2 text-xs text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition disabled:opacity-40">
          {confirming ? "Sending…" : `✓ Ask guests to confirm${withEmail ? ` (${withEmail})` : ""}`}
        </button>
        <button onClick={openMail} className="px-3 py-2 text-xs text-gold-700 border border-gold-400 rounded-xl hover:bg-gold-100 transition disabled:opacity-40">
          ✉ Email everyone{withEmail ? ` (${withEmail})` : ""}
        </button>
        <button onClick={resetDay} className="px-3 py-2 text-xs text-red-700 border border-red-200 rounded-xl hover:bg-red-50 transition">Clear all for this Sunday</button>
      </div>

      {mailOpen && (
        <div className="bg-white border border-stone-100 rounded-2xl p-5 mb-6">
          <div className="inline-flex gap-1 p-1 bg-stone-50 rounded-xl mb-4">
            <button
              onClick={() => setMailScope("day")}
              disabled={withEmail === 0}
              className={`px-3 py-1.5 text-xs rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${mailScope === "day" ? "bg-gold-300 text-black font-semibold" : "text-stone-500 hover:text-stone-900"}`}
            >
              Booked for {prettyDate} ({withEmail})
            </button>
            <button
              onClick={() => setMailScope("all")}
              className={`px-3 py-1.5 text-xs rounded-lg transition ${mailScope === "all" ? "bg-gold-300 text-black font-semibold" : "text-stone-500 hover:text-stone-900"}`}
            >
              All past guests ({allCount ?? "…"})
            </button>
          </div>
          {mailScope === "day" ? (
            <>
              <p className="text-sm text-stone-900 font-semibold mb-1">Email everyone booked for {prettyDate}</p>
              <p className="text-xs text-stone-500 mb-4">Goes to the {withEmail} guest{withEmail === 1 ? "" : "s"} with an email (cancelled excluded). Sent from your normal bookings address.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-900 font-semibold mb-1">Email everyone who has been to the buffet</p>
              <p className="text-xs text-stone-500 mb-4">Goes to {allCount ?? "…"} {allCount === 1 ? "person" : "people"} booked for a Sunday that has already happened, one email each even if they came more than once. Upcoming and cancelled bookings are left out. Sent from your normal bookings address.</p>
            </>
          )}
          {/* Saved emails for this screen. One click fills the form; you still press Send. */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {mailTemplates.map((t) => (
              <button
                key={t.key}
                onClick={() => { setMailSubject(t.subject); setMailMessage(t.body); setMailNote(`Loaded "${t.name}".`); }}
                className="px-3 py-1.5 text-sm text-stone-700 border border-stone-200 rounded-full hover:bg-stone-50 transition"
              >
                {t.name}
              </button>
            ))}
            <button
              onClick={saveMailTemplate}
              disabled={!mailSubject.trim() || !mailMessage.trim()}
              className="px-3 py-1.5 text-sm text-gold-700 border border-dashed border-stone-200 rounded-full hover:bg-stone-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              + Save current
            </button>
          </div>
          <input
            value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} placeholder="Subject"
            className="w-full px-3 py-2.5 mb-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm placeholder-stone-400 focus:outline-none focus:border-gold-400"
          />
          <textarea
            value={mailMessage} onChange={(e) => setMailMessage(e.target.value)} rows={6}
            placeholder="Your message. Line breaks are kept. Each guest is greeted by name automatically."
            className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm placeholder-stone-400 focus:outline-none focus:border-gold-400 resize-y"
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={sendMailAll} disabled={mailing} className="px-4 py-2 text-sm bg-gold-300 text-black font-semibold rounded-lg hover:bg-gold-400 transition disabled:opacity-50">
              {mailing ? "Sending…" : `Send to ${mailScope === "all" ? (allCount ?? "…") : withEmail}`}
            </button>
            <button onClick={() => { setMailOpen(false); setMailNote(""); }} className="text-sm text-stone-500 hover:text-stone-900">Cancel</button>
            {mailNote && <span className="text-xs text-stone-500">{mailNote}</span>}
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-stone-500">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="p-8 text-center text-stone-500">No reservations for this Sunday yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-stone-500 border-b border-stone-100">
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Arrives</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Booked</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className={`border-b border-stone-100 hover:bg-stone-50 ${b.status === "cancelled" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-sm text-stone-900">{b.name}</td>
                    <td className="px-4 py-3 text-sm text-stone-900 font-semibold tabular-nums">{b.arrivalTime}</td>
                    <td className="px-4 py-3 text-sm text-gold-700 font-semibold">{b.partySize}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">{b.email || "—"}{b.phone ? <><br />{b.phone}</> : null}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">{fmt(b.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || "bg-stone-100 text-stone-700"}`}>{b.status}</span>
                        {b.status !== "cancelled" && (
                          b.confirmedAt
                            ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700" title={`Confirmed ${fmt(b.confirmedAt)}`}>✓ confirmed</span>
                            : b.confirmSentAt
                              ? <span className="text-[11px] text-stone-400" title={`Confirmation requested ${fmt(b.confirmSentAt)}`}>awaiting</span>
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
                            className="text-gold-700 hover:text-gold-700 disabled:opacity-40 whitespace-nowrap"
                          >
                            {confirmingId === b.id ? "Sending…" : b.confirmSentAt ? "✉ Resend" : "✉ Confirm"}
                          </button>
                        )}
                        {b.status !== "arrived" && <button onClick={() => setStatus(b.id, "arrived")} className="text-emerald-700 hover:text-emerald-700">Arrived</button>}
                        {b.status !== "cancelled" ? (
                          <button onClick={() => setStatus(b.id, "cancelled")} className="text-stone-500 hover:text-stone-900">Cancel</button>
                        ) : (
                          <button onClick={() => setStatus(b.id, "booked")} className="text-stone-500 hover:text-stone-900">Restore</button>
                        )}
                        <button onClick={() => remove(b.id)} className="text-red-700 hover:text-red-700">Delete</button>
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
