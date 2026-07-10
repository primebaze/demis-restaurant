"use client";

import { useEffect, useState, useCallback } from "react";

type Booking = {
  id: string;
  number: number;
  endCover: number;
  partySize: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  total: number;
  createdAt: string;
};

type Summary = { parties: number; covers: number; revenue: number; tier20: number; tier25: number; tier30: number; cancelled: number };

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-gold-300/15 text-gold-300",
  arrived: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
};

// Shift a YYYY-MM-DD Sunday by whole weeks (timezone-safe).
function shiftWeeks(iso: string, weeks: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + weeks * 7);
  return dt.toISOString().slice(0, 10);
}

export default function AdminSundayBuffetPage() {
  const [date, setDate] = useState("");
  const [resolvedDate, setResolvedDate] = useState("");
  const [prettyDate, setPrettyDate] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<Summary>({ parties: 0, covers: 0, revenue: 0, tier20: 0, tier25: 0, tier30: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/sunday-buffet${date ? `?date=${date}` : ""}`);
    const d = await res.json();
    setBookings(d.bookings || []);
    setSummary(d.summary || { parties: 0, covers: 0, revenue: 0, tier20: 0, tier25: 0, tier30: 0, cancelled: 0 });
    setResolvedDate(d.date || "");
    setPrettyDate(d.prettyDate || "");
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/sunday-buffet/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  }

  async function remove(id: string) {
    if (!confirm("Delete this booking?")) return;
    await fetch(`/api/admin/sunday-buffet/${id}`, { method: "DELETE" });
    fetchData();
  }

  const [adjustN, setAdjustN] = useState(1);

  async function adjust() {
    await fetch("/api/admin/sunday-buffet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust", date: resolvedDate, covers: adjustN }),
    });
    fetchData();
  }

  async function resetDay() {
    if (!confirm(`Reset ${prettyDate}? This deletes ALL bookings for that Sunday and restarts the count at No. 1. This cannot be undone.`)) return;
    await fetch("/api/admin/sunday-buffet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", date: resolvedDate }),
    });
    fetchData();
  }

  const stats = [
    { label: "Parties", value: summary.parties },
    { label: "People", value: summary.covers },
    { label: "Est. revenue", value: `£${summary.revenue}` },
    { label: "£20 / £25 / £30", value: `${summary.tier20} / ${summary.tier25} / ${summary.tier30}` },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sunday Buffet</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pre-bookings for {prettyDate || "…"}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(shiftWeeks(resolvedDate, -1))} disabled={!resolvedDate} className="px-3 py-2 text-sm bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:text-white disabled:opacity-40">← Prev</button>
          <button onClick={() => setDate("")} className="px-3 py-2 text-sm bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:text-white">This Sunday</button>
          <button onClick={() => setDate(shiftWeeks(resolvedDate, 1))} disabled={!resolvedDate} className="px-3 py-2 text-sm bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:text-white disabled:opacity-40">Next →</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 truncate">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Count controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-gray-800 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-500">Add walk-ins:</span>
          <button onClick={() => setAdjustN((n) => Math.max(1, n - 1))} className="w-7 h-7 rounded-full border border-gray-700 text-white leading-none hover:bg-white/5">−</button>
          <span className="w-6 text-center text-white text-sm font-semibold tabular-nums">{adjustN}</span>
          <button onClick={() => setAdjustN((n) => n + 1)} className="w-7 h-7 rounded-full border border-gray-700 text-white leading-none hover:bg-white/5">+</button>
          <button onClick={adjust} className="ml-1 px-3 py-1.5 text-xs bg-gold-300 text-black font-semibold rounded-lg hover:bg-gold-400 transition">Add</button>
        </div>
        <p className="text-xs text-gray-500">Bumps the count so the next number goes up (accounts for people who didn&apos;t pre-book).</p>
        <div className="flex-1" />
        <button onClick={resetDay} className="px-3 py-2 text-xs text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition">
          Reset day
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No bookings for this Sunday yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-3">No.</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className={`border-b border-gray-800/50 hover:bg-white/[0.02] ${b.status === "cancelled" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-sm font-bold text-gold-300">
                      {b.partySize === 1 ? b.number : `${b.number}–${b.endCover}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{b.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{b.partySize}</td>
                    <td className="px-4 py-3 text-sm text-white">£{b.total}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {b.email || "—"}{b.phone ? <><br />{b.phone}</> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || "bg-gray-700 text-gray-300"}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        {b.status !== "arrived" && (
                          <button onClick={() => setStatus(b.id, "arrived")} className="text-emerald-400 hover:text-emerald-300">Arrived</button>
                        )}
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
