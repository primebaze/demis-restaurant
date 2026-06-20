"use client";

import { useEffect, useState, useCallback } from "react";

type CheckIn = {
  id: string;
  number: number;
  name: string;
  partySize: number;
  priceTier: number;
  checkedInAt: string;
  endsAt: string;
  status: string;
};

const TIER_COLORS: Record<number, string> = {
  20: "bg-emerald-500/15 text-emerald-300",
  25: "bg-amber-500/15 text-amber-300",
  30: "bg-red-500/15 text-red-300",
};

function fmt(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function remaining(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "over";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export default function AdminCheckinsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<{ total: number; tiers: { t20: number; t25: number; t30: number }; checkins: CheckIn[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  // PIN management
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/checkins?date=${date}`);
    setData(await res.json());
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    fetch("/api/admin/checkin-pin").then((r) => r.json()).then((d) => setPinConfigured(!!d.configured));
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function resetDay() {
    if (!confirm(`Clear all check-ins for ${date}? Numbering starts again at 1.`)) return;
    await fetch("/api/checkin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    fetchData();
  }

  async function savePin() {
    setPinMsg("");
    const res = await fetch("/api/admin/checkin-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: newPin }),
    });
    const d = await res.json();
    if (!res.ok) setPinMsg(d.error || "Failed");
    else { setPinMsg("PIN saved"); setNewPin(""); setPinConfigured(true); }
  }

  const isToday = date === new Date().toISOString().split("T")[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Buffet Check-ins</h1>
          <p className="text-sm text-gray-500 mt-0.5">Door kiosk at <span className="text-gold-300">/checkin</span></p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm [color-scheme:dark] focus:outline-none focus:border-gold-400"
          />
          <button
            onClick={resetDay}
            className="px-3 py-2 text-sm bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition"
          >
            Reset day
          </button>
        </div>
      </div>

      {/* PIN management */}
      <div className="mb-6 p-4 bg-[#141414] border border-gray-800 rounded-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Kiosk PIN</p>
            <p className="text-xs text-gray-500">
              {pinConfigured === null ? "…" : pinConfigured ? "A PIN is set. Enter a new one to rotate it." : "No PIN set yet — set one to enable the kiosk."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4–8 digits"
              className="w-32 px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
            />
            <button onClick={savePin} disabled={!newPin} className="px-4 py-2 bg-gold-300 text-[#1a1a1a] rounded-lg text-sm font-semibold hover:bg-gold-200 transition disabled:opacity-50">
              Save
            </button>
            {pinMsg && <span className="text-xs text-gray-400">{pinMsg}</span>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 border bg-gold-300/5 border-gold-300/20">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Checked in {isToday ? "today" : ""}</p>
          <p className="text-2xl font-bold text-gold-300">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800"><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">£20 (1–20)</p><p className="text-2xl font-bold text-emerald-300">{data?.tiers.t20 ?? 0}</p></div>
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800"><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">£25 (21–45)</p><p className="text-2xl font-bold text-amber-300">{data?.tiers.t25 ?? 0}</p></div>
        <div className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800"><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">£30 (46+)</p><p className="text-2xl font-bold text-red-300">{data?.tiers.t30 ?? 0}</p></div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : !data || data.checkins.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No check-ins for this day</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-3">No.</th>
                  <th className="px-4 py-3">Name</th>
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
                      <td className="px-4 py-3 text-sm font-bold text-white">{c.number}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{c.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[c.priceTier] || "bg-gray-700 text-gray-300"}`}>£{c.priceTier}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{fmt(c.checkedInAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{fmt(c.endsAt)}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${left === "over" ? "text-red-400" : "text-emerald-400"}`}>{left}</td>
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
