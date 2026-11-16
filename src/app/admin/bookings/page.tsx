"use client";

import { Fragment, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Mail, MapPin, Phone, StickyNote, Users, X } from "lucide-react";
import {
  Avatar,
  Empty,
  GlassStats,
  OwnLayout,
  PageHead,
  Seg,
  Sheet,
  SheetTitle,
  Tag,
  btn,
  field,
  fieldArea,
  statusLabel,
  statusTone,
  table,
  tableWrap, BottomSheet, DateField } from "@/components/admin/ui";

interface BookingRow {
  id: string;
  confirmationCode: string;
  guest: { name: string; email: string; phone: string };
  location: string;
  locationSlug: string;
  date: string;
  time: string;
  slot: string;
  partySize: number;
  status: string;
  source: string;
  notes: string | null;
  depositAmountPence: number;
  depositStatus: string;
  addOns: { name: string; pricePence: number }[];
  createdAt: string;
}

/** Per-day counts from the calendar API (confirmed, awaiting deposit and modified bookings). */
interface CalDay {
  date: string;
  count: number;
  totalCovers: number;
}

interface Stats {
  todayBookings: number;
  todayCovers: number;
  upcomingNext7Days: number;
  totalBookings30d: number;
  noShowRate: string;
}

const STATUS_OPTIONS = [
  "confirmed",
  "modified",
  "pending_payment",
  "cancelled",
  "no_show",
  "completed",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function ukTodayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

// Upcoming / Today / Past tag based on the booking date vs UK today
function dayTag(date: string): { label: string; cls: string } {
  const ukToday = ukTodayStr();
  if (date > ukToday) return { label: "Upcoming", cls: "bg-emerald-50 text-emerald-700" };
  if (date === ukToday) return { label: "Today", cls: "bg-stone-100 text-stone-900" };
  return { label: "Past", cls: "bg-stone-100 text-stone-500" };
}

/** "Sun 15 Nov" */
function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

const updSelBase =
  "rounded-full border border-stone-200 bg-white pl-3.5 pr-2 text-[13px] text-stone-900 outline-none transition hover:border-stone-300 focus:border-stone-500 disabled:opacity-50";
const smallSel =
  "h-9 rounded-full border border-stone-200 bg-white px-3.5 text-[13px] text-stone-900 outline-none transition hover:border-stone-300 focus:border-stone-500";
const callBtnBase =
  "inline-flex items-center justify-center gap-1.5 px-4 rounded-full text-sm font-medium text-ink-900 bg-honey-300 hover:bg-honey-200 transition";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-light text-stone-500">{label}</div>
      <div className="mt-0.5 break-words text-[13px] text-stone-900">{children}</div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // The right-hand list shows either one day (picked on the calendar) or every booking with the filters.
  const today = useMemo(() => ukTodayStr(), []);
  const [mode, setMode] = useState<"day" | "all">("day");
  const [selectedDay, setSelectedDay] = useState(today);
  // Phones and iPad portrait: tapping a day slides its bookings up from the bottom.
  const [daySheet, setDaySheet] = useState(false);

  // Calendar month (0-indexed month)
  const [calYear, setCalYear] = useState(() => Number(today.slice(0, 4)));
  const [calMonth, setCalMonth] = useState(() => Number(today.slice(5, 7)) - 1);
  const [calMap, setCalMap] = useState<Record<string, CalDay>>({});
  const [calLoading, setCalLoading] = useState(true);

  // Headline numbers (read from the dashboard API)
  const [stats, setStats] = useState<Stats | null>(null);

  // Filters
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [filterDate, setFilterDate] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Expanded row for detail view
  const [expanded, setExpanded] = useState<string | null>(null);

  // Status update
  const [updating, setUpdating] = useState<string | null>(null);

  // "Email past guests" composer. Only people whose booking date has passed.
  type MailTemplate = { key: string; name: string; subject: string; body: string };
  const [mailOpen, setMailOpen] = useState(false);
  const [mailLocation, setMailLocation] = useState("");
  const [mailCount, setMailCount] = useState<number | null>(null);
  const [mailSubject, setMailSubject] = useState("");
  const [mailMessage, setMailMessage] = useState("");
  const [mailing, setMailing] = useState(false);
  const [mailNote, setMailNote] = useState("");
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>([]);

  const fetchMailTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/mailing/templates?scope=bookings");
    if (!res.ok) return;
    const data = await res.json();
    setMailTemplates(data.templates || []);
  }, []);

  useEffect(() => {
    if (!mailOpen) return;
    setMailCount(null);
    const q = mailLocation ? `?location=${mailLocation}` : "";
    fetch(`/api/admin/bookings/mail${q}`)
      .then((r) => r.json())
      .then((d) => setMailCount(typeof d.total === "number" ? d.total : 0))
      .catch(() => setMailCount(0));
  }, [mailOpen, mailLocation]);

  useEffect(() => {
    if (mailOpen) fetchMailTemplates();
  }, [mailOpen, fetchMailTemplates]);

  async function saveMailTemplate() {
    const name = window.prompt("Save this email as:", "")?.trim();
    if (!name) return;
    const res = await fetch("/api/admin/mailing/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject: mailSubject, body: mailMessage, scope: "bookings" }),
    });
    if (!res.ok) { setMailNote("Could not save that one."); return; }
    await fetchMailTemplates();
    setMailNote(`Saved as "${name}".`);
  }

  async function sendMailPast() {
    if (!mailSubject.trim() || !mailMessage.trim()) { setMailNote("Add a subject and a message first."); return; }
    const where = mailLocation === "cricklewood" ? " from Cricklewood" : mailLocation === "streatham" ? " from Streatham Hill" : "";
    if (!confirm(`Email all ${mailCount ?? 0} past guests${where}? Each person gets one email.`)) return;
    setMailing(true);
    setMailNote("");
    let sent = 0, failed = 0, offset: number | null = 0;
    try {
      // The server sends 25 at a time; keep asking until it says we're done.
      while (offset !== null) {
        const res: Response = await fetch("/api/admin/bookings/mail", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: mailLocation || undefined, offset, subject: mailSubject, message: mailMessage }),
        });
        const d: { sent: number; failed: number; total: number; nextOffset: number | null; error?: string } = await res.json();
        if (!res.ok) {
          setMailNote(`${d.error || "Could not send."}${sent ? ` ${sent} sent before it stopped.` : ""}`);
          return;
        }
        sent += d.sent; failed += d.failed;
        offset = d.nextOffset;
        if (offset !== null) setMailNote(`Sending… ${sent + failed} of ${d.total}`);
      }
      setMailNote(`Sent to ${sent} of ${sent + failed}${failed ? ` (${failed} failed)` : ""}.`);
      setMailSubject(""); setMailMessage("");
    } finally {
      setMailing(false);
    }
  }

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (mode === "day") params.set("date", selectedDay);
    else if (filterDate) params.set("date", filterDate);
    else if (view === "past") params.set("past", "true");
    if (filterLocation) params.set("location", filterLocation);
    if (filterStatus) params.set("status", filterStatus);
    params.set("page", String(page));

    const res = await fetch(`/api/admin/bookings?${params}`);
    const data = await res.json();
    setBookings(data.bookings || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [mode, selectedDay, filterDate, filterLocation, filterStatus, view, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Calendar dots: per-day counts for the month on show, for the chosen branch.
  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    const params = new URLSearchParams({ month: `${calYear}-${String(calMonth + 1).padStart(2, "0")}` });
    if (filterLocation) params.set("location", filterLocation);
    try {
      const res = await fetch(`/api/admin/calendar?${params}`);
      const data = await res.json();
      const map: Record<string, CalDay> = {};
      for (const e of (data.dates || []) as CalDay[]) map[e.date] = { date: e.date, count: e.count, totalCovers: e.totalCovers };
      setCalMap(map);
    } catch {
      setCalMap({});
    } finally {
      setCalLoading(false);
    }
  }, [calYear, calMonth, filterLocation]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.stats && setStats(d.stats))
      .catch(() => {});
  }, []);

  async function updateStatus(bookingId: string, newStatus: string) {
    setUpdating(bookingId);
    await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdating(null);
    fetchBookings();
    fetchCalendar();
  }

  function pickDay(ds: string) {
    setSelectedDay(ds);
    setMode("day");
    setPage(1);
    setExpanded(null);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) setDaySheet(true);
  }

  function shiftMonth(n: number) {
    const d = new Date(calYear, calMonth + n, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  }

  // Month grid, Monday first
  const cells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const startGap = firstDay === 0 ? 6 : firstDay - 1;
    const out: (string | null)[] = [];
    for (let i = 0; i < startGap; i++) out.push(null);
    for (let d = 1; d <= totalDays; d++) out.push(`${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [calYear, calMonth]);

  const monthCount = Object.values(calMap).reduce((n, e) => n + e.count, 0);
  const comingUp = Object.values(calMap)
    .filter((e) => e.date > today && e.count > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const dayEntry = calMap[selectedDay];
  const hasFilters = Boolean(filterDate || filterLocation || filterStatus);

  function setLocation(v: string) {
    setFilterLocation(v);
    setPage(1);
  }

  function statusSelect(b: BookingRow, size = "h-9") {
    return (
      <select
        value=""
        aria-label={`Update status for ${b.guest.name}`}
        onChange={(e) => {
          e.stopPropagation();
          if (e.target.value) updateStatus(b.id, e.target.value);
        }}
        onClick={(e) => e.stopPropagation()}
        disabled={updating === b.id}
        className={`${updSelBase} ${size}`}
      >
        <option value="">{updating === b.id ? "Updating…" : "Update"}</option>
        {STATUS_OPTIONS.filter((s) => s !== b.status).map((s) => (
          <option key={s} value={s}>
            → {statusLabel(s)}
          </option>
        ))}
      </select>
    );
  }

  function detailItems(b: BookingRow) {
    return (
      <>
        <Detail label="Phone">{b.guest.phone || "Not given"}</Detail>
        <Detail label="Email">{b.guest.email || "Not given"}</Detail>
        <Detail label="Code">{b.confirmationCode}</Detail>
        <Detail label="Source"><span className="capitalize">{b.source}</span></Detail>
        <Detail label="Deposit">
          {b.depositAmountPence > 0 ? `£${(b.depositAmountPence / 100).toFixed(2)} (${b.depositStatus})` : "None"}
        </Detail>
        <Detail label="Booked">{new Date(b.createdAt).toLocaleDateString("en-GB")}</Detail>
        <Detail label="Time slot">{b.slot}</Detail>
      </>
    );
  }

  function extras(b: BookingRow) {
    if (!b.notes && b.addOns.length === 0) return null;
    return (
      <div className="space-y-2">
        {b.notes && <Detail label="Notes">{b.notes}</Detail>}
        {b.addOns.length > 0 && (
          <div>
            <div className="text-[11px] font-light text-stone-500">Add-ons</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {b.addOns.map((a, i) => (
                <Tag key={i} tone="gold">
                  {a.name} (£{(a.pricePence / 100).toFixed(2)})
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function notesLine(b: BookingRow) {
    return (
      <span className={`mt-0.5 flex items-center gap-1.5 text-[13px] ${b.notes ? "text-ember-700" : "font-light text-stone-500"}`}>
        <StickyNote className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        <span className="truncate">{b.notes || "No requirements"}</span>
      </span>
    );
  }

  // One booking card (phones and iPad portrait, and the slide-up day panel).
  function renderCard(b: BookingRow) {
      const open = expanded === b.id;
      return (
        <article key={b.id} className={`min-w-0 rounded-[22px] p-4 text-stone-900 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.6)] transition-colors ${open ? "bg-ember-50" : "bg-white"}`}>
          <button
            type="button"
            onClick={() => setExpanded(open ? null : b.id)}
            aria-expanded={open}
            className="block w-full text-left"
          >
            <div className="flex items-start gap-3">
              <Avatar name={b.guest.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px]">{b.guest.name}</div>
                <div className="text-xs font-light text-stone-500">
                  {b.date === today ? "Today" : dayLabel(b.date)} · {b.time}
                </div>
              </div>
              <Tag tone={statusTone(b.status)}>{statusLabel(b.status)}</Tag>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
                {b.partySize}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
                {b.location}
              </span>
              {mode === "all" && (() => {
                const t = dayTag(b.date);
                return <span className={`rounded-full px-2 py-0.5 text-[10px] ${t.cls}`}>{t.label}</span>;
              })()}
            </div>
            <div className="mt-1.5">{notesLine(b)}</div>
          </button>

          {open && (
            <div className="mt-3 border-t border-stone-100 pt-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">{detailItems(b)}</div>
              {(b.notes || b.addOns.length > 0) && <div className="mt-3">{extras(b)}</div>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {b.guest.phone ? (
                  <a href={`tel:${b.guest.phone.replace(/\s+/g, "")}`} className={`${callBtnBase} h-11`}>
                    <Phone className="h-4 w-4" strokeWidth={1.75} />
                    Call
                  </a>
                ) : (
                  <span className="flex h-11 items-center justify-center rounded-full bg-stone-100 text-[13px] text-stone-500">No phone</span>
                )}
                {statusSelect(b, "h-11 w-full text-center")}
              </div>
            </div>
          )}
        </article>
      );
  }

  const listTitle = mode === "day" ? (selectedDay === today ? `Today, ${dayLabel(selectedDay)}` : dayLabel(selectedDay)) : "All bookings";
  const listSub =
    mode === "day"
      ? `${plural(total, "booking", "bookings")}${dayEntry ? ` · ${plural(dayEntry.totalCovers, "cover", "covers")}` : ""}`
      : `${total} total`;
  const cols = mode === "all" ? 7 : 6;

  return (
    <OwnLayout>
      <PageHead
        title="Table bookings"
        subtitle="Website bookings for Cricklewood and Streatham Hill"
        actions={
          <>
            <label className="relative">
              <span className="sr-only">Branch</span>
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white" strokeWidth={1.5} />
              <select value={filterLocation} onChange={(e) => setLocation(e.target.value)} className={`${btn.glass} appearance-none pl-10 pr-10`}>
                <option className="text-stone-900" value="">All branches</option>
                <option className="text-stone-900" value="cricklewood">Cricklewood</option>
                <option className="text-stone-900" value="streatham">Streatham Hill</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white" strokeWidth={1.5} />
            </label>
            <button onClick={() => { setMailOpen((v) => !v); setMailNote(""); }} className={btn.primary} aria-expanded={mailOpen}>
              <Mail className="h-[18px] w-[18px]" strokeWidth={1.5} />
              Email past guests
            </button>
          </>
        }
      />

      <GlassStats
        items={[
          { label: "Today's bookings", value: stats ? stats.todayBookings : "…" },
          { label: "Today's covers", value: stats ? stats.todayCovers : "…" },
          { label: "Next 7 days", value: stats ? stats.upcomingNext7Days : "…" },
          { label: "30d bookings", value: stats ? stats.totalBookings30d : "…" },
          { label: "No-show rate", value: stats ? stats.noShowRate : "…" },
        ]}
      />

      {mailOpen && (
        <Sheet label="Email past guests" className="mb-4 p-5 md:p-6">
          <SheetTitle
            aside={
              <button onClick={() => { setMailOpen(false); setMailNote(""); }} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:text-stone-900">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            }
          >
            Email everyone who has dined with us
          </SheetTitle>
          <p className="mt-1 mb-4 max-w-3xl text-[13px] font-light text-stone-500">
            Goes to {mailCount ?? "…"} {mailCount === 1 ? "person" : "people"} whose booking date has already passed, one email each even if they came more than once. Upcoming bookings, cancellations and no-shows are left out. Sent from your normal bookings address.
          </p>
          <div className="mb-4">
            <Seg
              label="Which guests"
              value={mailLocation}
              onChange={setMailLocation}
              options={[
                { value: "", label: "All locations" },
                { value: "cricklewood", label: "Cricklewood" },
                { value: "streatham", label: "Streatham Hill" },
              ]}
            />
          </div>
          {/* Saved emails for this screen. One click fills the form; you still press Send. */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {mailTemplates.map((t) => (
              <button
                key={t.key}
                onClick={() => { setMailSubject(t.subject); setMailMessage(t.body); setMailNote(`Loaded "${t.name}".`); }}
                className={btn.small}
              >
                {t.name}
              </button>
            ))}
            <button
              onClick={saveMailTemplate}
              disabled={!mailSubject.trim() || !mailMessage.trim()}
              className="inline-flex h-8 items-center rounded-full border border-stone-300 bg-white px-3 text-[13px] text-stone-900 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-500"
            >
              + Save current
            </button>
          </div>
          <div className="space-y-2.5">
            <input value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} placeholder="Subject" className={field} />
            <textarea
              value={mailMessage} onChange={(e) => setMailMessage(e.target.value)} rows={6}
              placeholder="Your message. Line breaks are kept. Each guest is greeted by their first name automatically."
              className={`${fieldArea} resize-y`}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={sendMailPast} disabled={mailing || !mailCount} className={btn.primary}>
              {mailing ? "Sending…" : `Send to ${mailCount ?? "…"}`}
            </button>
            <button onClick={() => { setMailOpen(false); setMailNote(""); }} className={btn.light}>Cancel</button>
            {mailNote && <span className="text-[13px] text-stone-500">{mailNote}</span>}
          </div>
        </Sheet>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Month calendar */}
        <Sheet label="Booking calendar" className="p-4 md:p-5 lg:sticky lg:top-[96px] lg:self-start">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <h2 className="font-outfit text-xl font-normal tracking-tight">{MONTH_NAMES[calMonth]} {calYear}</h2>
              <p className="mt-0.5 text-xs font-light text-stone-500">
                {calLoading ? "Loading…" : `${plural(monthCount, "booking", "bookings")} this month · each dot is a booking`}
              </p>
            </div>
            <div className="ml-auto flex gap-1.5">
              <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900">
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button onClick={() => shiftMonth(1)} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900">
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 md:gap-1.5">
            {DAY_LETTERS.map((d, i) => (
              <div key={i} className="pb-1 text-center text-[11px] font-light text-stone-500">{d}</div>
            ))}
            {cells.map((ds, i) => {
              if (!ds) return <div key={`e${i}`} />;
              const entry = calMap[ds];
              const isSel = mode === "day" && ds === selectedDay;
              const isToday = ds === today;
              const isPast = ds < today;
              const n = entry?.count || 0;
              return (
                <button
                  key={ds}
                  onClick={() => pickDay(ds)}
                  aria-pressed={isSel}
                  aria-label={`${dayLabel(ds)}, ${plural(n, "booking", "bookings")}`}
                  className={`flex h-11 md:h-12 lg:h-11 xl:h-12 flex-col items-center justify-center gap-1 rounded-[14px] text-sm transition ${
                    isSel
                      ? "bg-stone-900 text-white"
                      : isToday
                      ? "bg-white text-stone-900 ring-1 ring-inset ring-stone-900"
                      : `bg-stone-100 hover:bg-stone-200 ${isPast ? "text-stone-500" : "text-stone-900"}`
                  }`}
                >
                  <span className="leading-none">{Number(ds.slice(8))}</span>
                  <span className="flex h-2 items-center gap-[3px]">
                    {Array.from({ length: Math.min(n, 4) }).map((_, j) => (
                      <i key={j} className={`h-1.5 w-1.5 rounded-full ${isSel ? "bg-honey-300" : "bg-ember-400"}`} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          {comingUp.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[13px] text-stone-900">Coming up</h3>
              <ul className="mt-1">
                {comingUp.map((e) => (
                  <li key={e.date}>
                    <button onClick={() => pickDay(e.date)} className="flex w-full items-center border-t border-stone-100 py-2.5 text-left text-[13px] hover:text-stone-900">
                      <span>{dayLabel(e.date)}</span>
                      <span className="ml-auto text-xs font-light text-stone-500">
                        {plural(e.count, "booking", "bookings")} · {plural(e.totalCovers, "cover", "covers")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Sheet>

        {/* Bookings list: a white sheet on iPad landscape and desktop, cards on the photo below that */}
        <section
          aria-label="Bookings"
          className="min-w-0 lg:rounded-[22px] lg:bg-white lg:text-stone-900 lg:shadow-[0_20px_50px_-30px_rgba(0,0,0,0.6)]"
        >
          <div className="flex flex-wrap items-center gap-3 pb-3 pt-2 lg:px-5 lg:pt-5">
            <div className="min-w-0">
              <h2 className="font-outfit text-[22px] font-normal tracking-tight text-white lg:text-stone-900 [text-shadow:0_1px_12px_rgba(0,0,0,0.3)] lg:[text-shadow:none]">
                {listTitle}
              </h2>
              <p className="text-xs font-light text-white/85 lg:text-stone-500">{listSub}</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Seg
                label="Show"
                value={mode}
                onChange={(v) => { setMode(v); setPage(1); setExpanded(null); }}
                options={[
                  { value: "day", label: "Day" },
                  { value: "all", label: "All bookings" },
                ]}
              />
              <select
                value={filterStatus}
                aria-label="Status"
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className={smallSel}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(mode === "all" || hasFilters) && (
            <div className="flex flex-wrap items-center gap-2 pb-3 lg:px-5">
              {mode === "all" && (
                <>
                  {/* Upcoming / Past (only when no specific date is picked) */}
                  <Seg
                    label="When"
                    value={(filterDate ? "none" : view) as "upcoming" | "past"}
                    onChange={(v) => { setView(v); setFilterDate(""); setPage(1); }}
                    options={[
                      { value: "upcoming", label: "Upcoming" },
                      { value: "past", label: "Past" },
                    ]}
                  />
                  <DateField
                    value={filterDate}
                    onChange={(v) => {
                      setFilterDate(v);
                      setPage(1);
                    }}
                    placeholder="Any date"
                    allowClear
                    className="!w-auto"
                  />
                </>
              )}
              {hasFilters && (
                <button
                  onClick={() => {
                    setFilterDate("");
                    setFilterLocation("");
                    setFilterStatus("");
                    setPage(1);
                  }}
                  className="h-9 rounded-full px-3 text-[13px] text-white/90 underline-offset-2 hover:underline lg:text-stone-500 lg:hover:text-stone-900"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="rounded-[22px] bg-white lg:rounded-none lg:bg-transparent">
              <Empty>Loading bookings…</Empty>
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-[22px] bg-white lg:rounded-none lg:bg-transparent">
              <Empty>{mode === "day" ? "No bookings on this day" : "No bookings found"}</Empty>
            </div>
          ) : (
            <>
              {/* Table: iPad landscape and desktop */}
              <div className={`hidden lg:block ${tableWrap}`}>
                <table className={`${table} [&_td:first-child]:pl-5 [&_th:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:last-child]:pr-5`}>
                  <thead>
                    <tr>
                      {mode === "all" && <th>Date</th>}
                      <th>Time</th>
                      <th>Guest and requirements</th>
                      <th>Location</th>
                      <th>Party</th>
                      <th>Status</th>
                      <th><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => {
                      const open = expanded === b.id;
                      return (
                        <Fragment key={b.id}>
                          <tr
                            className={`cursor-pointer transition-colors ${open ? "bg-ember-50" : "hover:bg-stone-50"}`}
                            onClick={() => setExpanded(open ? null : b.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setExpanded(open ? null : b.id);
                            }}
                            tabIndex={0}
                            aria-expanded={open}
                          >
                            {mode === "all" && (
                              <td className="whitespace-nowrap">
                                <div className="text-[13px]">{dayLabel(b.date)}</div>
                                {(() => {
                                  const t = dayTag(b.date);
                                  return <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${t.cls}`}>{t.label}</span>;
                                })()}
                              </td>
                            )}
                            <td className="whitespace-nowrap text-base">{b.time}</td>
                            <td className="max-w-[280px]">
                              <div className="flex items-center gap-3">
                                <Avatar name={b.guest.name} />
                                <div className="min-w-0">
                                  <div className="flex items-baseline gap-2">
                                    <span className="truncate">{b.guest.name}</span>
                                    <span className="shrink-0 text-[11px] text-stone-500">{b.confirmationCode}</span>
                                  </div>
                                  {notesLine(b)}
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap">{b.location}</td>
                            <td className="whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
                                {b.partySize}
                              </span>
                            </td>
                            <td>
                              <Tag tone={statusTone(b.status)}>{statusLabel(b.status)}</Tag>
                            </td>
                            <td className="text-right">{statusSelect(b)}</td>
                          </tr>

                          {/* Expanded detail */}
                          {open && (
                            <tr className="bg-ember-50">
                              <td colSpan={cols} className="!border-t-0 !pt-0">
                                <div className="rounded-[18px] bg-white px-4 py-3.5">
                                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                                    {detailItems(b)}
                                    {b.guest.phone && (
                                      <a href={`tel:${b.guest.phone.replace(/\s+/g, "")}`} onClick={(e) => e.stopPropagation()} className={`${callBtnBase} h-9 ml-auto`}>
                                        <Phone className="h-4 w-4" strokeWidth={1.75} />
                                        Call
                                      </a>
                                    )}
                                  </div>
                                  {(b.notes || b.addOns.length > 0) && <div className="mt-3 border-t border-stone-100 pt-3">{extras(b)}</div>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards: phones and iPad portrait */}
              <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 md:grid-cols-2 lg:hidden">
                {bookings.map((b) => renderCard(b))}
              </div>
            </>
          )}

          {/* Footer: hint and pagination */}
          {(mode === "day" || totalPages > 1) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] lg:mt-0 lg:border-t lg:border-stone-100 lg:px-5 lg:py-3">
              {mode === "day" && (
                <span className="font-light text-white/85 lg:text-stone-500">Tap a day on the calendar to see its bookings</span>
              )}
              {totalPages > 1 && (
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={btn.small}>
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                    Previous
                  </button>
                  <span className="px-1 text-white/90 lg:text-stone-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-stone-900 px-3 text-[13px] text-white transition hover:bg-black disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <BottomSheet
        open={daySheet}
        onClose={() => setDaySheet(false)}
        title={selectedDay === today ? `Today, ${dayLabel(selectedDay)}` : dayLabel(selectedDay)}
        subtitle={loading ? "Loading…" : `${plural(total, "booking", "bookings")}${dayEntry ? ` · ${plural(dayEntry.totalCovers, "cover", "covers")}` : ""}`}
      >
        {loading ? (
          <p className="py-10 text-center text-sm font-light text-stone-500">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="py-10 text-center text-sm font-light text-stone-500">No bookings on this day</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{bookings.map((b) => renderCard(b))}</div>
        )}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2 text-[13px]">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={btn.small}>
              Previous
            </button>
            <span className="text-stone-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className={btn.small}>
              Next
            </button>
          </div>
        )}
      </BottomSheet>
    </OwnLayout>
  );
}
