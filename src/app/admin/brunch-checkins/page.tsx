"use client";

import { useEffect, useState, useCallback } from "react";

type CheckIn = {
  id: string;
  number: number;
  endCover: number;
  name: string;
  partySize: number;
  foodOnly: number;
  withDrinks: number;
  price: number;
  checkedInAt: string;
  endsAt: string;
  status: string;
};

type Data = { date: string; total: number; groups: number; takings: number; drinkers: number; pricePerHead: number; checkins: CheckIn[] };

function fmt(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** UK service date (matches how check-ins are stored server-side) */
function ukToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

function remaining(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "over";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export default function AdminBrunchCheckinsPage() {
  const [date, setDate] = useState(() => ukToday());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/brunch-checkins?date=${date}`);
    setData(await res.json());
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function resetDay() {
    if (!confirm(`Clear ALL brunch check-ins for ${date}? This cannot be undone.`)) return;
    await fetch("/api/admin/brunch-checkins", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }),
    });
    fetchData();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Brunch Check-ins</h1>
          <p className="text-sm text-gray-500 mt-0.5">Door check-ins for the Saturday brunch.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300"
          />
          <button onClick={() => setDate(ukToday())} className="px-3 py-2 text-sm bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:text-white">Today</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 max-w-2xl">
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">People in</p>
          <p className="text-2xl font-bold text-gold-300">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Groups</p>
          <p className="text-2xl font-bold text-white">{data?.groups ?? 0}</p>
        </div>
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Takings</p>
          <p className="text-2xl font-bold text-emerald-300">£{data?.takings ?? 0}</p>
        </div>
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">On drinks</p>
          <p className="text-2xl font-bold text-white">{data?.drinkers ?? 0}</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={resetDay} className="px-3 py-2 text-xs text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition">Clear all for this day</button>
      </div>

      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Loading…</p>
        ) : !data || data.checkins.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No check-ins for this day yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-3">No.</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Mix</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">In</th>
                  <th className="px-4 py-3">Finish by</th>
                  <th className="px-4 py-3">Left</th>
                </tr>
              </thead>
              <tbody>
                {data.checkins.map((c) => {
                  const left = remaining(c.endsAt, now);
                  return (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm font-semibold text-white tabular-nums">
                        {c.number}{c.partySize > 1 ? `–${c.endCover}` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-gold-300 font-semibold">{c.partySize}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {c.foodOnly > 0 && <span>{c.foodOnly} food</span>}
                        {c.foodOnly > 0 && c.withDrinks > 0 && <span className="text-gray-600"> · </span>}
                        {c.withDrinks > 0 && <span className="text-gold-300/80">{c.withDrinks} drinks</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-emerald-300 font-semibold">£{c.price}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{fmt(c.checkedInAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{fmt(c.endsAt)}</td>
                      <td className={`px-4 py-3 text-xs font-medium ${left === "over" ? "text-red-400" : "text-gray-300"}`}>{left}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
