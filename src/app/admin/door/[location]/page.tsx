"use client";

import { useEffect, useState, useCallback } from "react";

type Visit = {
  id: string; seq: number; label: string; hasDetails: boolean;
  name: string; phone: string; email: string;
  visitType: string; partySize: number; isBooking: boolean;
  checkedInAt: string; checkedOutAt: string | null;
  amountPence: number | null; status: string;
};

type Totals = {
  diningCovers: number; diningParties: number; takeaway: number; stillIn: number;
  takingsPence: number; diningTakingsPence: number; takeawayTakingsPence: number;
  billsEntered: number; visits: number;
};

const EMPTY: Totals = {
  diningCovers: 0, diningParties: 0, takeaway: 0, stillIn: 0,
  takingsPence: 0, diningTakingsPence: 0, takeawayTakingsPence: 0, billsEntered: 0, visits: 0,
};

const money = (p: number) => `£${(p / 100).toFixed(2)}`;
const clock = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** UK service date, matching how visits are stored server-side. */
const ukToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

/** Time in the building, counting up from arrival. */
function elapsed(from: string, to: string | null, now: number): string {
  const ms = (to ? new Date(to).getTime() : now) - new Date(from).getTime();
  const m = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

export default function DoorPage({ params }: { params: { location: string } }) {
  const { location } = params;

  const [date, setDate] = useState(() => ukToday());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [totals, setTotals] = useState<Totals>(EMPTY);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  // Check-in form
  const [visitType, setVisitType] = useState<"dining" | "takeaway">("dining");
  const [partySize, setPartySize] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  // Per-row bill entry
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState("");

  const isToday = date === ukToday();

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/door?location=${location}&date=${date}`);
    const d = await res.json();
    setVisits(d.visits || []);
    setTotals(d.totals || EMPTY);
    setLocationName(d.locationName || "");
    setLoading(false);
  }, [location, date]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  // Keep the board fresh if another device is checking people in.
  useEffect(() => {
    if (!isToday) return;
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load, isToday]);

  async function checkIn() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/door", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, visitType, partySize, name, phone, email, isBooking }),
      });
      const d = await res.json();
      if (!res.ok) { setFlash(d.error || "Could not check in"); return; }
      setFlash(`${d.label} checked in${d.visitType === "dining" && d.partySize > 1 ? ` · table of ${d.partySize}` : ""}`);
      setName(""); setPhone(""); setEmail(""); setPartySize(1); setIsBooking(false);
      if (date !== ukToday()) setDate(ukToday());
      load();
      setTimeout(() => setFlash(""), 4000);
    } finally { setBusy(false); }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setRowBusy(id);
    try {
      await fetch(`/api/admin/door/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      await load();
    } finally { setRowBusy(""); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this check-in?")) return;
    setRowBusy(id);
    try {
      await fetch(`/api/admin/door/${id}`, { method: "DELETE" });
      await load();
    } finally { setRowBusy(""); }
  }

  const pill = (on: boolean, tone: "gold" | "green") =>
    on
      ? tone === "gold"
        ? "bg-gold-300 text-black border-gold-300"
        : "bg-emerald-400 text-black border-emerald-400"
      : "bg-transparent text-gray-300 border-gray-700 hover:border-gray-500";

  const input =
    "w-full px-3.5 py-3 bg-black/40 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gold-300/60 transition";

  return (
    <div className="pb-28">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{locationName || "…"}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Door check-in · track who walks in, dining or takeaway.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300" />
          <button onClick={() => setDate(ukToday())}
            className={`px-3 py-2 text-sm rounded-lg border transition ${isToday ? "bg-gold-300/10 border-gold-300/40 text-gold-300" : "bg-[#1a1a1a] border-gray-700 text-gray-300 hover:text-white"}`}>
            Today
          </button>
        </div>
      </div>

      {/* ── Check in ── */}
      {isToday && (
        <div className="bg-gradient-to-b from-[#1e1e1e] to-[#171717] border border-gray-800 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button onClick={() => { setVisitType("dining"); }}
              className={`py-5 rounded-2xl border-2 text-base font-bold transition ${pill(visitType === "dining", "gold")}`}>
              Dining in
            </button>
            <button onClick={() => { setVisitType("takeaway"); setPartySize(1); setIsBooking(false); }}
              className={`py-5 rounded-2xl border-2 text-base font-bold transition ${pill(visitType === "takeaway", "green")}`}>
              Takeaway
            </button>
          </div>

          {visitType === "dining" && (
            <div className="flex items-center justify-between px-4 py-3 bg-black/30 border border-gray-800 rounded-xl mb-3">
              <span className="text-sm text-gray-400">How many at the table?</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                  className="w-11 h-11 rounded-full border border-gray-700 text-white text-xl leading-none hover:bg-white/5 active:scale-95 transition">−</button>
                <span className="w-8 text-center text-2xl font-bold text-white tabular-nums">{partySize}</span>
                <button onClick={() => setPartySize((p) => Math.min(30, p + 1))}
                  className="w-11 h-11 rounded-full border border-gray-700 text-white text-xl leading-none hover:bg-white/5 active:scale-95 transition">+</button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={input} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" inputMode="tel" className={input} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" inputMode="email" className={input} />
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {visitType === "dining" && (
              <button onClick={() => setIsBooking((b) => !b)}
                className={`px-3.5 py-2 text-xs rounded-lg border transition ${isBooking ? "bg-gold-300/15 border-gold-300/40 text-gold-300" : "border-gray-700 text-gray-400 hover:text-white"}`}>
                {isBooking ? "✓ Has a booking" : "Has a booking?"}
              </button>
            )}
            {flash && <span className="text-xs text-emerald-400">{flash}</span>}
            <button onClick={checkIn} disabled={busy}
              className="ml-auto px-8 py-3.5 bg-gold-300 text-black font-bold rounded-xl hover:bg-gold-200 active:scale-[0.99] transition disabled:opacity-50">
              {busy ? "…" : "Check in"}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-gray-600">Leave the details blank and they&apos;ll be logged as Customer {totals.visits + 1}.</p>
        </div>
      )}

      {/* ── Visits ── */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-10 text-center text-gray-500">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="p-10 text-center text-gray-500">No one checked in {isToday ? "yet today" : "on this day"}.</p>
        ) : (
          <div className="divide-y divide-gray-800/70">
            {visits.map((v) => {
              const open = v.status === "active";
              const dining = v.visitType === "dining";
              return (
                <div key={v.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 ${open ? "" : "bg-black/20"}`}>
                  {/* number + name */}
                  <div className="min-w-[190px] flex items-center gap-3">
                    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold tabular-nums ${dining ? "bg-gold-300/15 text-gold-300" : "bg-emerald-400/15 text-emerald-400"}`}>
                      {v.seq}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${v.hasDetails ? "text-white" : "text-gray-400 italic"}`}>{v.label}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {dining ? `Dining · ${v.partySize}` : "Takeaway"}
                        {v.isBooking && <span className="text-gold-300"> · booked</span>}
                        {v.phone && ` · ${v.phone}`}
                      </p>
                    </div>
                  </div>

                  {/* times */}
                  <div className="text-[11px] text-gray-500 tabular-nums min-w-[110px]">
                    In {clock(v.checkedInAt)}
                    {v.checkedOutAt && <> · out {clock(v.checkedOutAt)}</>}
                  </div>

                  {/* live timer */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums ${open ? "bg-white/[0.06] text-gray-200" : "bg-transparent text-gray-600"}`}>
                    {elapsed(v.checkedInAt, v.checkedOutAt, now)}
                  </span>

                  {/* bill + actions */}
                  <div className="ml-auto flex items-center gap-2">
                    {v.amountPence != null && !open ? (
                      <span className="text-sm font-bold text-emerald-300 tabular-nums">{money(v.amountPence)}</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600 text-sm">£</span>
                        <input
                          value={amounts[v.id] ?? (v.amountPence != null ? (v.amountPence / 100).toFixed(2) : "")}
                          onChange={(e) => setAmounts((a) => ({ ...a, [v.id]: e.target.value }))}
                          placeholder="0.00" inputMode="decimal"
                          className="w-20 px-2 py-1.5 bg-black/40 border border-gray-700 rounded-lg text-white text-sm text-right tabular-nums focus:outline-none focus:border-gold-300/60"
                        />
                      </div>
                    )}

                    {open ? (
                      <button
                        onClick={() => patch(v.id, { action: "checkout", amount: amounts[v.id] ?? "" })}
                        disabled={rowBusy === v.id}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition disabled:opacity-40"
                      >
                        {rowBusy === v.id ? "…" : "Check out"}
                      </button>
                    ) : (
                      <button onClick={() => patch(v.id, { action: "reopen" })} disabled={rowBusy === v.id}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-400 hover:text-white transition disabled:opacity-40">
                        Reopen
                      </button>
                    )}
                    <button onClick={() => remove(v.id)} className="px-2 py-1.5 text-xs text-red-400/70 hover:text-red-400 transition">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── End of day totals ── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-[#121212]/95 backdrop-blur border-t border-gray-800 px-4 sm:px-8 py-3 z-30">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Stat label="Dining" value={totals.diningCovers} sub={`${totals.diningParties} ${totals.diningParties === 1 ? "table" : "tables"}`} tone="text-gold-300" />
          <Stat label="Takeaway" value={totals.takeaway} tone="text-emerald-400" />
          <Stat label="Still in" value={totals.stillIn} tone="text-white" />
          <div className="ml-auto text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Takings</p>
            <p className="text-xl font-bold text-emerald-300 tabular-nums">{money(totals.takingsPence)}</p>
            <p className="text-[10px] text-gray-600">{totals.billsEntered} of {totals.visits} bills</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
    </div>
  );
}
