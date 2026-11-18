/** Shared bits for hours: minutes between times, and turning timesheets into shift rows. */
import type { Timesheet } from "@/lib/clockin";

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
