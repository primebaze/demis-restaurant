"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, StickyNote, Store, Users } from "lucide-react";
import { BottomSheet, Empty, OwnLayout, PageHead, Sheet, StatTile, Tag, btn, statusLabel, statusTone } from "@/components/admin/ui";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface BookingEntry {
  id: string;
  code: string;
  guest: string;
  partySize: number;
  time: string;
  location: string;
  status: string;
  notes: string;
}

interface DateEntry {
  date: string;
  count: number;
  totalCovers: number;
  bookings: BookingEntry[];
}

interface LocationItem {
  id: string;
  name: string;
  slug: string;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [dateMap, setDateMap] = useState<Record<string, DateEntry>>({});
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [daySheet, setDaySheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [filterLoc, setFilterLoc] = useState("");

  // Fetch locations
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.locations) setLocations(d.locations);
      })
      .catch(() => {});
  }, []);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const params = new URLSearchParams({ month: monthStr });
    if (filterLoc) params.set("location", filterLoc);
    const res = await fetch(`/api/admin/calendar?${params}`);
    const data = await res.json();
    const entries: DateEntry[] = data.dates || [];
    const map: Record<string, DateEntry> = {};
    for (const e of entries) map[e.date] = e;
    setDateMap(map);
    setLoading(false);
  }, [year, month, filterLoc]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDate(null);
  }

  // Generate calendar grid (Mon start)
  function getMonthDays() {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startGap = firstDay === 0 ? 6 : firstDay - 1; // Mon-based offset
    const cells: (number | null)[] = [];
    for (let i = 0; i < startGap; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  const cells = getMonthDays();

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const selectedEntry = selectedDate ? dateMap[selectedDate] : null;
  const monthCount = Object.values(dateMap).reduce((n, e) => n + e.count, 0);
  const prevName = MONTH_NAMES[(month + 11) % 12];
  const nextName = MONTH_NAMES[(month + 1) % 12];

  const navBtn =
    "inline-flex h-9 items-center gap-1 rounded-full border border-stone-200 px-3 text-[13px] text-stone-900 transition hover:border-stone-300";

  // The chosen day's bookings: in the side sheet, and in the slide-up panel on phones and iPad portrait.
  const dayDetails = selectedDate ? (
            <>
              <div className="text-xs font-light text-stone-500">Selected day</div>
              <h3 className="font-outfit text-[22px] font-normal tracking-tight">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              {selectedEntry ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <StatTile hot label="Bookings" value={selectedEntry.count} />
                    <StatTile label="Covers" value={selectedEntry.totalCovers} />
                  </div>
                  <div className="mt-3 space-y-2 lg:max-h-[calc(100vh-330px)] lg:overflow-y-auto">
                    {selectedEntry.bookings.map((b) => (
                      <div key={b.id} className="rounded-[18px] bg-stone-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[15px] text-stone-900">{b.guest}</span>
                          <Tag tone={statusTone(b.status)}>{statusLabel(b.status)}</Tag>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.5} />
                            {b.time}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.5} />
                            {b.partySize} guest{b.partySize !== 1 ? "s" : ""}
                          </span>
                          <span>{b.location}</span>
                          <span className="ml-auto text-stone-400">#{b.code}</span>
                        </div>
                        {b.notes && (
                          <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-ember-700">
                            <StickyNote className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                            {b.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm font-light text-stone-500">No bookings on this date.</p>
              )}
            </>
  ) : null;

  return (
    <OwnLayout>
      <PageHead
        title="Booking calendar"
        subtitle="Every booking, day by day"
        actions={
          locations.length > 0 && (
            <>
              <button onClick={() => setFilterLoc("")} aria-pressed={!filterLoc} className={!filterLoc ? btn.primary : btn.glass}>
                <MapPin className="h-[18px] w-[18px]" strokeWidth={1.5} />
                All locations
              </button>
              {locations.map((l) => (
                <button key={l.id} onClick={() => setFilterLoc(l.slug)} aria-pressed={filterLoc === l.slug} className={filterLoc === l.slug ? btn.primary : btn.glass}>
                  <Store className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  {l.name}
                </button>
              ))}
            </>
          )
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Calendar */}
        <Sheet label="Month" className="p-3 md:p-5">
          {/* Month navigation */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 md:px-0">
            <h2 className="font-outfit text-xl md:text-[22px] font-normal tracking-tight">
              {MONTH_NAMES[month]} {year}
            </h2>
            <span className="text-[13px] font-light text-stone-500">
              {loading ? "Loading…" : `${monthCount} booking${monthCount !== 1 ? "s" : ""} this month`}
            </span>
            <div className="ml-auto flex gap-1.5">
              <button onClick={prevMonth} aria-label="Previous month" className={navBtn}>
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">{prevName}</span>
              </button>
              <button onClick={nextMonth} aria-label="Next month" className={navBtn}>
                <span className="hidden sm:inline">{nextName}</span>
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="mt-3 grid grid-cols-7 gap-1 md:gap-1.5">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="px-1 pb-1 text-center text-xs font-light text-stone-500 md:px-3 md:text-left">
                <span className="md:hidden">{d[0]}</span>
                <span className="hidden md:inline">{d}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <Empty>Loading…</Empty>
          ) : (
            <div className="grid grid-cols-7 gap-1 md:gap-1.5">
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} />;
                }
                const ds = dateStr(day);
                const entry = dateMap[ds];
                const isToday = ds === todayStr;
                const isSelected = ds === selectedDate;
                const isPast = ds < todayStr;
                const hasBookings = entry && entry.count > 0;

                return (
                  <button
                    key={ds}
                    onClick={() => {
                      setSelectedDate(ds);
                      if (window.matchMedia("(max-width: 1023px)").matches) setDaySheet(true);
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${day} ${MONTH_NAMES[month]}${hasBookings ? `, ${entry.count} booking${entry.count !== 1 ? "s" : ""}` : ""}`}
                    className={`relative flex h-14 flex-col items-center justify-between rounded-[14px] p-1.5 text-left transition md:h-[84px] md:items-start md:rounded-[18px] md:p-3 ${
                      isSelected
                        ? "bg-stone-900 text-white"
                        : isToday
                        ? "bg-white text-stone-900 ring-1 ring-inset ring-stone-900"
                        : `bg-stone-100 hover:bg-stone-200 ${isPast ? "text-stone-400" : "text-stone-900"}`
                    }`}
                  >
                    <span className="text-sm md:text-[17px] leading-none">{day}</span>
                    {isToday && (
                      <span className={`absolute right-2.5 top-2.5 hidden text-[9px] tracking-wider md:block ${isSelected ? "text-white/70" : "text-stone-500"}`}>TODAY</span>
                    )}
                    {hasBookings ? (
                      <span className="flex items-center gap-[3px]">
                        {entry.count <= 3 ? (
                          Array.from({ length: entry.count }).map((_, j) => (
                            <i key={j} className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-gold-300" : "bg-ember-400"}`} />
                          ))
                        ) : (
                          <>
                            <i className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-gold-300" : "bg-ember-400"}`} />
                            <i className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-gold-300" : "bg-ember-400"}`} />
                            <span className={`ml-0.5 text-[10px] leading-none ${isSelected ? "text-gold-200" : "text-ember-600"}`}>{entry.count}</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="h-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Sheet>

        {/* Side panel: booking list for selected date */}
        <Sheet label="Selected day" className="p-4 md:p-5 lg:sticky lg:top-24">
          {selectedDate ? (
            dayDetails
          ) : (
            <div className="py-12 text-center">
              <CalendarDays className="mx-auto mb-3 h-9 w-9 text-stone-300" strokeWidth={1.25} />
              <p className="text-sm font-light text-stone-500">Select a date to view bookings</p>
            </div>
          )}
        </Sheet>
      </div>

      <BottomSheet open={daySheet && !!selectedDate} onClose={() => setDaySheet(false)} title="Bookings">
        {dayDetails}
      </BottomSheet>
    </OwnLayout>
  );
}
