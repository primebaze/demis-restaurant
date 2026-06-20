"use client";

import { useEffect, useState } from "react";

interface TodayBooking {
  id: string;
  confirmationCode: string;
  guest: string;
  phone: string;
  email: string;
  location: string;
  time: string;
  slot: string;
  partySize: number;
  status: string;
  type: string;
}

const TYPE_COLORS: Record<string, string> = {
  Website: "bg-blue-500/15 text-blue-300",
  "Set Menu": "bg-purple-500/15 text-purple-300",
  Buffet: "bg-orange-500/15 text-orange-300",
};

interface DashboardData {
  today: {
    date: string;
    isToday: boolean;
    bookings: TodayBooking[];
    totalCovers: number;
    totalBookings: number;
  };
  stats: {
    todayBookings: number;
    todayCovers: number;
    totalBookings30d: number;
    confirmedBookings30d: number;
    noShows30d: number;
    noShowRate: string;
    totalCovers30d: number;
    depositsCapturedPence: number;
    upcomingNext7Days: number;
    totalGuests: number;
  };
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().split("T")[0];
}

function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-500/20 text-emerald-400",
  modified: "bg-blue-500/20 text-blue-400",
  pending_payment: "bg-amber-500/20 text-amber-400",
  cancelled: "bg-red-500/20 text-red-400",
  no_show: "bg-red-600/20 text-red-500",
  completed: "bg-gray-500/20 text-gray-400",
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  // null = today; otherwise a YYYY-MM-DD string for the day being viewed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayLoading, setDayLoading] = useState(false);

  // In-app email composer (dashboard contact icon)
  const [email, setEmail] = useState<{
    to: string;
    name: string;
    subject: string;
    message: string;
    provider: "smtp" | "resend";
    sending: boolean;
    error: string;
    success: string;
  } | null>(null);

  function openEmail(to: string, name: string) {
    setEmail({ to, name, subject: "", message: "", provider: "smtp", sending: false, error: "", success: "" });
  }

  async function sendDashboardEmail() {
    if (!email) return;
    if (!email.subject.trim()) { setEmail((e) => e && { ...e, error: "Subject is required" }); return; }
    if (!email.message.trim()) { setEmail((e) => e && { ...e, error: "Message is required" }); return; }
    setEmail((e) => e && { ...e, sending: true, error: "" });
    try {
      const res = await fetch("/api/admin/email/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.to, subject: email.subject, message: email.message, provider: email.provider }),
      });
      const d = await res.json();
      if (!res.ok || d.failed) {
        setEmail((e) => e && { ...e, sending: false, error: d.error || "Failed to send" });
      } else {
        setEmail((e) => e && { ...e, sending: false, success: "Email sent" });
        setTimeout(() => setEmail(null), 1800);
      }
    } catch {
      setEmail((e) => e && { ...e, sending: false, error: "Failed to send" });
    }
  }

  useEffect(() => {
    const url = selectedDate ? `/api/admin/dashboard?date=${selectedDate}` : "/api/admin/dashboard";
    setDayLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .finally(() => {
        setLoading(false);
        setDayLoading(false);
      });
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    { label: "Today's Bookings", value: data.stats.todayBookings, accent: true },
    { label: "Today's Covers", value: data.stats.todayCovers, accent: true },
    { label: "Next 7 Days", value: data.stats.upcomingNext7Days },
    { label: "30d Bookings", value: data.stats.totalBookings30d },
    { label: "30d Covers", value: data.stats.totalCovers30d },
    { label: "No-Show Rate", value: data.stats.noShowRate },
    { label: "Total Guests", value: data.stats.totalGuests },
    {
      label: "Deposits Captured",
      value: `£${(data.stats.depositsCapturedPence / 100).toFixed(2)}`,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl p-4 border ${
              s.accent
                ? "bg-gold-300/5 border-gold-300/20"
                : "bg-[#1a1a1a] border-gray-800"
            }`}
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 truncate">
              {s.label}
            </p>
            <p className={`text-2xl font-bold ${s.accent ? "text-gold-300" : "text-white"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Day bookings table */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {data.today.isToday ? "Today's Bookings" : formatDayLabel(data.today.date)}
            </h2>
            {data.today.isToday ? (
              <span className="text-xs text-gray-500 hidden sm:inline">{formatDayLabel(data.today.date)}</span>
            ) : (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs px-2.5 py-1 rounded-lg bg-gold-300/10 text-gold-300 hover:bg-gold-300/20 transition shrink-0"
              >
                Today
              </button>
            )}
            {dayLoading && <span className="text-xs text-gray-600 shrink-0">…</span>}
            <span className="text-xs text-gray-500 shrink-0 hidden md:inline">
              {data.today.totalBookings} booking{data.today.totalBookings === 1 ? "" : "s"} &middot; {data.today.totalCovers} covers
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setSelectedDate(addDays(data.today.date, -1))}
              title="Previous day"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#0f0f0f] border border-gray-700 text-gray-300 hover:border-gold-400 hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedDate(addDays(data.today.date, 1))}
              title="Next day"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#0f0f0f] border border-gray-700 text-gray-300 hover:border-gold-400 hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {data.today.bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No bookings for this day
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Guest</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Party</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Contact</th>
                </tr>
              </thead>
              <tbody>
                {data.today.bookings.map((b) => (
                  <tr key={b.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-sm font-mono text-gold-300">
                      {b.confirmationCode}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[b.type] || "bg-gray-700 text-gray-300"}`}>
                        {b.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">{b.guest}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{b.location}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{b.slot}</td>
                    <td className="px-6 py-4 text-sm text-white">{b.partySize}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[b.status] || "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {b.phone ? (
                          <a
                            href={`tel:${b.phone.replace(/\s+/g, "")}`}
                            title={`Call ${b.phone}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800/50 text-gray-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </span>
                        )}
                        {b.email ? (
                          <button
                            onClick={() => openEmail(b.email, b.guest)}
                            title={`Email ${b.email}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gold-300/10 text-gold-300 hover:bg-gold-300/20 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800/50 text-gray-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* In-app email composer */}
      {email && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEmail(null)}>
          <div className="w-full max-w-lg bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-1">Email guest</h2>
            <p className="text-xs text-gray-500 mb-4">To: {email.name} &lt;{email.to}&gt;</p>

            <div className="space-y-3">
              <input
                type="text"
                value={email.subject}
                onChange={(e) => setEmail((s) => s && { ...s, subject: e.target.value })}
                placeholder="Subject"
                className="w-full px-3 py-2.5 bg-[#0f0f0f] border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold-400"
                autoFocus
              />
              <textarea
                value={email.message}
                onChange={(e) => setEmail((s) => s && { ...s, message: e.target.value })}
                rows={6}
                placeholder="Write your message…"
                className="w-full px-3 py-2.5 bg-[#0f0f0f] border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEmail((s) => s && { ...s, provider: "smtp" })}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm border transition ${email.provider === "smtp" ? "bg-gold-300/15 border-gold-300/40 text-gold-300" : "bg-[#0f0f0f] border-gray-700 text-gray-400 hover:text-white"}`}
                >
                  SMTP
                </button>
                <button
                  type="button"
                  onClick={() => setEmail((s) => s && { ...s, provider: "resend" })}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm border transition ${email.provider === "resend" ? "bg-gold-300/15 border-gold-300/40 text-gold-300" : "bg-[#0f0f0f] border-gray-700 text-gray-400 hover:text-white"}`}
                >
                  Resend
                </button>
              </div>
            </div>

            {email.error && <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{email.error}</p>}
            {email.success && <p className="mt-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{email.success}</p>}

            <div className="flex gap-3 mt-4">
              <button
                onClick={sendDashboardEmail}
                disabled={email.sending}
                className="px-5 py-2 bg-gold-300 text-[#1a1a1a] rounded-xl text-sm font-semibold hover:bg-gold-200 transition disabled:opacity-50"
              >
                {email.sending ? "Sending…" : "Send"}
              </button>
              <button onClick={() => setEmail(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
