"use client";

import { useEffect, useState, useCallback , useRef} from "react";
import { lineName, type OrderLine } from "@/lib/door-menu";
import { OwnLayout, PageHead, GlassStats, Sheet, SheetTitle, SheetFooter, Tag, PillSwitch, Empty, btn, table, tableWrap, DateField } from "@/components/admin/ui";

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
  if (!to) return "";
  const m = Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

const LOCATIONS = [
  { href: "/admin/door/cricklewood", label: "Cricklewood" },
  { href: "/admin/door/streatham", label: "Streatham Hill" },
];

export default function DoorSummaryPage({ params }: { params: { location: string } }) {
  const { location } = params;

  const [date, setDate] = useState(() => ukToday());
  const dateRef = useRef(date);
  dateRef.current = date;
  // Keep the chosen day in the address, so switching to the other page keeps it.
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDate(d);
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (date === ukToday()) url.searchParams.delete("date");
    else url.searchParams.set("date", date);
    window.history.replaceState(null, "", url.toString());
  }, [date]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [totals, setTotals] = useState<Totals>(EMPTY);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);

  const isToday = date === ukToday();

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/door?location=${location}&date=${date}`);
    const d = await res.json();
    if (dateRef.current !== date) return; // a newer day was picked while this one loaded
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
    <OwnLayout>
      <PageHead
        title="Door"
        subtitle={
          <>
            {locationName || "…"} · open the door tablet at{" "}
            <a href={`/door/${location}`} target="_blank" rel="noopener" className="underline underline-offset-[3px] hover:text-white">
              /door/{location}
            </a>
          </>
        }
        actions={
          <>
            <PillSwitch items={LOCATIONS.map((i) => ({ ...i, href: date === ukToday() ? i.href : `${i.href}?date=${date}` }))} current={`/admin/door/${location}`} label="Location" />
            <DateField variant="glass" value={date} onChange={setDate} ariaLabel="Day" />
            <button onClick={() => setDate(ukToday())} aria-pressed={isToday} className={btn.primary}>
              Today
            </button>
          </>
        }
      />

      <GlassStats
        items={[
          { label: "Guests dining", value: totals.diningCovers, hint: `across ${totals.diningParties} ${totals.diningParties === 1 ? "table" : "tables"}` },
          { label: "Takeaway orders", value: totals.takeaway, hint: "collected at the door" },
          { label: "Total through the door", value: heads, hint: "dining guests plus takeaway" },
          { label: "Takings", value: money(totals.takingsPence), hint: `${totals.billsEntered} of ${totals.visits} bills entered` },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        {/* The detail behind the headline */}
        <Sheet label="Where the money came from and where the day stands" className="p-[18px]">
          <div className="grid gap-x-6 md:grid-cols-2 lg:grid-cols-1">
            <div>
              <SheetTitle>Where the money came from</SheetTitle>
              <div className="mt-2.5">
                <Split label="Dining" pence={totals.diningTakingsPence} total={totals.takingsPence} tone="bg-gold-300" />
                <Split label="Takeaway" pence={totals.takeawayTakingsPence} total={totals.takingsPence} tone="bg-stone-300" />
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <Mini label="Per guest" value={money(perHead)} />
                <Mini label="Per table" value={money(perTable)} />
              </div>
            </div>

            <div className="mt-3 border-t border-stone-100 pt-3 md:mt-0 md:border-t-0 md:pt-0 lg:mt-3 lg:border-t lg:pt-3">
              <SheetTitle>Where the day stands</SheetTitle>
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                <Mini label="Still in" value={totals.stillIn} />
                <Mini label="Checked out" value={totals.visits - totals.stillIn} />
                <Mini label="Bills missing" value={unbilled} hot={unbilled > 0} />
                <Mini label="With a booking" value={visits.filter((v) => v.isBooking).length} />
              </div>
              {isToday && totals.visits === 0 && (
                <p className="mt-2 text-xs font-light text-stone-500">
                  Nothing logged yet today. Staff check guests in on the door tablet at /door/{location}.
                </p>
              )}
            </div>
          </div>

          {/* What sold, from the orders staff took at the door */}
          <div className="mt-4 border-t border-stone-100 pt-4">
            <SheetTitle
              aside={
                <span className="text-xs font-light text-stone-500">
                  {soldFood.reduce((n, [, q]) => n + q, 0)} food · {soldDrinks.reduce((n, [, q]) => n + q, 0)} drinks
                </span>
              }
            >
              What sold
            </SheetTitle>
            {soldFood.length === 0 && soldDrinks.length === 0 ? (
              <p className="mt-3 text-xs font-light text-stone-500">No orders taken {isToday ? "yet today" : "on this day"}.</p>
            ) : (
              <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                {([["Food", soldFood, "bg-gold-300"], ["Drinks", soldDrinks, "bg-stone-300"]] as const).map(([title, list, bar]) => {
                  const top = list.slice(0, 8);
                  const max = top[0]?.[1] || 1;
                  return (
                    <div key={title}>
                      <p className="mb-2 text-xs font-light text-stone-500">{title}</p>
                      {top.length === 0 ? (
                        <p className="text-xs text-stone-400">None</p>
                      ) : (
                        <div className="space-y-2">
                          {top.map(([name, qty]) => (
                            <div key={name}>
                              <div className="mb-1 flex items-baseline justify-between gap-3">
                                <span className="truncate text-[13px] text-stone-700">{name}</span>
                                <span className="text-sm tabular-nums text-stone-900">{qty}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                                <div className={`h-full rounded-full ${bar}`} style={{ width: `${(qty / max) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                          {list.length > top.length && <p className="text-[11px] text-stone-400">+{list.length - top.length} more</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Sheet>

        {/* Read-only log */}
        <Sheet label={isToday ? "Today's log" : `Log for ${date}`} className="overflow-hidden">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pb-3 pt-[18px] md:px-5">
            <h2 className="font-outfit text-xl font-normal tracking-tight text-stone-900">{isToday ? "Today's log" : `Log for ${date}`}</h2>
            <span className="text-[13px] font-light text-stone-500">by table{isToday ? " · refreshes every 30 seconds" : ""}</span>
          </div>

          {loading ? (
            <Empty>Loading…</Empty>
          ) : visits.length === 0 ? (
            <Empty>No one checked in {isToday ? "yet" : "on this day"}.</Empty>
          ) : (
            <>
              {/* Phones: one card per visit */}
              <ul className="md:hidden">
                {visits.map((v) => {
                  const isDining = v.visitType === "dining";
                  return (
                    <li key={v.id} className="border-t border-stone-100 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[15px] font-medium tabular-nums">{v.tableNo ? `Table ${v.tableNo}` : isDining ? "No table" : "Takeaway"}</span>
                            <span className={v.hasDetails ? "text-stone-900" : "text-stone-500"}>{v.label}</span>
                            {v.isBooking && <span className="text-[11px] text-stone-900">booked</span>}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                            <TypeTag dining={isDining} />
                            {isDining && <span>{v.partySize} {v.partySize === 1 ? "guest" : "guests"}</span>}
                            <span className="tabular-nums">
                              In {clock(v.checkedInAt)} · {v.checkedOutAt ? `out ${clock(v.checkedOutAt)}` : <span className="text-amber-800">still in</span>}
                              {v.checkedOutAt ? ` · ${stayed(v.checkedInAt, v.checkedOutAt)}` : ""}
                            </span>
                          </div>
                        </div>
                        <span className="text-[15px] tabular-nums">{v.amountPence != null ? money(v.amountPence) : <Blank />}</span>
                      </div>
                      {v.items?.length > 0 && (
                        <div className="mt-2 rounded-2xl bg-stone-50 px-3 py-2 text-xs text-stone-600">
                          <OrderLines items={v.items} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* iPad and up: the table */}
              <div className={`hidden md:block ${tableWrap}`}>
                <table className={`${table} !text-[13px]`}>
                  <thead>
                    <tr>
                      <th className="!pl-5">Table</th>
                      <th>Guest</th>
                      <th>Type</th>
                      <th className="!text-right">Guests</th>
                      <th>Order</th>
                      <th className="!text-right">In</th>
                      <th className="!text-right">Out</th>
                      <th className="!text-right">Stayed</th>
                      <th className="!pr-5 !text-right">Bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v) => {
                      const isDining = v.visitType === "dining";
                      return (
                        <tr key={v.id}>
                          <td className="!pl-5 font-medium tabular-nums">{v.tableNo || <Blank />}</td>
                          <td className={`whitespace-nowrap ${v.hasDetails ? "text-stone-900" : "text-stone-500"}`}>
                            {v.label}
                            {v.isBooking && <span className="ml-1.5 text-[11px] text-stone-900">booked</span>}
                          </td>
                          <td><TypeTag dining={isDining} /></td>
                          <td className="text-right tabular-nums">{isDining ? v.partySize : <Blank />}</td>
                          <td className="min-w-[180px] max-w-[280px] text-xs text-stone-500">
                            {v.items?.length ? <OrderLines items={v.items} /> : <Blank />}
                          </td>
                          <td className="text-right tabular-nums text-stone-500">{clock(v.checkedInAt)}</td>
                          <td className="whitespace-nowrap text-right tabular-nums text-stone-500">
                            {v.checkedOutAt ? clock(v.checkedOutAt) : <span className="text-amber-800">still in</span>}
                          </td>
                          <td className="whitespace-nowrap text-right tabular-nums text-stone-500">{stayed(v.checkedInAt, v.checkedOutAt) || <Blank />}</td>
                          <td className="!pr-5 whitespace-nowrap text-right tabular-nums">{v.amountPence != null ? money(v.amountPence) : <Blank />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <SheetFooter>
                <span className="text-stone-500">Total</span>
                <span className="ml-2">{totals.diningCovers} {totals.diningCovers === 1 ? "guest" : "guests"} dining</span>
                <span className="ml-2 text-stone-500">{visits.length} {visits.length === 1 ? "visit" : "visits"}</span>
                <span className="ml-auto text-[15px] tabular-nums">{money(totals.takingsPence)}</span>
              </SheetFooter>
            </>
          )}
        </Sheet>
      </div>
    </OwnLayout>
  );
}

function Blank() {
  return <span className="text-stone-300">·</span>;
}

function TypeTag({ dining }: { dining: boolean }) {
  return dining ? (
    <Tag tone="off">Dining</Tag>
  ) : (
    <span className="inline-flex h-6 items-center rounded-full border border-stone-200 bg-white px-2.5 text-xs text-stone-600">Takeaway</span>
  );
}

/** One line per guest when the table ordered guest by guest. */
function OrderLines({ items }: { items: OrderLine[] }) {
  return (
    <>
      {Array.from(new Set(items.map((l) => l.guest))).sort((a, b) => a - b).map((g, _, all) => (
        <div key={g} className="leading-relaxed">
          {all.length > 1 && <span className="mr-1 font-medium text-stone-600">G{g}</span>}
          {items.filter((l) => l.guest === g).map((l) => (l.qty > 1 ? `${l.qty}× ${lineName(l)}` : lineName(l))).join(", ")}
        </div>
      ))}
    </>
  );
}

/** Small label-and-number row, so the summary card stays short. */
function Mini({ label, value, hot = false }: { label: string; value: React.ReactNode; hot?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-2 rounded-xl px-3 py-2 ${hot ? "bg-gold-300 text-ink-900" : "bg-stone-50"}`}>
      <span className={`truncate text-xs font-light ${hot ? "" : "text-stone-500"}`}>{label}</span>
      <span className="text-[15px] tabular-nums">{value}</span>
    </div>
  );
}

function Split({ label, pence, total, tone }: { label: string; pence: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.round((pence / total) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] font-light text-stone-500">{label}</span>
        <span className="text-[15px] tabular-nums text-stone-900">
          {money(pence)}
          <span className="ml-2 text-xs text-stone-500">{pct}%</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
