/**
 * Repeating tasks (e.g. "clean the extractor, Mon, Wed and Fri"). Each occurrence is its own task
 * with its own due date, so ticking one off, or missing one, is clear to everyone. The next one is
 * made when this one is ticked off, or when its day has passed, whichever comes first.
 */
import { prisma } from "@/lib/prisma";
import { addDays, londonToday } from "@/lib/meet-rota";
import type { MeetTask } from "@prisma/client";

/** 1 = Monday … 7 = Sunday. */
export const weekdayOf = (date: string) => ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;

/** Clean a list of weekdays into "1,3,5" ("" if none). */
export function cleanRepeat(v: unknown): string {
  const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const days = Array.from(new Set(list.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))).sort();
  return days.join(",");
}

export const repeatList = (s: string) => s.split(",").map(Number).filter((n) => n >= 1 && n <= 7);

/** The first chosen weekday on or after `from`. */
export function firstOnOrAfter(days: string, from: string): string {
  const list = repeatList(days);
  if (!list.length) return "";
  for (let i = 0; i < 7; i++) {
    const d = addDays(from, i);
    if (list.includes(weekdayOf(d))) return d;
  }
  return "";
}

/** Put the next occurrence of a repeating task in place (does nothing if it's already there). */
export async function scheduleNextTask(t: MeetTask) {
  if (!t.repeatDays) return;
  const today = londonToday();
  // After this one's day, and never in the past: ticked off early, the next is after its due day;
  // ticked off late (or missed), the next is the first chosen day from today.
  const base = t.dueDate && t.dueDate >= today ? t.dueDate : addDays(today, -1);
  const next = firstOnOrAfter(t.repeatDays, addDays(base, 1));
  if (!next) return;
  const exists = await prisma.meetTask.findFirst({ where: { ownerId: t.ownerId, title: t.title, dueDate: next, repeatDays: { not: "" }, status: { not: "dismissed" } } });
  if (exists) return;
  const steps = (Array.isArray(t.steps) ? (t.steps as { text: string }[]) : []).map((s) => ({ text: s.text, done: false }));
  await prisma.meetTask.create({
    data: { title: t.title, ownerId: t.ownerId, dueDate: next, steps, repeatDays: t.repeatDays, meetingId: t.meetingId, createdBy: t.createdBy },
  });
}

/** Repeating tasks whose day has passed without being ticked off: the next one still appears on time. */
export async function rollRepeatingTasks() {
  const today = londonToday();
  const due = await prisma.meetTask.findMany({ where: { repeatDays: { not: "" }, status: { in: ["open", "help"] }, dueDate: { lt: today, not: "" } }, take: 200 });
  for (const t of due) await scheduleNextTask(t);
}
