"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, DoorOpen, Mail, Phone, StickyNote, Users } from "lucide-react";
import { PageHead, Tag, btn, statusLabel, statusTone } from "@/components/admin/ui";

interface TodayBooking {
  id: string;
  confirmationCode: string;
  guest: string;
  phone: string;
  email: string;
  location: string;
  time: string;
  slot: string;
  partySize: number;
  status: string;
  notes: string;
  type: string;
}

interface EventDay {
  date: string;
  location: string;
  hours: string;
  bookings: number;
  people: number;
}

interface DashboardData {
  today: { date: string; isToday: boolean; bookings: TodayBooking[]; totalCovers: number; totalBookings: number };
  stats: {
    todayBookings: number;
    todayCovers: number;
    totalBookings30d: number;
    noShowRate: string;
    totalCovers30d: number;
    depositsCapturedPence: number;
    upcomingNext7Days: number;
    totalGuests: number;
  };
  serviceDate?: string;
  dineIn?: { slug: string; name: string; covers: number; tables: number }[];
  events?: { feast: EventDay; buffet: EventDay };
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().split("T")[0];
}

function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
}

function whenLabel(dateStr: string, today?: string) {
  if (today && dateStr === today) return `Today, ${dayLabel(dateStr)}`;
  if (today && dateStr === addDays(today, 1)) return `Tomorrow, ${dayLabel(dateStr)}`;
  return dayLabel(dateStr);
}

const gtag = "inline-flex h-5 items-center rounded-full border border-white/20 bg-white/[0.18] px-2 text-[11px] whitespace-nowrap";

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const [email, setEmail] = useState<{
    to: string; name: string; subject: string; message: string; provider: "smtp" | "resend"; sending: boolean; error: string; success: string;
  } | null>(null);

  const load = useCallback(
    (quiet = false) => {
      const url = selectedDate ? `/api/admin/dashboard?date=${selectedDate}` : "/api/admin/dashboard";
      if (!quiet) setDayLoading(true);
      return fetch(url)
        .then((r) => r.json())
        .then(setData)
        .finally(() => {
          setLoading(false);
          setDayLoading(false);
        });
    },
    [selectedDate]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Live numbers: refresh quietly every 30 seconds while the page is open.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function sendEmail() {
    if (!email) return;
    if (!email.subject.trim()) return setEmail((e) => e && { ...e, error: "Subject is required" });
    if (!email.message.trim()) return setEmail((e) => e && { ...e, error: "Message is required" });
    setEmail((e) => e && { ...e, sending: true, error: "" });
    try {
      const res = await fetch("/api/admin/email/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.to, subject: email.subject, message: email.message, provider: email.provider }),
      });
      const d = await res.json();
      if (!res.ok || d.failed) {
        setEmail((e) => e && { ...e, sending: false, error: d.error || "Failed to send" });
      } else {
        setEmail((e) => e && { ...e, sending: false, success: "Email sent" });
        setTimeout(() => setEmail(null), 1800);
      }
    } catch {
      setEmail((e) => e && { ...e, sending: false, error: "Failed to send" });
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-white/85 font-light">Loading dashboard…</div>;
  }
  if (!data) return null;

  const today = data.serviceDate;
  const viewing = data.today.date;
  const isToday = data.today.isToday;

  return (
    <div className="lg:flex lg:min-h-[calc(100vh-140px)] lg:flex-col">
      <PageHead title="Overview" />

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,600px)]">
        <div className="hidden lg:block" />

        {/* Today's bookings */}
        <section aria-label="Bookings for the day" className="glass flex flex-col rounded-[22px] px-3 pb-2 pt-4 text-white lg:max-h-[420px] self-start">
          <div className="flex flex-wrap items-center gap-2 px-2">
            <h2 className="text-[22px] font-light">{isToday ? "Today's bookings" : `Bookings, ${dayLabel(viewing)}`}</h2>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setSelectedDate(addDays(viewing, -1))}
                aria-label="Previous day"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.14] hover:bg-white/25"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              {!isToday && (
                <button onClick={() => setSelectedDate(null)} className="h-9 rounded-full border border-white/20 bg-white/[0.14] px-3 text-[13px] font-light hover:bg-white/25">
                  Today
                </button>
              )}
              <button
                onClick={() => setSelectedDate(addDays(viewing, 1))}
                aria-label="Next day"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.14] hover:bg-white/25"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <Link href="/admin/bookings" className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.14] px-3 text-[13px] font-light hover:bg-white/25">
                See all
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-2.5 text-[13px] font-light">
            <span className={`${gtag} h-[26px] px-3 text-[13px]`}><b className="mr-1 font-medium">{data.today.totalBookings}</b>{data.today.totalBookings === 1 ? "booking" : "bookings"}</span>
            <span className={`${gtag} h-[26px] px-3 text-[13px]`}><b className="mr-1 font-medium">{data.today.totalCovers}</b>{data.today.totalCovers === 1 ? "cover" : "covers"}</span>
            <span className={`${gtag} h-[26px] px-3 text-[13px]`}><b className="mr-1 font-medium">{data.stats.upcomingNext7Days}</b>in the next 7 days</span>
          </div>

          <div className={`min-h-0 flex-1 overflow-y-auto transition-opacity ${dayLoading ? "opacity-50" : ""}`}>
            {data.today.bookings.length === 0 ? (
              <p className="px-3 py-10 text-center font-light text-white/80">No bookings for this day</p>
            ) : (
              data.today.bookings.map((b, i) => {
                const open = openRow === b.id;
                return (
                  <div
                    key={b.id}
                    tabIndex={0}
                    onClick={() => setOpenRow(open ? null : b.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenRow(open ? null : b.id);
                      }
                    }}
                    aria-expanded={open}
                    className={`bk ${open ? "open" : ""} cursor-pointer rounded-2xl px-3 outline-none transition-colors hover:bg-white/[0.14] focus-visible:bg-white/[0.14] ${open ? "bg-white/[0.14]" : ""} ${i > 0 ? "border-t border-white/10" : ""}`}
                  >
                    <div className="grid min-h-[54px] grid-cols-[52px_1fr_auto_18px] md:grid-cols-[56px_1fr_auto_110px_18px] items-center gap-2.5 py-1.5">
                      <span className="text-base">{b.time || "All day"}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate">{b.guest}</span>
                          <span className={gtag}>{b.type}</span>
                        </span>
                        <span className={`mt-0.5 flex items-center gap-1.5 text-xs font-light ${b.notes ? "text-gold-200" : "text-white/60"}`}>
                          <StickyNote className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                          <span className="truncate">{b.notes || "No requirements"}</span>
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4" strokeWidth={1.5} />
                        {b.partySize}
                      </span>
                      <span className="hidden md:block truncate text-[13px] font-light text-white/85">{b.location}</span>
                      <ChevronDown className="bk-chev h-4 w-4 opacity-70" strokeWidth={1.75} />
                    </div>
                    <div className="bk-more">
                      <div>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-3 pl-0 md:pl-[66px] text-xs font-light">
                          <span><span className="opacity-70">Code</span> {b.confirmationCode}</span>
                          <span><span className="opacity-70">Time</span> {b.slot}</span>
                          <span className="md:hidden"><span className="opacity-70">Where</span> {b.location}</span>
                          <Tag tone={statusTone(b.status)}>{statusLabel(b.status)}</Tag>
                          <span className="ml-auto flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {b.phone && (
                              <a href={`tel:${b.phone.replace(/\s+/g, "")}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs text-stone-900">
                                <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                                {b.phone}
                              </a>
                            )}
                            {b.email && (
                              <button
                                onClick={() => setEmail({ to: b.email, name: b.guest, subject: "", message: "", provider: "smtp", sending: false, error: "", success: "" })}
                                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs text-stone-900"
                              >
                                <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
                                Email
                              </button>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Plain numbers */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:mt-auto lg:pt-4 xl:grid-cols-4">
        <section aria-label="Last 30 days" className="rounded-[22px] bg-white p-[18px] text-stone-900">
          <h2 className="text-[21px] font-normal tracking-tight whitespace-nowrap">Last 30 days</h2>
          <div className="mt-3.5 flex h-[50px] items-center rounded-full bg-stone-100 pl-4 pr-1.5">
            <span className="text-sm font-light text-stone-500">Bookings</span>
            <span className="ml-2 text-[21px]">{data.stats.totalBookings30d}</span>
            <Link href="/admin/bookings" aria-label="Open table bookings" className="ml-auto flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gold-300 text-ink-900 hover:bg-gold-200">
              <ArrowUpRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </Link>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-[18px] bg-gold-300 p-3 text-ink-900">
              <div className="text-xs font-light whitespace-nowrap">Covers</div>
              <div className="mt-1 text-[22px]">{data.stats.totalCovers30d}</div>
            </div>
            {[
              ["No-shows", data.stats.noShowRate],
              ["Total guests", data.stats.totalGuests],
              ["Deposits", `£${(data.stats.depositsCapturedPence / 100).toFixed(2)}`],
            ].map(([l, v]) => (
              <div key={String(l)} className="rounded-[18px] bg-stone-100 p-3">
                <div className="text-xs font-light text-stone-500 whitespace-nowrap">{l}</div>
                <div className="mt-1 text-[22px]">{v}</div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Dine-in today, live" className="rounded-[22px] bg-white p-[18px] text-stone-900">
          <div className="flex items-center gap-2">
            <h2 className="text-[21px] font-normal tracking-tight">Dine-in</h2>
            <span className="ml-auto inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-xs text-emerald-700">
              <i className="live-dot h-[7px] w-[7px] rounded-full bg-emerald-600" />
              Live
            </span>
          </div>
          <p className="mt-0.5 mb-3 text-[13px] font-light text-stone-500">Guests dining today, from the door tablets</p>
          {(data.dineIn || []).map((d) => (
            <Link key={d.slug} href={`/admin/door/${d.slug}`} className="flex items-end justify-between border-t border-stone-100 py-3.5 hover:opacity-80">
              <div>
                <div className="text-[15px]">{d.name}</div>
                <div className="mt-0.5 text-xs font-light text-stone-500">{d.tables ? `across ${d.tables} ${d.tables === 1 ? "table" : "tables"}` : "Nobody checked in yet"}</div>
              </div>
              <div className="text-[40px] font-light leading-none tracking-tight">{d.covers}</div>
            </Link>
          ))}
          {!data.dineIn?.length && (
            <p className="flex items-center gap-2 border-t border-stone-100 py-4 text-sm text-stone-500">
              <DoorOpen className="h-4 w-4" strokeWidth={1.5} /> Nothing logged yet today
            </p>
          )}
        </section>

        {(
          [
            ["Sunday Feast", "/admin/saturday-brunch", data.events?.feast],
            ["Sunday Buffet", "/admin/sunday-buffet", data.events?.buffet],
          ] as const
        ).map(([name, href, ev]) => (
          <section key={name} aria-label={name} className="rounded-[22px] bg-white p-[18px] text-stone-900">
            <div className="flex items-center">
              <h2 className="text-[21px] font-normal tracking-tight whitespace-nowrap">{name}</h2>
              <Link href={href} aria-label={`Open ${name}`} className="ml-auto text-stone-600 hover:text-stone-900">
                <ArrowUpRight className="h-[22px] w-[22px]" strokeWidth={1.5} />
              </Link>
            </div>
            {ev ? (
              <>
                <span className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-stone-100 px-3 text-xs text-stone-600">
                  <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {whenLabel(ev.date, today)}
                </span>
                <p className="mt-2 text-xs font-light text-stone-500">
                  {ev.location} · {ev.hours}
                </p>
                <div className="mt-4 flex items-baseline justify-between border-t border-stone-100 py-3">
                  <span className="text-[15px]">Bookings</span>
                  <span className="text-[40px] font-light leading-none tracking-tight">{ev.bookings}</span>
                </div>
                <div className="flex items-baseline justify-between border-t border-stone-100 py-3">
                  <span className="text-[15px]">People</span>
                  <span className="text-[40px] font-light leading-none tracking-tight text-gold-700">{ev.people}</span>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-stone-500">No bookings yet</p>
            )}
          </section>
        ))}
      </div>

      {/* Email a guest */}
      {email && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setEmail(null)}>
          <div className="w-full max-w-lg rounded-[24px] bg-white p-6 text-stone-900" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Email guest">
            <h2 className="text-xl font-normal">Email guest</h2>
            <p className="mb-4 mt-1 text-xs text-stone-500">
              To: {email.name} &lt;{email.to}&gt;
            </p>
            <div className="space-y-2.5">
              <input
                type="text"
                value={email.subject}
                onChange={(e) => setEmail((s) => s && { ...s, subject: e.target.value })}
                placeholder="Subject"
                className="h-11 w-full rounded-full border border-stone-200 bg-stone-50 px-4 text-sm outline-none focus:border-gold-400"
                autoFocus
              />
              <textarea
                value={email.message}
                onChange={(e) => setEmail((s) => s && { ...s, message: e.target.value })}
                rows={6}
                placeholder="Write your message…"
                className="w-full resize-none rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-gold-400"
              />
              <div className="inline-flex rounded-full bg-stone-100 p-1" role="group" aria-label="Send with">
                {(["smtp", "resend"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEmail((s) => s && { ...s, provider: p })}
                    className={`h-8 rounded-full px-4 text-[13px] ${email.provider === p ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
                  >
                    {p === "smtp" ? "SMTP" : "Resend"}
                  </button>
                ))}
              </div>
            </div>
            {email.error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{email.error}</p>}
            {email.success && <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{email.success}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={sendEmail} disabled={email.sending} className={btn.primary}>
                {email.sending ? "Sending…" : "Send"}
              </button>
              <button onClick={() => setEmail(null)} className={btn.light}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
