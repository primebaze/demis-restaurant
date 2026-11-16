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
    if (!confirm(`Clear ALL feast check-ins for ${date}? This cannot be undone.`)) return;
    await fetch("/api/admin/brunch-checkins", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }),
    });
    fetchData();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-stone-500 mt-0.5">Door check-ins for the Sunday Feast.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-stone-700"
          />
          <button onClick={() => setDate(ukToday())} className="px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-stone-700 hover:text-stone-900">Today</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 max-w-2xl">
        <div className="rounded-xl p-4 border bg-white border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">People in</p>
          <p className="text-2xl font-bold text-gold-700">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-xl p-4 border bg-white border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Groups</p>
          <p className="text-2xl font-bold text-stone-900">{data?.groups ?? 0}</p>
        </div>
        <div className="rounded-xl p-4 border bg-white border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Takings</p>
          <p className="text-2xl font-bold text-emerald-700">£{data?.takings ?? 0}</p>
        </div>
        <div className="rounded-xl p-4 border bg-white border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Per person</p>
          <p className="text-2xl font-bold text-stone-900">£{data?.pricePerHead ?? 0}</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={resetDay} className="px-3 py-2 text-xs text-red-700 border border-red-200 rounded-xl hover:bg-red-50 transition">Clear all for this day</button>
      </div>

      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-stone-500">Loading…</p>
        ) : !data || data.checkins.length === 0 ? (
          <p className="p-8 text-center text-stone-500">No check-ins for this day yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-stone-500 border-b border-stone-100">
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
                    <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-3 text-sm font-semibold text-stone-900 tabular-nums">
                        {c.number}{c.partySize > 1 ? `–${c.endCover}` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-gold-700 font-semibold">{c.partySize}</td>
                      <td className="px-4 py-3 text-xs text-stone-500">
                        {/* Old brunch check-ins split food / drinks; feast check-ins are one price. */}
                        {c.withDrinks > 0
                          ? <span>{c.foodOnly} food · <span className="text-gold-700">{c.withDrinks} drinks</span></span>
                          : <span>Sunday Feast</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-emerald-700 font-semibold">£{c.price}</td>
                      <td className="px-4 py-3 text-xs text-stone-500 tabular-nums">{fmt(c.checkedInAt)}</td>
                      <td className="px-4 py-3 text-xs text-stone-500 tabular-nums">{fmt(c.endsAt)}</td>
                      <td className={`px-4 py-3 text-xs font-medium ${left === "over" ? "text-red-700" : "text-stone-700"}`}>{left}</td>
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
