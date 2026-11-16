"use client";

import { useEffect, useState, useCallback } from "react";

interface BookingRow {
  id: string;
  confirmationCode: string;
  guest: { name: string; email: string; phone: string };
  location: string;
  locationSlug: string;
  date: string;
  time: string;
  slot: string;
  partySize: number;
  status: string;
  source: string;
  notes: string | null;
  depositAmountPence: number;
  depositStatus: string;
  addOns: { name: string; pricePence: number }[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700",
  modified: "bg-gold-100 text-gold-700",
  pending_payment: "bg-amber-50 text-amber-800",
  cancelled: "bg-red-50 text-red-700",
  no_show: "bg-red-50 text-red-700",
  completed: "bg-stone-100 text-stone-500",
};

const STATUS_OPTIONS = [
  "confirmed",
  "modified",
  "pending_payment",
  "cancelled",
  "no_show",
  "completed",
];

// Upcoming / Today / Past tag based on the booking date vs UK today
function dayTag(date: string): { label: string; cls: string } {
  const ukToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  if (date > ukToday) return { label: "Upcoming", cls: "bg-emerald-50 text-emerald-700" };
  if (date === ukToday) return { label: "Today", cls: "bg-gold-100 text-gold-700" };
  return { label: "Past", cls: "bg-stone-100 text-stone-500" };
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [filterDate, setFilterDate] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Expanded row for detail view
  const [expanded, setExpanded] = useState<string | null>(null);

  // Status update
  const [updating, setUpdating] = useState<string | null>(null);

  // "Email past guests" composer. Only people whose booking date has passed.
  type MailTemplate = { key: string; name: string; subject: string; body: string };
  const [mailOpen, setMailOpen] = useState(false);
  const [mailLocation, setMailLocation] = useState("");
  const [mailCount, setMailCount] = useState<number | null>(null);
  const [mailSubject, setMailSubject] = useState("");
  const [mailMessage, setMailMessage] = useState("");
  const [mailing, setMailing] = useState(false);
  const [mailNote, setMailNote] = useState("");
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>([]);

  const fetchMailTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/mailing/templates?scope=bookings");
    if (!res.ok) return;
    const data = await res.json();
    setMailTemplates(data.templates || []);
  }, []);

  useEffect(() => {
    if (!mailOpen) return;
    setMailCount(null);
    const q = mailLocation ? `?location=${mailLocation}` : "";
    fetch(`/api/admin/bookings/mail${q}`)
      .then((r) => r.json())
      .then((d) => setMailCount(typeof d.total === "number" ? d.total : 0))
      .catch(() => setMailCount(0));
  }, [mailOpen, mailLocation]);

  useEffect(() => {
    if (mailOpen) fetchMailTemplates();
  }, [mailOpen, fetchMailTemplates]);

  async function saveMailTemplate() {
    const name = window.prompt("Save this email as:", "")?.trim();
    if (!name) return;
    const res = await fetch("/api/admin/mailing/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject: mailSubject, body: mailMessage, scope: "bookings" }),
    });
    if (!res.ok) { setMailNote("Could not save that one."); return; }
    await fetchMailTemplates();
    setMailNote(`Saved as "${name}".`);
  }

  async function sendMailPast() {
    if (!mailSubject.trim() || !mailMessage.trim()) { setMailNote("Add a subject and a message first."); return; }
    const where = mailLocation === "cricklewood" ? " from Cricklewood" : mailLocation === "streatham" ? " from Streatham Hill" : "";
    if (!confirm(`Email all ${mailCount ?? 0} past guests${where}? Each person gets one email.`)) return;
    setMailing(true);
    setMailNote("");
    let sent = 0, failed = 0, offset: number | null = 0;
    try {
      // The server sends 25 at a time; keep asking until it says we're done.
      while (offset !== null) {
        const res: Response = await fetch("/api/admin/bookings/mail", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: mailLocation || undefined, offset, subject: mailSubject, message: mailMessage }),
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

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDate) params.set("date", filterDate);
    else if (view === "past") params.set("past", "true");
    if (filterLocation) params.set("location", filterLocation);
    if (filterStatus) params.set("status", filterStatus);
    params.set("page", String(page));

    const res = await fetch(`/api/admin/bookings?${params}`);
    const data = await res.json();
    setBookings(data.bookings || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [filterDate, filterLocation, filterStatus, view, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  async function updateStatus(bookingId: string, newStatus: string) {
    setUpdating(bookingId);
    await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdating(null);
    fetchBookings();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">{total} total</span>
          <button
            onClick={() => { setMailOpen((v) => !v); setMailNote(""); }}
            className="px-3 py-2 text-xs text-gold-700 border border-gold-400 rounded-xl hover:bg-gold-100 transition"
          >
            ✉ Email past guests
          </button>
        </div>
      </div>

      {mailOpen && (
        <div className="bg-white border border-stone-100 rounded-2xl p-5 mb-6">
          <div className="inline-flex gap-1 p-1 bg-stone-50 rounded-xl mb-4">
            {([["", "All locations"], ["cricklewood", "Cricklewood"], ["streatham", "Streatham Hill"]] as const).map(([slug, label]) => (
              <button
                key={slug || "all"}
                onClick={() => setMailLocation(slug)}
                className={`px-3 py-1.5 text-xs rounded-lg transition ${mailLocation === slug ? "bg-gold-300 text-black font-semibold" : "text-stone-500 hover:text-stone-900"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-stone-900 font-semibold mb-1">Email everyone who has dined with us</p>
          <p className="text-xs text-stone-500 mb-4">
            Goes to {mailCount ?? "…"} {mailCount === 1 ? "person" : "people"} whose booking date has already passed, one email each even if they came more than once. Upcoming bookings, cancellations and no-shows are left out. Sent from your normal bookings address.
          </p>
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
            placeholder="Your message. Line breaks are kept. Each guest is greeted by their first name automatically."
            className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm placeholder-stone-400 focus:outline-none focus:border-gold-400 resize-y"
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={sendMailPast} disabled={mailing || !mailCount} className="px-4 py-2 text-sm bg-gold-300 text-black font-semibold rounded-lg hover:bg-gold-400 transition disabled:opacity-50">
              {mailing ? "Sending…" : `Send to ${mailCount ?? "…"}`}
            </button>
            <button onClick={() => { setMailOpen(false); setMailNote(""); }} className="text-sm text-stone-500 hover:text-stone-900">Cancel</button>
            {mailNote && <span className="text-xs text-stone-500">{mailNote}</span>}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Upcoming / Past toggle (only when no specific date is picked) */}
        <div className="inline-flex rounded-lg border border-stone-200 overflow-hidden">
          {(["upcoming", "past"] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setPage(1); }}
              className={`px-3 py-2 text-sm capitalize transition ${view === v && !filterDate ? "bg-gold-300 text-ink-900 font-semibold" : "bg-white text-stone-500 hover:text-stone-900"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => {
            setFilterDate(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-gold-400 [color-scheme:light]"
        />
        <select
          value={filterLocation}
          onChange={(e) => {
            setFilterLocation(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-gold-400"
        >
          <option value="">All Locations</option>
          <option value="cricklewood">Cricklewood</option>
          <option value="streatham">Streatham Hill</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-gold-400"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        {(filterDate || filterLocation || filterStatus) && (
          <button
            onClick={() => {
              setFilterDate("");
              setFilterLocation("");
              setFilterStatus("");
              setPage(1);
            }}
            className="px-3 py-2 text-sm text-stone-500 hover:text-stone-900 transition"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-stone-500">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-stone-500">No bookings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-stone-500 border-b border-stone-100">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <>
                    <tr
                      key={b.id}
                      className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer"
                      onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gold-700">
                        {b.confirmationCode}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-stone-900">{b.guest.name}</p>
                        <p className="text-xs text-stone-500">{b.guest.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700">
                        <p>{b.date}</p>
                        {(() => {
                          const t = dayTag(b.date);
                          return <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${t.cls}`}>{t.label}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700">{b.slot}</td>
                      <td className="px-4 py-3 text-sm text-stone-500">{b.location}</td>
                      <td className="px-4 py-3 text-sm text-stone-900">{b.partySize}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[b.status] || "bg-stone-100 text-stone-700"
                          }`}
                        >
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value=""
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.value) updateStatus(b.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={updating === b.id}
                          className="px-2 py-1 bg-stone-50 border border-stone-200 rounded text-xs text-stone-900 focus:outline-none"
                        >
                          <option value="">Update...</option>
                          {STATUS_OPTIONS.filter((s) => s !== b.status).map((s) => (
                            <option key={s} value={s}>
                              → {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {expanded === b.id && (
                      <tr key={`${b.id}-detail`} className="bg-stone-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-stone-500 block text-xs">Phone</span>
                              <span className="text-stone-900">{b.guest.phone || "—"}</span>
                            </div>
                            <div>
                              <span className="text-stone-500 block text-xs">Source</span>
                              <span className="text-stone-900">{b.source}</span>
                            </div>
                            <div>
                              <span className="text-stone-500 block text-xs">Deposit</span>
                              <span className="text-stone-900">
                                {b.depositAmountPence > 0
                                  ? `£${(b.depositAmountPence / 100).toFixed(2)} (${b.depositStatus})`
                                  : "None"}
                              </span>
                            </div>
                            <div>
                              <span className="text-stone-500 block text-xs">Booked</span>
                              <span className="text-stone-900">
                                {new Date(b.createdAt).toLocaleDateString("en-GB")}
                              </span>
                            </div>
                            {b.notes && (
                              <div className="col-span-2 md:col-span-4">
                                <span className="text-stone-500 block text-xs">Notes</span>
                                <span className="text-stone-900">{b.notes}</span>
                              </div>
                            )}
                            {b.addOns.length > 0 && (
                              <div className="col-span-2 md:col-span-4">
                                <span className="text-stone-500 block text-xs">Add-ons</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {b.addOns.map((a, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 bg-gold-100 text-gold-700 rounded-full text-xs"
                                    >
                                      {a.name} (£{(a.pricePence / 100).toFixed(2)})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-30 transition"
            >
              ← Previous
            </button>
            <span className="text-sm text-stone-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-30 transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
