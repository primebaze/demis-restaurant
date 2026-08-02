"use client";

import { useEffect, useState, useCallback } from "react";

type Booking = { id: string; name: string; email: string; phone: string; partySize: number; arrivalTime: string; status: string; confirmSentAt: string | null; confirmedAt: string | null; createdAt: string };
type Summary = { reservations: number; people: number; confirmed: number; cancelled: number };

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
  async function sendMailAll() {
    if (!mailSubject.trim() || !mailMessage.trim()) { setMailNote("Add a subject and a message first."); return; }
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
          <h1 className="text-2xl font-bold text-white">Sunday Buffet</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reservations for {prettyDate || "…"}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(shiftWeeks(resolvedDate, -1))} disabled={!resolvedDate} className="px-3 py-2 text-sm bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:text-white disabled:opacity-40">← Prev</button>
          <button onClick={() => setDate("")} className="px-3 py-2 text-sm bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:text-white">This Sunday</button>
          <button onClick={() => setDate(shiftWeeks(resolvedDate, 1))} disabled={!resolvedDate} className="px-3 py-2 text-sm bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:text-white">Next →</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 max-w-2xl">
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reservations</p>
          <p className="text-2xl font-bold text-white">{summary.reservations}</p>
        </div>
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">People</p>
          <p className="text-2xl font-bold text-gold-300">{summary.people}</p>
        </div>
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Confirmed</p>
          <p className="text-2xl font-bold text-emerald-400">{summary.confirmed}</p>
        </div>
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-white">{summary.cancelled}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        {confirmNote && <span className="text-xs text-gray-400 mr-auto">{confirmNote}</span>}
        <button onClick={() => askToConfirm()} disabled={withEmail === 0 || confirming} className="px-3 py-2 text-xs text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/10 transition disabled:opacity-40">
          {confirming ? "Sending…" : `✓ Ask guests to confirm${withEmail ? ` (${withEmail})` : ""}`}
        </button>
        <button onClick={() => setMailOpen((v) => !v)} disabled={withEmail === 0} className="px-3 py-2 text-xs text-gold-300 border border-gold-300/30 rounded-xl hover:bg-gold-300/10 transition disabled:opacity-40">
          ✉ Email everyone{withEmail ? ` (${withEmail})` : ""}
        </button>
        <button onClick={resetDay} className="px-3 py-2 text-xs text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition">Clear all for this Sunday</button>
      </div>

      {mailOpen && (
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5 mb-6">
          <p className="text-sm text-white font-semibold mb-1">Email everyone booked for {prettyDate}</p>
          <p className="text-xs text-gray-500 mb-4">Goes to the {withEmail} guest{withEmail === 1 ? "" : "s"} with an email (cancelled excluded). Sent from your normal bookings address.</p>
          <input
            value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} placeholder="Subject"
            className="w-full px-3 py-2.5 mb-3 bg-black/40 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold-300/60"
          />
          <textarea
            value={mailMessage} onChange={(e) => setMailMessage(e.target.value)} rows={6}
            placeholder="Your message. Line breaks are kept. Each guest is greeted by name automatically."
            className="w-full px-3 py-2.5 bg-black/40 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold-300/60 resize-y"
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={sendMailAll} disabled={mailing} className="px-4 py-2 text-sm bg-gold-300 text-black font-semibold rounded-lg hover:bg-gold-400 transition disabled:opacity-50">
              {mailing ? "Sending…" : `Send to ${withEmail}`}
            </button>
            <button onClick={() => { setMailOpen(false); setMailNote(""); }} className="text-sm text-gray-400 hover:text-white">Cancel</button>
            {mailNote && <span className="text-xs text-gray-400">{mailNote}</span>}
          </div>
        </div>
      )}

      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No reservations for this Sunday yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
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
                  <tr key={b.id} className={`border-b border-gray-800/50 hover:bg-white/[0.02] ${b.status === "cancelled" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-sm text-white">{b.name}</td>
                    <td className="px-4 py-3 text-sm text-white font-semibold tabular-nums">{b.arrivalTime}</td>
                    <td className="px-4 py-3 text-sm text-gold-300 font-semibold">{b.partySize}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{b.email || "—"}{b.phone ? <><br />{b.phone}</> : null}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmt(b.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || "bg-gray-700 text-gray-300"}`}>{b.status}</span>
                        {b.status !== "cancelled" && (
                          b.confirmedAt
                            ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400" title={`Confirmed ${fmt(b.confirmedAt)}`}>✓ confirmed</span>
                            : b.confirmSentAt
                              ? <span className="text-[11px] text-gray-600" title={`Confirmation requested ${fmt(b.confirmSentAt)}`}>awaiting</span>
                              : null
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        {b.email && b.status !== "cancelled" && (
                          <button onClick={() => askToConfirm(b)} disabled={confirmingId === b.id} title={b.confirmedAt ? `Resend confirmation email to ${b.name}` : `Send ${b.name} the confirmation email`} className="text-gold-300 hover:text-gold-200 disabled:opacity-40 text-lg leading-none">{confirmingId === b.id ? "…" : "✉"}</button>
                        )}
                        {b.status !== "arrived" && <button onClick={() => setStatus(b.id, "arrived")} className="text-emerald-400 hover:text-emerald-300">Arrived</button>}
                        {b.status !== "cancelled" ? (
                          <button onClick={() => setStatus(b.id, "cancelled")} className="text-gray-400 hover:text-white">Cancel</button>
                        ) : (
                          <button onClick={() => setStatus(b.id, "booked")} className="text-gray-400 hover:text-white">Restore</button>
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
