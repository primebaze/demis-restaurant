"use client";

import { useEffect, useState, useCallback } from "react";

type Booking = { id: string; name: string; email: string; phone: string; status: string; createdAt: string };
type Summary = { reservations: number; cancelled: number };

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
  const [summary, setSummary] = useState<Summary>({ reservations: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/sunday-buffet${date ? `?date=${date}` : ""}`);
    const d = await res.json();
    setBookings(d.bookings || []);
    setSummary(d.summary || { reservations: 0, cancelled: 0 });
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

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reservations</p>
          <p className="text-2xl font-bold text-white">{summary.reservations}</p>
        </div>
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-white">{summary.cancelled}</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={resetDay} className="px-3 py-2 text-xs text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition">Clear all for this Sunday</button>
      </div>

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
                    <td className="px-4 py-3 text-xs text-gray-400">{b.email || "—"}{b.phone ? <><br />{b.phone}</> : null}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmt(b.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || "bg-gray-700 text-gray-300"}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
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
