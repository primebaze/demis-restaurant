"use client";

import { useEffect, useState, useCallback } from "react";
import type { OrderLine } from "@/lib/door-menu";

type Visit = {
  id: string; seq: number; label: string; hasDetails: boolean;
  name: string; phone: string; email: string;
  visitType: string; partySize: number; tableNo: string; isBooking: boolean; items: OrderLine[];
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
const ukToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

/** How long they stayed. Blank while they are still in. */
function stayed(from: string, to: string | null): string {
  if (!to) return "—";
  const m = Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

export default function DoorSummaryPage({ params }: { params: { location: string } }) {
  const { location } = params;

  const [date, setDate] = useState(() => ukToday());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [totals, setTotals] = useState<Totals>(EMPTY);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);

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
  useEffect(() => {
    if (!isToday) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load, isToday]);

  const card = "bg-[#161616] border border-white/[0.06] rounded-2xl";
  const heads = totals.diningCovers + totals.takeaway;
  const perHead = heads > 0 ? Math.round(totals.takingsPence / heads) : 0;
  const perTable = totals.diningParties > 0 ? Math.round(totals.diningTakingsPence / totals.diningParties) : 0;
  const unbilled = totals.visits - totals.billsEntered;
  const sold = (kind: "food" | "drink") => {
    const m = new Map<string, number>();
    for (const v of visits) for (const l of v.items || []) if (l.kind === kind) m.set(l.name, (m.get(l.name) || 0) + l.qty);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  const soldFood = sold("food");
  const soldDrinks = sold("drink");

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold-300/60 mb-1.5">Door summary</p>
          <h1 className="text-3xl font-bold text-white leading-none">{locationName || "…"}</h1>
          <a href={`/door/${location}`} target="_blank" rel="noopener"
            className="inline-block mt-2 text-xs text-gold-300/80 hover:text-gold-300">
            Open the door tablet → /door/{location}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm bg-[#161616] border border-white/[0.07] rounded-xl text-gray-300 focus:outline-none focus:border-gold-300/40" />
          <button onClick={() => setDate(ukToday())}
            className={`px-4 py-2 text-sm rounded-xl border transition ${isToday ? "bg-gold-300/10 border-gold-300/40 text-gold-300" : "bg-[#161616] border-white/[0.07] text-gray-400 hover:text-white"}`}>
            Today
          </button>
        </div>
      </header>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Big label="Guests dining" value={totals.diningCovers} sub={`across ${totals.diningParties} ${totals.diningParties === 1 ? "table" : "tables"}`} tone="text-gold-300" />
        <Big label="Takeaway orders" value={totals.takeaway} sub="collected at the door" tone="text-emerald-400" />
        <Big label="Total through the door" value={heads} sub="dining guests plus takeaway" tone="text-white" />
        <Big label="Takings" value={money(totals.takingsPence)} sub={`${totals.billsEntered} of ${totals.visits} bills entered`} tone="text-emerald-300" />
      </div>

      {/* The detail behind the headline */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <section className={`${card} p-5`}>
          <h2 className="text-sm font-semibold text-white mb-4">Where the money came from</h2>
          <Split label="Dining" pence={totals.diningTakingsPence} total={totals.takingsPence} tone="bg-gold-300" />
          <Split label="Takeaway" pence={totals.takeawayTakingsPence} total={totals.takingsPence} tone="bg-emerald-400" />
          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/[0.06]">
            <Mini label="Average per guest" value={money(perHead)} />
            <Mini label="Average per table" value={money(perTable)} />
          </div>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="text-sm font-semibold text-white mb-4">Where the day stands</h2>
          <div className="grid grid-cols-2 gap-4">
            <Mini label="Still in the building" value={String(totals.stillIn)} tone={totals.stillIn > 0 ? "text-white" : "text-gray-500"} />
            <Mini label="Checked out" value={String(totals.visits - totals.stillIn)} />
            <Mini label="Bills still missing" value={String(unbilled)} tone={unbilled > 0 ? "text-amber-400" : "text-gray-500"} />
            <Mini label="Arrived with a booking" value={String(visits.filter((v) => v.isBooking).length)} />
          </div>
          {isToday && totals.visits === 0 && (
            <p className="mt-5 text-xs text-gray-500">
              Nothing logged yet today. Staff check guests in on the door tablet at /door/{location}.
            </p>
          )}
        </section>
      </div>

      {/* What sold, from the orders staff took at the door */}
      <section className={`${card} p-5 mb-4`}>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">What sold</h2>
          <span className="text-xs text-gray-500">
            {soldFood.reduce((n, [, q]) => n + q, 0)} food · {soldDrinks.reduce((n, [, q]) => n + q, 0)} drinks
          </span>
        </div>
        {soldFood.length === 0 && soldDrinks.length === 0 ? (
          <p className="text-xs text-gray-500">No orders taken {isToday ? "yet today" : "on this day"}.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {([["Food", soldFood, "bg-gold-300"], ["Drinks", soldDrinks, "bg-sky-400"]] as const).map(([title, list, bar]) => {
              const top = list.slice(0, 8);
              const max = top[0]?.[1] || 1;
              return (
                <div key={title}>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-2.5">{title}</p>
                  {top.length === 0 ? (
                    <p className="text-xs text-gray-600">None</p>
                  ) : (
                    <div className="space-y-2">
                      {top.map(([name, qty]) => (
                        <div key={name}>
                          <div className="flex items-baseline justify-between gap-3 mb-1">
                            <span className="text-xs text-gray-300 truncate">{name}</span>
                            <span className="text-sm font-bold text-white tabular-nums">{qty}</span>
                          </div>
                          <div className="h-1 bg-black/50 rounded-full overflow-hidden">
                            <div className={`h-full ${bar} rounded-full`} style={{ width: `${(qty / max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                      {list.length > top.length && (
                        <p className="text-[11px] text-gray-600">+{list.length - top.length} more</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Read-only log */}
      <section className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">{isToday ? "Today's log" : `Log for ${date}`}</h2>
          <span className="text-xs text-gray-500">by table</span>
        </div>

        {loading ? (
          <p className="px-5 py-14 text-center text-sm text-gray-500">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-gray-500">No one checked in {isToday ? "yet" : "on this day"}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-gray-500 border-b border-white/[0.06]">
                  <th className="text-left font-medium px-5 py-2.5">Table</th>
                  <th className="text-left font-medium px-3 py-2.5">Guest</th>
                  <th className="text-left font-medium px-3 py-2.5">Type</th>
                  <th className="text-right font-medium px-3 py-2.5">Guests</th>
                  <th className="text-left font-medium px-3 py-2.5">Order</th>
                  <th className="text-right font-medium px-3 py-2.5">In</th>
                  <th className="text-right font-medium px-3 py-2.5">Out</th>
                  <th className="text-right font-medium px-3 py-2.5">Stayed</th>
                  <th className="text-right font-medium px-5 py-2.5">Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {visits.map((v) => {
                  const isDining = v.visitType === "dining";
                  return (
                    <tr key={v.id} className={v.status === "active" ? "" : "bg-black/20"}>
                      <td className="px-5 py-3 font-semibold text-white tabular-nums">{v.tableNo || <span className="text-gray-600">—</span>}</td>
                      <td className={`px-3 py-3 ${v.hasDetails ? "text-white" : "text-gray-500"}`}>
                        {v.label}
                        {v.isBooking && <span className="ml-2 text-[10px] text-gold-300/80">booked</span>}
                      </td>
                      <td className={`px-3 py-3 ${isDining ? "text-gold-300/80" : "text-emerald-400/80"}`}>
                        {isDining ? "Dining" : "Takeaway"}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-300 tabular-nums">{isDining ? v.partySize : "—"}</td>
                      <td className="px-3 py-3 text-xs text-gray-400 max-w-[260px]">
                        {v.items?.length
                          ? v.items.map((l) => (l.qty > 1 ? `${l.qty}× ${l.name}` : l.name)).join(", ")
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-400 tabular-nums">{clock(v.checkedInAt)}</td>
                      <td className="px-3 py-3 text-right text-gray-400 tabular-nums">
                        {v.checkedOutAt ? clock(v.checkedOutAt) : <span className="text-amber-400/80">still in</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-400 tabular-nums">{stayed(v.checkedInAt, v.checkedOutAt)}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">
                        {v.amountPence != null
                          ? <span className="text-emerald-300">{money(v.amountPence)}</span>
                          : <span className="text-gray-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.08] bg-black/30 text-sm font-bold">
                  <td className="px-5 py-3 text-gray-400" colSpan={3}>Total</td>
                  <td className="px-3 py-3 text-right text-white tabular-nums">{totals.diningCovers}</td>
                  <td colSpan={4} />
                  <td className="px-5 py-3 text-right text-emerald-300 tabular-nums">{money(totals.takingsPence)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Big({ label, value, sub, tone }: { label: string; value: number | string; sub: string; tone: string }) {
  return (
    <div className="bg-[#161616] border border-white/[0.06] rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500">{label}</p>
      <p className={`mt-1.5 text-4xl font-bold tabular-nums leading-none ${tone}`}>{value}</p>
      <p className="mt-2 text-[11px] text-gray-500">{sub}</p>
    </div>
  );
}

function Mini({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function Split({ label, pence, total, tone }: { label: string; pence: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.round((pence / total) * 100) : 0;
  return (
    <div className="mb-3.5 last:mb-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-sm font-bold text-white tabular-nums">
          {`£${(pence / 100).toFixed(2)}`}
          <span className="ml-2 text-[11px] font-normal text-gray-500">{pct}%</span>
        </span>
      </div>
      <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
        <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
