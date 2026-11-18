import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { activePeople, firstNameOf } from "@/lib/meet-people";
import { notifyPeople } from "@/lib/meet-notify";
import { isDate, isTime, londonToday, addDays, dayLabel } from "@/lib/meet-rota";
import { endStaleMeetings, presenceOf, londonToDate, londonDate, londonHM, MEETING_KINDS } from "@/lib/meet-meetings";

export const dynamic = "force-dynamic";

/**
 * GET ?from=YYYY-MM-DD&to=YYYY-MM-DD : meetings in those days (London). Managers see every
 * meeting; staff see the ones they're invited to. Live ones always come back.
 */
export async function GET(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const url = new URL(req.url);
  const today = londonToday();
  const from = isDate(url.searchParams.get("from")) ? url.searchParams.get("from")! : addDays(today, -30);
  const to = isDate(url.searchParams.get("to")) ? url.searchParams.get("to")! : addDays(today, 30);

  try {
    await endStaleMeetings().catch(() => {});
    const mineIds = me.manager ? null : (await prisma.meetAttendee.findMany({ where: { clockinId: me.person.id }, select: { meetingId: true } })).map((a) => a.meetingId);
    const meetings = await prisma.meetMeeting.findMany({
      where: {
        ...(mineIds ? { id: { in: mineIds } } : {}),
        OR: [{ status: "live" }, { startsAt: { gte: londonToDate(from, "00:00"), lt: londonToDate(addDays(to, 1), "00:00") } }],
      },
      orderBy: { startsAt: "asc" },
      take: 300,
    });
    const attendees = await prisma.meetAttendee.findMany({ where: { meetingId: { in: meetings.map((m) => m.id) } } });
    const people = await activePeople().catch(() => []);
    const nameOf = (id: number) => people.find((p) => p.id === id)?.name || "Someone";
    return NextResponse.json({
      today,
      meetings: meetings.map((m) => {
        const list = attendees.filter((a) => a.meetingId === m.id);
        const live = m.status === "live";
        const inNow = list.filter((a) => presenceOf(a, live) === "in");
        const mine = list.find((a) => a.clockinId === me.person.id);
        return {
          id: m.id, title: m.title, kind: m.kind, status: m.status, date: londonDate(m.startsAt), time: londonHM(m.startsAt), startsAt: m.startsAt.toISOString(),
          minutes: m.minutes, private: m.private, repeat: m.repeat, host: firstNameOf(m.hostName), startedAt: m.startedAt?.toISOString() || "", endedAt: m.endedAt?.toISOString() || "",
          invited: list.filter((a) => a.invited).map((a) => ({ id: a.clockinId, name: nameOf(a.clockinId) })),
          inNow: inNow.map((a) => ({ id: a.clockinId, name: nameOf(a.clockinId) })),
          came: list.filter((a) => a.joinedAt || a.inRoom).length,
          mineInvited: !!mine?.invited, mineJoined: !!mine?.joinedAt,
        };
      }),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load meetings" }, { status: 502 });
  }
}

/** POST (managers) { title, kind, date, time, minutes, invite: number[], liveNotes, repeat, private } */
export async function POST(req: Request) {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const minutes = Math.round(Number(body.minutes));
  if (!title) return NextResponse.json({ error: "Give it a title" }, { status: 400 });
  if (!(MEETING_KINDS as readonly string[]).includes(body.kind)) return NextResponse.json({ error: "Pick a video call or a room recording" }, { status: 400 });
  if (!isDate(body.date) || !isTime(body.time)) return NextResponse.json({ error: "Pick a date and a time" }, { status: 400 });
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 240) return NextResponse.json({ error: "Length must be 5 minutes to 4 hours" }, { status: 400 });
  const startsAt = londonToDate(body.date, body.time);
  if (startsAt.getTime() < Date.now() - 12 * 3600_000) return NextResponse.json({ error: "That time has passed" }, { status: 400 });

  try {
    const people = await activePeople();
    const valid = new Set(people.map((p) => p.id));
    const invite = Array.from(new Set((Array.isArray(body.invite) ? body.invite : []).map(Number).filter((id: number) => valid.has(id) && id !== me.person.id))) as number[];
    if (body.kind === "call" && invite.length === 0) return NextResponse.json({ error: "Invite at least one person" }, { status: 400 });
    const meeting = await prisma.meetMeeting.create({
      data: {
        title, kind: body.kind, startsAt, minutes, repeat: body.repeat === "daily" ? "daily" : body.repeat === "weekly" || body.repeat === true ? "weekly" : "", private: !!body.private, liveNotes: body.liveNotes !== false,
        hostId: me.person.id, hostName: me.person.name,
      },
    });
    await prisma.meetAttendee.createMany({ data: [me.person.id, ...invite].map((clockinId) => ({ meetingId: meeting.id, clockinId, invited: true })) });
    const when = `${dayLabel(body.date)} at ${body.time}`;
    await notifyPeople(invite, {
      title: `Invite: ${title}`,
      body: `${when} · ${body.kind === "room" ? "Room recording" : "Video call"} · ${minutes} min. It's in your Demi's calendar. Join from the app when it starts.`,
      url: "/meet?tab=calendar", tag: `meet-${meeting.id}`, icon: "event",
    }).catch(() => null);
    return NextResponse.json({ ok: true, id: meeting.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't create the meeting" }, { status: 502 });
  }
}
