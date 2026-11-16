"use client";

import { useEffect, useState, useCallback , useRef} from "react";
import { ExternalLink, ListX, Radio, Tablet, Users } from "lucide-react";
import { OwnLayout, PageHead, PillSwitch, GlassStats, Sheet, SheetTitle, SheetFooter, Tag, Empty, btn, table, tableWrap, useTypedConfirm, DateField } from "@/components/admin/ui";

const SERVICES = [
  { href: "/admin/checkins", label: "Sunday Buffet" },
  { href: "/admin/brunch-checkins", label: "Sunday Feast" },
];

/** "2026-11-15" to "Sun 15 Nov". */
function dayLabel(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
}

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
  const [askToType, typeDialog] = useTypedConfirm();
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
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/brunch-checkins?date=${date}`);
    const d = await res.json();
    if (dateRef.current !== date) return; // a newer day was picked while this one loaded
    setData(d);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function resetDay() {
    if (!(await askToType({ title: "Clear this day?", message: <>Clears all Sunday Feast check-ins for {date}.</>, action: "Clear all" }))) return;
    await fetch("/api/admin/brunch-checkins", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }),
    });
    fetchData();
  }

  const isToday = date === ukToday();
  const covers = (c: CheckIn) => `${c.number}${c.partySize > 1 ? ` to ${c.endCover}` : ""}`;
  const groups = data?.groups ?? 0;
  // Old brunch check-ins split food / drinks; feast check-ins are one price.
  const mix = (c: CheckIn) =>
    c.withDrinks > 0 ? (
      <span>
        {c.foodOnly} food · <span className="text-stone-900">{c.withDrinks} drinks</span>
      </span>
    ) : (
      <span>Sunday Feast</span>
    );

  return (
    <OwnLayout>
      <PageHead
        title="Check-ins"
        subtitle="Who came through the door, numbered as they arrive"
        actions={
          <>
            <PillSwitch items={SERVICES.map((i) => ({ ...i, href: date === ukToday() ? i.href : `${i.href}?date=${date}` }))} current="/admin/brunch-checkins" label="Service" />
            <DateField variant="glass" value={date} onChange={setDate} ariaLabel="Day" />
          </>
        }
      />

      <GlassStats
        items={[
          { label: `People in${isToday ? " today" : ""}`, value: data?.total ?? 0 },
          { label: "Groups", value: groups },
          { label: "Takings", value: `£${(data?.takings ?? 0).toLocaleString("en-GB")}` },
          { label: "Per person", value: `£${data?.pricePerHead ?? 0}` },
        ]}
      />

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_330px]">
        <Sheet label="Check-ins" className="min-w-0 pt-[18px]">
          <div className="px-4 md:px-5">
            <SheetTitle aside={isToday ? <Tag tone="ok"><Radio className="h-3.5 w-3.5" strokeWidth={1.75} />Live</Tag> : undefined}>
              Feast check-ins
              <span className="ml-2.5 align-middle text-[13px] font-light text-stone-500">{groups} {groups === 1 ? "group" : "groups"}</span>
            </SheetTitle>
          </div>

          <div className={`mt-3 transition-opacity ${loading && data?.checkins.length ? "opacity-50" : ""}`}>
            {loading && !data?.checkins.length ? (
              <Empty>Loading…</Empty>
            ) : !data || data.checkins.length === 0 ? (
              <Empty>No check-ins for this day yet.</Empty>
            ) : (
              <>
                {/* Phones: one card per group */}
                <ul className="divide-y divide-sand-200 border-t border-sand-200 md:hidden">
                  {data.checkins.map((c) => {
                    const left = remaining(c.endsAt, now);
                    return (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-[76px] shrink-0 font-medium tabular-nums">{covers(c)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="inline-flex shrink-0 items-center gap-1">
                              <Users className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
                              {c.partySize}
                            </span>
                            <span className="truncate text-xs text-stone-500">{mix(c)}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-stone-500">
                            In {fmt(c.checkedInAt)} · finish by {fmt(c.endsAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="font-medium tabular-nums text-stone-900">£{c.price}</span>
                          {left === "over" ? <Tag tone="off">Time up</Tag> : <Tag tone="ok">{left} left</Tag>}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* iPad and up: the table */}
                <div className={`${tableWrap} hidden px-2 md:block`}>
                  <table className={table}>
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Party</th>
                        <th>Mix</th>
                        <th>Price</th>
                        <th>In</th>
                        <th>Finish by</th>
                        <th>Time left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.checkins.map((c) => {
                        const left = remaining(c.endsAt, now);
                        return (
                          <tr key={c.id} className="hover:bg-sand-100">
                            <td className="whitespace-nowrap font-medium tabular-nums">{covers(c)}</td>
                            <td>
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
                                {c.partySize}
                              </span>
                            </td>
                            <td className="text-[13px] text-stone-500">{mix(c)}</td>
                            <td><span className="font-medium tabular-nums text-stone-900">£{c.price}</span></td>
                            <td className="tabular-nums text-stone-500">{fmt(c.checkedInAt)}</td>
                            <td className="tabular-nums">{fmt(c.endsAt)}</td>
                            <td>{left === "over" ? <Tag tone="off">Time up</Tag> : <Tag tone="ok">{left} left</Tag>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div className="mt-1">
            <SheetFooter>
              <span className="text-stone-500">
                {groups} {groups === 1 ? "group" : "groups"}, {data?.total ?? 0} {(data?.total ?? 0) === 1 ? "person" : "people"} on {dayLabel(date)}
              </span>
            </SheetFooter>
          </div>
        </Sheet>

        <Sheet label="Door kiosk" className="flex flex-col p-[18px] lg:sticky lg:top-[96px] lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto lg:self-start">
          <SheetTitle>Door kiosk</SheetTitle>
          <a
            href="/brunch-checkin"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2.5 rounded-2xl bg-sand-200 px-3.5 py-3 text-sm transition hover:bg-sand-300"
          >
            <Tablet className="h-5 w-5 shrink-0 text-stone-900" strokeWidth={1.5} />
            <span>
              Guests check in at <b className="font-medium">/brunch-checkin</b>
            </span>
            <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-stone-500" strokeWidth={1.5} />
          </a>
          <p className="mt-2 text-xs font-light leading-relaxed text-stone-500">
            It uses the same kiosk PIN as the buffet. Change it on the{" "}
            <a href="/admin/checkins" className="text-stone-900 underline-offset-2 hover:underline">Sunday Buffet</a> tab.
          </p>

          <h2 className="mt-5 font-outfit text-[17px] font-normal tracking-tight">Clear the day</h2>
          <p className="mt-1 text-[13px] font-light leading-relaxed text-stone-500">Clears all feast check-ins for {dayLabel(date)}. This cannot be undone.</p>
          <button onClick={resetDay} className={`${btn.light} mt-3 self-start hover:text-red-700`}>
            <ListX className="h-4 w-4" strokeWidth={1.5} />
            Clear all for this day
          </button>

          <p className="mt-6 text-xs font-light leading-relaxed text-stone-500">
            Each group gets a 1h 30m dining window from the moment they check in. Times update every 30 seconds.
          </p>
        </Sheet>
      </div>
      {typeDialog}
    </OwnLayout>
  );
}
