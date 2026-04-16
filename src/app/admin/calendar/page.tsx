"use client";

import { useState, useEffect, useCallback } from "react";

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [filterLoc, setFilterLoc] = useState("");

  // Fetch locations
  useEffect(() => {
    fetch("/api/admin/settings/policies")
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
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const selectedEntry = selectedDate ? dateMap[selectedDate] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Booking Calendar</h1>
      </div>

      {/* Location filter */}
      {locations.length > 0 && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilterLoc("")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              !filterLoc ? "bg-gold-300/10 text-gold-300 border border-gold-300/30" : "text-gray-400 border border-gray-800 hover:text-white"
            }`}
          >
            All Locations
          </button>
          {locations.map((l) => (
            <button
              key={l.id}
              onClick={() => setFilterLoc(l.slug)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filterLoc === l.slug ? "bg-gold-300/10 text-gold-300 border border-gold-300/30" : "text-gray-400 border border-gray-800 hover:text-white"
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-[#141414] border border-gray-800 rounded-2xl p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition text-lg">
              ‹
            </button>
            <h2 className="text-xl font-semibold text-white">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition text-lg">
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="aspect-square" />;
                }
                const ds = dateStr(day);
                const entry = dateMap[ds];
                const isToday = ds === todayStr;
                const isSelected = ds === selectedDate;
                const hasBookings = entry && entry.count > 0;

                return (
                  <button
                    key={ds}
                    onClick={() => setSelectedDate(ds)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-sm transition relative ${
                      isSelected
                        ? "bg-gold-300/20 text-gold-300 border border-gold-300/40"
                        : isToday
                        ? "bg-white/5 text-white border border-gray-700"
                        : "text-gray-300 hover:bg-white/5"
                    }`}
                  >
                    <span className={`font-medium ${isToday && !isSelected ? "text-gold-300" : ""}`}>
                      {day}
                    </span>
                    {hasBookings && (
                      <div className="flex gap-0.5">
                        {entry.count <= 3 ? (
                          Array.from({ length: entry.count }).map((_, j) => (
                            <span key={j} className="w-1.5 h-1.5 rounded-full bg-gold-300" />
                          ))
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-gold-300" />
                            <span className="w-1.5 h-1.5 rounded-full bg-gold-300" />
                            <span className="text-[10px] text-gold-300 leading-none ml-0.5">{entry.count}</span>
                          </>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Side panel — booking list for selected date */}
        <div className="bg-[#141414] border border-gray-800 rounded-2xl p-6">
          {selectedDate ? (
            <>
              <h3 className="text-white font-semibold mb-1">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              {selectedEntry ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    {selectedEntry.count} booking{selectedEntry.count !== 1 ? "s" : ""} · {selectedEntry.totalCovers} cover{selectedEntry.totalCovers !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-3">
                    {selectedEntry.bookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-sm">{b.guest}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            b.status === "confirmed"
                              ? "bg-green-400/10 text-green-400"
                              : b.status === "pending_payment"
                              ? "bg-yellow-400/10 text-yellow-400"
                              : "bg-gray-400/10 text-gray-400"
                          }`}>
                            {b.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <p>{b.time} · {b.partySize} guest{b.partySize !== 1 ? "s" : ""}</p>
                          <p>{b.location} · #{b.code}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 mt-2">No bookings on this date.</p>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🗓️</div>
              <p className="text-gray-500 text-sm">Select a date to view bookings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
