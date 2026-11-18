import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { activePeople, firstNameOf } from "@/lib/meet-people";
import { notifyPeople } from "@/lib/meet-notify";
import { readUrls } from "@/lib/meet-storage";
import { getShifts } from "@/lib/clockin";
import { dayLabel } from "@/lib/meet-rota";
import { meetingFor, presenceOf, addedSeconds, closeAttendance, scheduleNext, londonDate, londonHM } from "@/lib/meet-meetings";
import { processNotes, transcriptionReady, summaryReady, liveLines, type Line } from "@/lib/meet-notes";
import type { MeetMeeting, MeetAttendee } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };
const PIN_KEY = "manager_pin_hash";

async function notesFor(m: MeetMeeting, nameOf: (id: number) => string) {
  const speakers = (m.speakers || {}) as Record<string, number>;
  const lines = ((m.transcript as Line[]) || []).map((l) => ({
    ...l,
    name: m.kind === "room" || l.clockinId === 0 ? (speakers[String(l.speaker)] ? firstNameOf(nameOf(speakers[String(l.speaker)])) : `Speaker ${l.speaker + 1}`) : firstNameOf(nameOf(l.clockinId)),
  }));
  const tasks = await prisma.meetTask.findMany({ where: { meetingId: m.id, status: { not: "dismissed" } }, orderBy: { createdAt: "asc" } });
  const recs = await prisma.meetRecording.findMany({ where: { meetingId: m.id }, orderBy: [{ clockinId: "asc" }, { seq: "asc" }] });
  const urls = await readUrls(recs.map((r) => r.path));
  return {
    summary: m.summary, decisions: (m.decisions as string[]) || [], notesBy: m.notesBy, error: m.error, transcript: lines,
    speakerIds: speakers,
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, ownerId: t.ownerId, owner: nameOf(t.ownerId), dueDate: t.dueDate, status: t.status, quote: t.quote, quoteBy: t.quoteBy, quoteMs: t.quoteMs })),
    recordings: recs.map((r) => ({ clockinId: r.clockinId, seq: r.seq, startMs: r.startMs, status: r.status, url: urls.get(r.path) || "" })),
  };
}

async function view(m: MeetMeeting, list: MeetAttendee[], me: NonNullable<Awaited<ReturnType<typeof requireMeet>>>, unlocked = false) {
  const people = await activePeople().catch(() => []);
  const nameOf = (id: number) => people.find((p) => p.id === id)?.name || "Someone";
  const live = m.status === "live";
  // Missed while on shift or off shift (design 11): look at the rota for that day.
  const day = londonDate(m.startsAt);
  const shifts = await getShifts(day, day).catch(() => []);
  const mine = list.find((a) => a.clockinId === me.person.id);
  const canRead = !m.private || unlocked;
  return {
    meeting: {
      id: m.id, title: m.title, kind: m.kind, status: m.status, date: day, time: londonHM(m.startsAt), startsAt: m.startsAt.toISOString(), minutes: m.minutes,
      private: m.private, liveNotes: m.liveNotes, repeat: m.repeat, hostId: m.hostId, host: firstNameOf(m.hostName),
      startedAt: m.startedAt?.toISOString() || "", endedAt: m.endedAt?.toISOString() || "",
    },
    me: { id: me.person.id, name: me.person.name, manager: me.manager, invited: !!mine?.invited, joined: !!mine?.joinedAt, seconds: mine?.seconds || 0 },
    attendees: list.map((a) => {
      const p = people.find((x) => x.id === a.clockinId);
      return {
        id: a.clockinId, name: nameOf(a.clockinId), branch: p?.branch || "", invited: a.invited, presence: presenceOf(a, live), inRoom: a.inRoom,
        joinedAt: a.joinedAt?.toISOString() || "", leftAt: a.leftAt?.toISOString() || "", seconds: a.seconds,
        onShift: shifts.some((s) => s.staffId === a.clockinId),
      };
    }).sort((x, y) => x.name.localeCompare(y.name)),
    people: me.manager ? people.map((p) => ({ id: p.id, name: p.name, branch: p.branch })) : [],
    locked: m.private && !unlocked && ["ended", "ready"].includes(m.status),
    notes: canRead && ["ended", "ready"].includes(m.status) ? await notesFor(m, nameOf) : null,
    live: live && m.liveNotes && canRead ? await (async () => {
      // The transcript so far, and each person's share of the talking.
      const lines = await liveLines(m.id);
      const speakers = (m.speakers || {}) as Record<string, number>;
      const label = (l: Line) => (m.kind === "room" || l.clockinId === 0 ? (speakers[String(l.speaker)] ? firstNameOf(nameOf(speakers[String(l.speaker)])) : `Speaker ${l.speaker + 1}`) : firstNameOf(nameOf(l.clockinId)));
      const share = new Map<string, number>();
      for (const l of lines) share.set(label(l), (share.get(label(l)) || 0) + l.text.split(/\s+/).length);
      const total = Array.from(share.values()).reduce((a, b) => a + b, 0) || 1;
      return {
        lines: lines.slice(-80).map((l) => ({ ms: l.ms, name: label(l), text: l.text })),
        talk: Array.from(share.entries()).map(([name, n]) => ({ name, pct: Math.round((n / total) * 100) })).sort((a, b) => b.pct - a.pct),
      };
    })() : null,
    ready: { transcription: transcriptionReady(), summary: summaryReady() },
  };
}

/** GET: the meeting, who's in it, and its notes once it has ended (private: after the manager PIN). */
export async function GET(_req: Request, { params }: Ctx) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  const found = await meetingFor(id, me);
  if (!found) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  if (found.meeting.private && !me.manager && ["ended", "ready"].includes(found.meeting.status)) {
    return NextResponse.json({ error: "This meeting's notes are private" }, { status: 403 });
  }
  return NextResponse.json(await view(found.meeting, found.attendees, me), { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST { action, ... }
 *   anyone invited: join · here · leave
 *   managers:       start · end · cancel · process · notes {summary, decisions} · invite {ids}
 *                   room {present: ids} · speakers {map} · unlock {pin}
 */
export async function POST(req: Request, { params }: Ctx) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  const found = await meetingFor(id, me);
  if (!found) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  const { meeting: m, mine } = found;
  const body = await req.json().catch(() => ({}));
  const key = { meetingId_clockinId: { meetingId: m.id, clockinId: me.person.id } };
  const now = new Date();

  try {
    if (body.action === "join") {
      if (m.status !== "live") return NextResponse.json({ error: m.status === "scheduled" ? "It hasn't started yet" : "This meeting has ended" }, { status: 400 });
      await prisma.meetAttendee.upsert({
        where: key,
        create: { meetingId: m.id, clockinId: me.person.id, invited: false, joinedAt: now, lastSeenAt: now },
        update: { joinedAt: mine?.joinedAt || now, lastSeenAt: now, leftAt: null },
      });
      return NextResponse.json({ ok: true, startedAt: m.startedAt?.toISOString() || now.toISOString() });
    }
    if (body.action === "here") {
      if (!mine?.joinedAt) return NextResponse.json({ error: "Join first" }, { status: 400 });
      if (m.status !== "live") return NextResponse.json({ ok: true, ended: true });
      await prisma.meetAttendee.update({ where: key, data: { lastSeenAt: now, leftAt: null, seconds: mine.seconds + addedSeconds({ ...mine, leftAt: null }) } });
      return NextResponse.json({ ok: true, ended: false });
    }
    if (body.action === "leave") {
      if (mine?.joinedAt && !mine.leftAt) await prisma.meetAttendee.update({ where: key, data: { leftAt: now, seconds: mine.seconds + addedSeconds(mine) } });
      return NextResponse.json({ ok: true });
    }

    if (!me.manager) return NextResponse.json({ error: "Managers only" }, { status: 403 });

    if (body.action === "start") {
      if (m.status === "live") return NextResponse.json({ ok: true });
      if (m.status !== "scheduled") return NextResponse.json({ error: "This meeting has already happened" }, { status: 400 });
      await prisma.meetMeeting.update({ where: { id: m.id }, data: { status: "live", startedAt: now } });
      const invited = found.attendees.filter((a) => a.invited && a.clockinId !== me.person.id).map((a) => a.clockinId);
      if (m.kind === "call") {
        await notifyPeople(invited, { title: "Your meeting has started", body: `${m.title} · tap to join`, url: `/meet?join=${m.id}`, tag: `meet-${m.id}`, icon: "videocam" }, { email: false }).catch(() => null);
      }
      return NextResponse.json({ ok: true });
    }
    if (body.action === "end") {
      if (m.status !== "live") return NextResponse.json({ error: "It isn't live" }, { status: 400 });
      const ended = await prisma.meetMeeting.update({ where: { id: m.id }, data: { status: "ended", endedAt: now } });
      await closeAttendance(ended);
      // Repeating meetings: the next one goes in the calendar straight away.
      await scheduleNext(ended);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "cancel") {
      if (m.status !== "scheduled") return NextResponse.json({ error: "Only meetings that haven't started can be cancelled" }, { status: 400 });
      const invited = found.attendees.filter((a) => a.clockinId !== me.person.id).map((a) => a.clockinId);
      await prisma.meetAttendee.deleteMany({ where: { meetingId: m.id } });
      await prisma.meetMeeting.delete({ where: { id: m.id } });
      await notifyPeople(invited, { title: `Cancelled: ${m.title}`, body: `${dayLabel(londonDate(m.startsAt))} at ${londonHM(m.startsAt)} is off.`, url: "/meet?tab=calendar", tag: `meet-${m.id}`, icon: "event_busy" }).catch(() => null);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "invite") {
      const valid = new Set((await activePeople()).map((p) => p.id));
      const ids = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter((x: number) => valid.has(x));
      for (const cid of ids) {
        await prisma.meetAttendee.upsert({ where: { meetingId_clockinId: { meetingId: m.id, clockinId: cid } }, create: { meetingId: m.id, clockinId: cid, invited: true }, update: { invited: true } });
      }
      const fresh = ids.filter((x: number) => !found.attendees.some((a) => a.clockinId === x && a.invited));
      await notifyPeople(fresh, { title: m.status === "live" ? `Join now: ${m.title}` : `Invite: ${m.title}`, body: m.status === "live" ? "The meeting has started. Tap to join." : `${dayLabel(londonDate(m.startsAt))} at ${londonHM(m.startsAt)}`, url: m.status === "live" ? `/meet?join=${m.id}` : "/meet?tab=calendar", tag: `meet-${m.id}`, icon: m.status === "live" ? "videocam" : "event" }).catch(() => null);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "remind") {
      const cid = Number(body.clockinId);
      const a = found.attendees.find((x) => x.clockinId === cid);
      if (!a || m.status !== "live") return NextResponse.json({ error: "Can't remind them now" }, { status: 400 });
      await notifyPeople([cid], { title: `${firstNameOf(me.person.name)} is waiting for you`, body: `${m.title} has started. Tap to join.`, url: `/meet?join=${m.id}`, tag: `meet-${m.id}`, icon: "videocam" }, { email: false }).catch(() => null);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "room") {
      // Room recordings: the manager ticks who is in the room.
      const present = new Set<number>((Array.isArray(body.present) ? body.present : []).map(Number));
      const valid = new Set((await activePeople()).map((p) => p.id));
      for (const cid of Array.from(present).filter((x) => valid.has(x))) {
        await prisma.meetAttendee.upsert({ where: { meetingId_clockinId: { meetingId: m.id, clockinId: cid } }, create: { meetingId: m.id, clockinId: cid, invited: false, inRoom: true }, update: { inRoom: true } });
      }
      await prisma.meetAttendee.updateMany({ where: { meetingId: m.id, clockinId: { notIn: Array.from(present) } }, data: { inRoom: false } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "process") {
      return NextResponse.json(await processNotes(m.id));
    }
    if (body.action === "notes") {
      if (!["ended", "ready"].includes(m.status)) return NextResponse.json({ error: "Notes come after the meeting" }, { status: 400 });
      const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 4000) : m.summary;
      const decisions = Array.isArray(body.decisions) ? body.decisions.filter((d: unknown) => typeof d === "string" && d.trim()).map((d: string) => d.trim().slice(0, 300)).slice(0, 30) : m.decisions;
      await prisma.meetMeeting.update({ where: { id: m.id }, data: { summary, decisions, status: "ready", notesBy: m.notesBy === "ai" ? "ai" : me.person.name.slice(0, 80) } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "speakers") {
      const valid = new Set((await activePeople()).map((p) => p.id));
      const map: Record<string, number> = {};
      for (const [k, v] of Object.entries(body.map || {})) if (/^\d+$/.test(k) && valid.has(Number(v))) map[k] = Number(v);
      await prisma.meetMeeting.update({ where: { id: m.id }, data: { speakers: map } });
      // Re-point suggested task owners named "Speaker N" by the notes.
      return NextResponse.json({ ok: true });
    }
    if (body.action === "unlock") {
      const pin = String(body.pin || "");
      if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: "Enter the 4-digit manager PIN" }, { status: 400 });
      const wrong = await prisma.meetLog.count({ where: { action: "private_pin_wrong", by: me.person.name, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } } });
      if (wrong >= 5) return NextResponse.json({ error: "Too many wrong tries. Wait 15 minutes." }, { status: 429 });
      const set = await prisma.meetSetting.findUnique({ where: { key: PIN_KEY } });
      if (!set) {
        // First time: the PIN entered becomes the manager PIN.
        await prisma.meetSetting.create({ data: { key: PIN_KEY, value: await bcrypt.hash(pin, 10) } });
      } else if (!(await bcrypt.compare(pin, set.value))) {
        await prisma.meetLog.create({ data: { action: "private_pin_wrong", target: m.id, by: me.person.name } });
        return NextResponse.json({ error: "That PIN isn't right" }, { status: 400 });
      }
      await prisma.meetLog.create({ data: { action: "private_notes_opened", target: m.id, by: me.person.name } });
      return NextResponse.json({ ...(await view(m, found.attendees, me, true)), firstPin: !set });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't do that" }, { status: 502 });
  }
}

