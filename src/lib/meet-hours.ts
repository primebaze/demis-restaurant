/** Shared bits for hours: minutes between times, and turning timesheets into shift rows. */
import type { Timesheet } from "@/lib/clockin";
import { prisma } from "@/lib/prisma";
import { londonToday, mondayOf } from "@/lib/meet-rota";

export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Minutes from start to end; an end before the start means past midnight. */
export function spanMinutes(start: string, end: string): number {
  let m = toMin(end) - toMin(start);
  if (m <= 0) m += 1440;
  return m;
}

export const fmtHM = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(Math.round(minutes % 60)).padStart(2, "0")}m`;

/** A day's hours as the clock-in app would count them if one shift's times were replaced. */
export function dayHoursWithFix(sheet: Timesheet | undefined, date: string, wasStart: string, start: string, end: string): number {
  const day = sheet?.days.find((d) => d.date === date);
  const others = (day?.shifts || []).filter((s) => s.in !== wasStart);
  const otherMin = others.reduce((n, s) => n + (s.out ? spanMinutes(s.in, s.out) : 0), 0);
  return Math.round(((otherMin + spanMinutes(start, end)) / 60) * 100) / 100;
}

/* ─── Hours fixes: one a week ───
 * Staff can ask for one fix a week (Monday to Sunday, by when they asked). A second one in the
 * same week is allowed after a warning, and puts them on the watch list: anyone who asked more
 * than once in a week in the last 8 weeks. It clears by itself after that. */

const WATCH_WEEKS = 8;
const askedWeek = (d: Date) => mondayOf(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d));

/** How many fixes this person has asked for this week (declined ones count: they were still asked). */
export async function fixesThisWeek(clockinId: number): Promise<number> {
  const monday = mondayOf(londonToday());
  const recent = await prisma.meetHoursFix.findMany({ where: { clockinId, createdAt: { gte: new Date(Date.now() - 8 * 86400_000) } }, select: { createdAt: true } });
  return recent.filter((f) => askedWeek(f.createdAt) === monday).length;
}

/** Everyone on the watch list, with how many weeks they asked more than once. */
export async function hoursWatchList(): Promise<Map<number, number>> {
  const since = new Date(Date.now() - WATCH_WEEKS * 7 * 86400_000);
  const fixes = await prisma.meetHoursFix.findMany({ where: { createdAt: { gte: since } }, select: { clockinId: true, createdAt: true } });
  const perWeek = new Map<string, number>();
  for (const f of fixes) {
    const k = `${f.clockinId}|${askedWeek(f.createdAt)}`;
    perWeek.set(k, (perWeek.get(k) || 0) + 1);
  }
  const out = new Map<number, number>();
  perWeek.forEach((n, k) => {
    if (n < 2) return;
    const id = Number(k.split("|")[0]);
    out.set(id, (out.get(id) || 0) + 1);
  });
  return out;
}

/** Was this fix the second (or later) one its person asked for that week? */
export async function repeatFixIds(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const these = await prisma.meetHoursFix.findMany({ where: { id: { in: ids } }, select: { id: true, clockinId: true, createdAt: true } });
  const people = Array.from(new Set(these.map((f) => f.clockinId)));
  const all = await prisma.meetHoursFix.findMany({ where: { clockinId: { in: people }, createdAt: { gte: new Date(Date.now() - 120 * 86400_000) } }, select: { id: true, clockinId: true, createdAt: true } });
  const out = new Set<string>();
  for (const f of these) {
    const week = askedWeek(f.createdAt);
    const earlier = all.filter((o) => o.clockinId === f.clockinId && o.id !== f.id && askedWeek(o.createdAt) === week && o.createdAt < f.createdAt);
    if (earlier.length) out.add(f.id);
  }
  return out;
}
