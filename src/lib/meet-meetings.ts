/**
 * Meetings for Demi's Meetings: who can see a meeting, who's in it right now,
 * and tidying attendance when it ends.
 *
 * Presence is kept by the server, not trusted from the browser: a join is
 * recorded when the signed-in app joins, the page pings every 30 seconds while
 * someone is in, and a leave (or the pings stopping) closes their time.
 */
import { prisma } from "@/lib/prisma";
import type { MeetAttendee, MeetMeeting } from "@prisma/client";

export const PING_MS = 30_000;
const IN_MS = 75_000; // seen in the last 75s: in the call
const RECONNECT_MS = 4 * 60_000; // 75s to 4 min: reconnecting (phone locked, signal dropped)

export type Presence = "in" | "reconnecting" | "left" | "not_joined";

export function presenceOf(a: Pick<MeetAttendee, "joinedAt" | "lastSeenAt" | "leftAt">, meetingLive: boolean): Presence {
  if (!a.joinedAt) return "not_joined";
  if (a.leftAt || !meetingLive || !a.lastSeenAt) return "left";
  const age = Date.now() - a.lastSeenAt.getTime();
  if (age < IN_MS) return "in";
  if (age < RECONNECT_MS) return "reconnecting";
  return "left";
}

/** The meeting if this person may see it: managers see all; staff see ones they were invited to or joined. */
export async function meetingFor(id: string, me: { person: { id: number }; manager: boolean }) {
  const meeting = await prisma.meetMeeting.findUnique({ where: { id } });
  if (!meeting) return null;
  const attendees = await prisma.meetAttendee.findMany({ where: { meetingId: id } });
  const mine = attendees.find((a) => a.clockinId === me.person.id) || null;
  if (!me.manager && !mine) return null;
  return { meeting, attendees, mine };
}

/** Add the time since the last ping (capped, so a long silence isn't counted as time in the meeting). */
export function addedSeconds(a: Pick<MeetAttendee, "lastSeenAt" | "leftAt">, now = Date.now()): number {
  if (!a.lastSeenAt || a.leftAt) return 0;
  return Math.max(0, Math.min(Math.round((now - a.lastSeenAt.getTime()) / 1000), 90));
}

/** When a meeting ends: anyone still marked in leaves at their last ping. */
export async function closeAttendance(meeting: MeetMeeting) {
  const open = await prisma.meetAttendee.findMany({ where: { meetingId: meeting.id, joinedAt: { not: null }, leftAt: null } });
  for (const a of open) {
    await prisma.meetAttendee.update({
      where: { meetingId_clockinId: { meetingId: a.meetingId, clockinId: a.clockinId } },
      data: { leftAt: a.lastSeenAt || new Date(), seconds: a.seconds + addedSeconds(a) },
    });
  }
}

/** Live meetings that nobody has pinged for 20 minutes are ended automatically (host closed the laptop). */
export async function endStaleMeetings() {
  const live = await prisma.meetMeeting.findMany({ where: { status: "live" } });
  for (const m of live) {
    const last = await prisma.meetAttendee.findFirst({ where: { meetingId: m.id }, orderBy: { lastSeenAt: "desc" } });
    const lastAt = last?.lastSeenAt?.getTime() || m.startedAt?.getTime() || 0;
    if (Date.now() - lastAt > 20 * 60_000) {
      await prisma.meetMeeting.update({ where: { id: m.id }, data: { status: "ended", endedAt: new Date(lastAt || Date.now()) } });
      await closeAttendance(m);
    }
  }
}

export const MEETING_KINDS = ["call", "room"] as const;

/** London wall-clock date and time to a real moment (handles summer time). */
export function londonToDate(date: string, time: string): Date {
  const guess = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(guess);
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const m = Number(parts.find((p) => p.type === "minute")?.value);
  const offsetMin = h * 60 + m - (guess.getUTCHours() * 60 + guess.getUTCMinutes());
  return new Date(guess.getTime() - (((offsetMin + 720) % 1440) - 720) * 60_000);
}

export const londonDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
export const londonHM = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
