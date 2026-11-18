/**
 * Rota for Demi's Meetings. Shifts live in the clock-in app (src/lib/clockin.ts);
 * this adds what it doesn't have: which branch a shift is at, and publishing
 * (what staff were sent, and who has seen it). Weeks run Monday to Sunday,
 * London time, like the clock-in app.
 */
import { prisma } from "@/lib/prisma";
import { getShifts, type ClockinShift, type ClockinStaff } from "@/lib/clockin";

export const BRANCHES = ["cricklewood", "streatham"] as const;
export type Branch = (typeof BRANCHES)[number];
export const isBranch = (b: unknown): b is Branch => b === "cricklewood" || b === "streatham";

/** Today in London as YYYY-MM-DD. */
export function londonToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Add days to a YYYY-MM-DD date. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The Monday on or before a date. */
export function mondayOf(date: string): string {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 Sun .. 6 Sat
  return addDays(date, day === 0 ? -6 : 1 - day);
}

export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));
export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Hours in a shift; an end before the start runs past midnight. */
export function shiftHours(start: string, end: string): number {
  let d = mins(end) - mins(start);
  if (d <= 0) d += 24 * 60;
  return Math.round((d / 60) * 100) / 100;
}

const key = (s: ClockinShift) => `${s.staffId}|${s.date}|${s.start}|${s.end}`;

/**
 * Shifts for one branch's week. A shift belongs to the branch it was given; older
 * shifts with no branch follow the person's branch (or show in both if theirs is
 * "both" or not set).
 */
export async function branchWeek(branch: Branch, monday: string, staff: ClockinStaff[]) {
  const shifts = await getShifts(monday, addDays(monday, 6));
  const tags = await prisma.meetShiftBranch.findMany({ where: { shiftId: { in: shifts.map((s) => s.id) } } });
  const tagOf = new Map(tags.map((t) => [t.shiftId, t.branch]));
  const extras = await prisma.meetStaff.findMany();
  const homeOf = new Map(extras.map((e) => [e.clockinId, e.branch]));
  const known = new Set(staff.map((s) => s.id));

  const inBranch = shifts.filter((s) => {
    if (!known.has(s.staffId)) return false;
    const tag = tagOf.get(s.id);
    if (tag) return tag === branch;
    const home = homeOf.get(s.staffId) || "";
    return home === branch || home === "both" || home === "";
  });
  return { shifts: inBranch, homeOf };
}

/** The latest publish of this week for this branch, and how many people's shifts changed since. */
export async function publishState(branch: Branch, monday: string, current: ClockinShift[]) {
  const last = await prisma.meetRotaPublish.findFirst({ where: { branch, weekStart: monday }, orderBy: { publishedAt: "desc" } });
  if (!last) return { last: null, changedPeople: [] as number[] };
  const before = new Set((last.snapshot as string[]) || []);
  const now = new Set(current.map(key));
  const changed = new Set<number>();
  Array.from(before).forEach((k) => { if (!now.has(k)) changed.add(Number(k.split("|")[0])); });
  Array.from(now).forEach((k) => { if (!before.has(k)) changed.add(Number(k.split("|")[0])); });
  return { last, changedPeople: Array.from(changed) };
}

export const snapshotOf = (shifts: ClockinShift[]) => shifts.map(key).sort();

/** Weeks (Mondays) that have been published for any branch, so staff only see sent rotas. */
export async function publishedWeeks(mondays: string[]): Promise<Set<string>> {
  const rows = await prisma.meetRotaPublish.findMany({ where: { weekStart: { in: mondays } }, select: { weekStart: true } });
  return new Set(rows.map((r) => r.weekStart));
}

const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
export const dayLabel = (date: string) => DAY.format(new Date(`${date}T12:00:00Z`));
export function weekLabel(monday: string) {
  const a = new Date(`${monday}T12:00:00Z`);
  const b = new Date(`${addDays(monday, 6)}T12:00:00Z`);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  const f = (d: Date, withMonth: boolean) => new Intl.DateTimeFormat("en-GB", { day: "numeric", ...(withMonth ? { month: "short" } : {}), timeZone: "UTC" }).format(d);
  return `${f(a, !sameMonth)} – ${f(b, true)}`;
}
