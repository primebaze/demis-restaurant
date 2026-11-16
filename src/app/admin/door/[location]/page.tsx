"use client";

import { useEffect, useState, useCallback } from "react";
import { lineName, type OrderLine } from "@/lib/door-menu";

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

  const card = "bg-white border border-stone-100 rounded-2xl";
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold-700 mb-1.5">Door summary</p>
          <h2 className="text-2xl font-normal tracking-tight text-stone-900 leading-tight">{locationName || "…"}</h2>
          <a href={`/door/${location}`} target="_blank" rel="noopener"
            className="inline-block mt-2 text-xs text-gold-700 hover:text-gold-700">
            Open the door tablet → /door/{location}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-stone-200 rounded-xl text-stone-700 focus:outline-none focus:border-gold-400" />
          <button onClick={() => setDate(ukToday())}
            className={`px-4 py-2 text-sm rounded-xl border transition ${isToday ? "bg-gold-100 border-gold-400 text-gold-700" : "bg-white border-stone-200 text-stone-500 hover:text-stone-900"}`}>
            Today
          </button>
        </div>
      </header>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Big label="Guests dining" value={totals.diningCovers} sub={`across ${totals.diningParties} ${totals.diningParties === 1 ? "table" : "tables"}`} tone="text-gold-700" />
        <Big label="Takeaway orders" value={totals.takeaway} sub="collected at the door" tone="text-emerald-700" />
        <Big label="Total through the door" value={heads} sub="dining guests plus takeaway" tone="text-stone-900" />
        <Big label="Takings" value={money(totals.takingsPence)} sub={`${totals.billsEntered} of ${totals.visits} bills entered`} tone="text-emerald-700" />
      </div>

      {/* The detail behind the headline */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <section className={`${card} p-5`}>
          <h2 className="text-sm font-semibold text-stone-900 mb-4">Where the money came from</h2>
          <Split label="Dining" pence={totals.diningTakingsPence} total={totals.takingsPence} tone="bg-gold-300" />
          <Split label="Takeaway" pence={totals.takeawayTakingsPence} total={totals.takingsPence} tone="bg-emerald-400" />
          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-stone-100">
            <Mini label="Average per guest" value={money(perHead)} />
            <Mini label="Average per table" value={money(perTable)} />
          </div>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="text-sm font-semibold text-stone-900 mb-4">Where the day stands</h2>
          <div className="grid grid-cols-2 gap-4">
            <Mini label="Still in the building" value={String(totals.stillIn)} tone={totals.stillIn > 0 ? "text-stone-900" : "text-stone-500"} />
            <Mini label="Checked out" value={String(totals.visits - totals.stillIn)} />
            <Mini label="Bills still missing" value={String(unbilled)} tone={unbilled > 0 ? "text-amber-800" : "text-stone-500"} />
            <Mini label="Arrived with a booking" value={String(visits.filter((v) => v.isBooking).length)} />
          </div>
          {isToday && totals.visits === 0 && (
            <p className="mt-5 text-xs text-stone-500">
              Nothing logged yet today. Staff check guests in on the door tablet at /door/{location}.
            </p>
          )}
        </section>
      </div>

      {/* What sold, from the orders staff took at the door */}
      <section className={`${card} p-5 mb-4`}>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-stone-900">What sold</h2>
          <span className="text-xs text-stone-500">
            {soldFood.reduce((n, [, q]) => n + q, 0)} food · {soldDrinks.reduce((n, [, q]) => n + q, 0)} drinks
          </span>
        </div>
        {soldFood.length === 0 && soldDrinks.length === 0 ? (
          <p className="text-xs text-stone-500">No orders taken {isToday ? "yet today" : "on this day"}.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {([["Food", soldFood, "bg-gold-300"], ["Drinks", soldDrinks, "bg-stone-300"]] as const).map(([title, list, bar]) => {
              const top = list.slice(0, 8);
              const max = top[0]?.[1] || 1;
              return (
                <div key={title}>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 mb-2.5">{title}</p>
                  {top.length === 0 ? (
                    <p className="text-xs text-stone-400">None</p>
                  ) : (
                    <div className="space-y-2">
                      {top.map(([name, qty]) => (
                        <div key={name}>
                          <div className="flex items-baseline justify-between gap-3 mb-1">
                            <span className="text-xs text-stone-700 truncate">{name}</span>
                            <span className="text-sm font-bold text-stone-900 tabular-nums">{qty}</span>
                          </div>
                          <div className="h-1 bg-black/50 rounded-full overflow-hidden">
                            <div className={`h-full ${bar} rounded-full`} style={{ width: `${(qty / max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                      {list.length > top.length && (
                        <p className="text-[11px] text-stone-400">+{list.length - top.length} more</p>
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
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-900">{isToday ? "Today's log" : `Log for ${date}`}</h2>
          <span className="text-xs text-stone-500">by table</span>
        </div>

        {loading ? (
          <p className="px-5 py-14 text-center text-sm text-stone-500">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-stone-500">No one checked in {isToday ? "yet" : "on this day"}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-stone-500 border-b border-stone-100">
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
              <tbody className="divide-y divide-stone-100">
                {visits.map((v) => {
                  const isDining = v.visitType === "dining";
                  return (
                    <tr key={v.id} className={v.status === "active" ? "" : "bg-stone-50"}>
                      <td className="px-5 py-3 font-semibold text-stone-900 tabular-nums">{v.tableNo || <span className="text-stone-400">—</span>}</td>
                      <td className={`px-3 py-3 ${v.hasDetails ? "text-stone-900" : "text-stone-500"}`}>
                        {v.label}
                        {v.isBooking && <span className="ml-2 text-[10px] text-gold-700">booked</span>}
                      </td>
                      <td className={`px-3 py-3 ${isDining ? "text-gold-700" : "text-emerald-700"}`}>
                        {isDining ? "Dining" : "Takeaway"}
                      </td>
                      <td className="px-3 py-3 text-right text-stone-700 tabular-nums">{isDining ? v.partySize : "—"}</td>
                      <td className="px-3 py-3 text-xs text-stone-500 max-w-[260px]">
                        {v.items?.length ? (
                          // one line per guest when the table ordered guest by guest
                          Array.from(new Set(v.items.map((l) => l.guest))).sort((a, b) => a - b).map((g, _, all) => (
                            <div key={g} className="leading-relaxed">
                              {all.length > 1 && <span className="text-stone-500 font-semibold mr-1">G{g}</span>}
                              {v.items.filter((l) => l.guest === g).map((l) => (l.qty > 1 ? `${l.qty}× ${lineName(l)}` : lineName(l))).join(", ")}
                            </div>
                          ))
                        ) : <span className="text-stone-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-stone-500 tabular-nums">{clock(v.checkedInAt)}</td>
                      <td className="px-3 py-3 text-right text-stone-500 tabular-nums">
                        {v.checkedOutAt ? clock(v.checkedOutAt) : <span className="text-amber-800">still in</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-stone-500 tabular-nums">{stayed(v.checkedInAt, v.checkedOutAt)}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">
                        {v.amountPence != null
                          ? <span className="text-emerald-700">{money(v.amountPence)}</span>
                          : <span className="text-stone-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-200 bg-stone-50 text-sm font-bold">
                  <td className="px-5 py-3 text-stone-500" colSpan={3}>Total</td>
                  <td className="px-3 py-3 text-right text-stone-900 tabular-nums">{totals.diningCovers}</td>
                  <td colSpan={4} />
                  <td className="px-5 py-3 text-right text-emerald-700 tabular-nums">{money(totals.takingsPence)}</td>
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
    <div className="bg-white border border-stone-100 rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500">{label}</p>
      <p className={`mt-1.5 text-4xl font-bold tabular-nums leading-none ${tone}`}>{value}</p>
      <p className="mt-2 text-[11px] text-stone-500">{sub}</p>
    </div>
  );
}

function Mini({ label, value, tone = "text-stone-900" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function Split({ label, pence, total, tone }: { label: string; pence: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.round((pence / total) * 100) : 0;
  return (
    <div className="mb-3.5 last:mb-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-stone-500">{label}</span>
        <span className="text-sm font-bold text-stone-900 tabular-nums">
          {`£${(pence / 100).toFixed(2)}`}
          <span className="ml-2 text-[11px] font-normal text-stone-500">{pct}%</span>
        </span>
      </div>
      <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
        <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
