"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarDays, ExternalLink, ListX, Radio, Tablet, Users } from "lucide-react";
import { OwnLayout, PageHead, PillSwitch, GlassStats, Sheet, SheetTitle, SheetFooter, Tag, Empty, btn, table, tableWrap } from "@/components/admin/ui";

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

  const isToday = date === ukToday();
  const covers = (c: CheckIn) => `${c.number}${c.partySize > 1 ? ` to ${c.endCover}` : ""}`;
  const groups = data?.groups ?? 0;
  // Old brunch check-ins split food / drinks; feast check-ins are one price.
  const mix = (c: CheckIn) =>
    c.withDrinks > 0 ? (
      <span>
        {c.foodOnly} food · <span className="text-gold-700">{c.withDrinks} drinks</span>
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
            <PillSwitch items={SERVICES} current="/admin/brunch-checkins" label="Service" />
            <div className="inline-flex h-[46px] items-center gap-1 rounded-full border border-white/10 bg-[rgba(58,52,48,0.48)] p-1 pl-4 text-white backdrop-blur-xl">
              <label className="inline-flex items-center gap-2 pr-1">
                <CalendarDays className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span className="sr-only">Day</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-[15px] font-light text-white outline-none [color-scheme:dark]"
                />
              </label>
              <button
                onClick={() => setDate(ukToday())}
                aria-pressed={isToday}
                className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm transition ${isToday ? "bg-white text-stone-900" : "font-light text-white hover:bg-white/10"}`}
              >
                Today
              </button>
            </div>
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
                <ul className="divide-y divide-stone-100 border-t border-stone-100 md:hidden">
                  {data.checkins.map((c) => {
                    const left = remaining(c.endsAt, now);
                    return (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-[76px] shrink-0 font-medium tabular-nums">{covers(c)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="inline-flex shrink-0 items-center gap-1">
                              <Users className="h-4 w-4 text-stone-400" strokeWidth={1.5} />
                              {c.partySize}
                            </span>
                            <span className="truncate text-xs text-stone-500">{mix(c)}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-stone-500">
                            In {fmt(c.checkedInAt)} · finish by {fmt(c.endsAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Tag tone="gold">£{c.price}</Tag>
                          <span className={`text-sm ${left === "over" ? "text-red-700" : "font-medium text-gold-700"}`}>{left}</span>
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
                        <th>Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.checkins.map((c) => {
                        const left = remaining(c.endsAt, now);
                        return (
                          <tr key={c.id} className="hover:bg-stone-50">
                            <td className="whitespace-nowrap font-medium tabular-nums">{covers(c)}</td>
                            <td>
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-4 w-4 text-stone-400" strokeWidth={1.5} />
                                {c.partySize}
                              </span>
                            </td>
                            <td className="text-[13px] text-stone-500">{mix(c)}</td>
                            <td><Tag tone="gold">£{c.price}</Tag></td>
                            <td className="tabular-nums text-stone-500">{fmt(c.checkedInAt)}</td>
                            <td className="tabular-nums">{fmt(c.endsAt)}</td>
                            <td className={left === "over" ? "text-red-700" : "font-medium text-gold-700"}>{left}</td>
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

        <Sheet label="Door kiosk" className="flex flex-col p-[18px]">
          <SheetTitle>Door kiosk</SheetTitle>
          <a
            href="/brunch-checkin"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2.5 rounded-2xl bg-stone-100 px-3.5 py-3 text-sm transition hover:bg-stone-200"
          >
            <Tablet className="h-5 w-5 shrink-0 text-gold-700" strokeWidth={1.5} />
            <span>
              Guests check in at <b className="font-medium">/brunch-checkin</b>
            </span>
            <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-stone-500" strokeWidth={1.5} />
          </a>
          <p className="mt-2 text-xs font-light leading-relaxed text-stone-500">
            It uses the same kiosk PIN as the buffet. Change it on the{" "}
            <a href="/admin/checkins" className="text-gold-700 underline-offset-2 hover:underline">Sunday Buffet</a> tab.
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
    </OwnLayout>
  );
}
