import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { getClockinStaff } from "@/lib/clockin";
import { listDevices } from "@/lib/meet-devices";
import { addDays, weekRota, londonToday, mondayOf, publishState, weekLabel, shiftHours } from "@/lib/meet-rota";
import { londonToDate } from "@/lib/meet-meetings";

export const dynamic = "force-dynamic";

/** GET: what the manager Home (design 1) needs: things waiting on them and this week's numbers. Managers only. */
export async function GET() {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });

  try {
    const today = londonToday();
    const thisWeek = mondayOf(today);
    const nextWeek = addDays(thisWeek, 7);
    const staff = (await getClockinStaff()).filter((s) => s.active);

    const [devices, locks] = await Promise.all([
      listDevices(),
      prisma.meetPinLock.findMany({ where: { lockedUntil: { gt: new Date() } } }),
    ]);
    const nameOf = new Map(staff.map((s) => [s.id, s.name]));

    let hours = 0;
    const people = new Set<number>();
    let changed = 0;
    let seen = 0;
    let onRota = 0;
    const onToday: { name: string; start: string; end: string; branch: string }[] = [];

    const now = await weekRota(thisWeek, staff);
    const st = await publishState(thisWeek, now.shifts);
    for (const s of now.shifts) {
      hours += shiftHours(s.start, s.end);
      people.add(s.staffId);
      if (s.date === today) onToday.push({ name: nameOf.get(s.staffId) || "", start: s.start, end: s.end, branch: s.branch });
    }
    changed = st.changedPeople.length;
    const thisNotSent = !st.last && now.shifts.length > 0;
    if (st.last) {
      const sent = new Set(((st.last.snapshot as string[]) || []).map((k) => Number(k.split("|")[0])));
      onRota = sent.size;
      seen = await prisma.meetRotaSeen.count({ where: { publishId: st.last.id, clockinId: { in: Array.from(sent) } } });
    }
    const next = await weekRota(nextWeek, staff);
    const nextNotSent = !(await publishState(nextWeek, next.shifts)).last;

    const requests = await prisma.meetRequest.count({ where: { OR: [{ kind: "timeoff", status: "asked" }, { kind: "swap", status: "agreed", shiftDate: { gte: today } }] } });

    // Meetings, tasks, hours and reports waiting on a manager.
    const [hoursFixes, reportsNew, urgentReports, openTasks, suggested, roomReady, weekMeetings, doneWeek] = await Promise.all([
      prisma.meetHoursFix.count({ where: { status: "asked" } }),
      prisma.meetReport.count({ where: { status: "new", OR: [{ aboutId: null }, { aboutId: { not: me.person.id } }] } }),
      prisma.meetReport.count({ where: { status: "new", urgent: true } }),
      prisma.meetTask.findMany({ where: { status: { in: ["open", "help"] }, dueDate: { lt: today, not: "" } }, select: { ownerId: true, status: true } }),
      prisma.meetTask.groupBy({ by: ["meetingId"], where: { status: "suggested" }, _count: true }),
      prisma.meetMeeting.findMany({ where: { kind: "room", status: "ready", endedAt: { gte: new Date(Date.now() - 14 * 86400_000) } }, select: { id: true, title: true, transcript: true, speakers: true } }),
      prisma.meetMeeting.findMany({ where: { status: { in: ["ended", "ready"] }, startsAt: { gte: londonToDate(thisWeek, "00:00") } }, select: { id: true, kind: true } }),
      prisma.meetTask.count({ where: { status: "done", doneAt: { gte: londonToDate(thisWeek, "00:00") } } }),
    ]);
    const helpAsked = await prisma.meetTask.count({ where: { status: "help" } });
    const overdueBy = new Map<number, number>();
    for (const t of openTasks) overdueBy.set(t.ownerId, (overdueBy.get(t.ownerId) || 0) + 1);
    const toConfirm = suggested.filter((g) => g.meetingId);
    const confirmTitles = toConfirm.length ? await prisma.meetMeeting.findMany({ where: { id: { in: toConfirm.map((g) => g.meetingId!) } }, select: { id: true, title: true } }) : [];
    const voices = roomReady.map((m) => {
      const lines = (m.transcript as { speaker: number }[]) || [];
      const n = new Set(lines.map((l) => l.speaker)).size;
      const named = Object.keys((m.speakers as Record<string, number>) || {}).length;
      return { id: m.id, title: m.title, unnamed: Math.max(0, n - named) };
    }).filter((x) => x.unnamed > 0);
    const weekIds = weekMeetings.map((m) => m.id);
    const weekAtt = weekIds.length ? await prisma.meetAttendee.findMany({ where: { meetingId: { in: weekIds }, invited: true } }) : [];
    const attended = weekAtt.filter((a) => a.joinedAt || a.inRoom).length;

    return NextResponse.json(
      {
        today,
        requests,
        hoursFixes,
        reports: { fresh: reportsNew, urgent: urgentReports },
        overdue: { total: openTasks.length, by: Array.from(overdueBy.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => ({ name: (nameOf.get(id) || "Someone").split(" ")[0], n })) },
        helpAsked,
        toConfirm: toConfirm.map((g) => ({ id: g.meetingId, n: g._count, title: confirmTitles.find((m) => m.id === g.meetingId)?.title || "A meeting" })),
        voices,
        meetingsWeek: { held: weekMeetings.length, attendance: weekAtt.length ? Math.round((attended / weekAtt.length) * 100) : null, tasksDone: doneWeek },
        phonesWaiting: devices.pending.length,
        locked: locks.map((l) => nameOf.get(l.clockinId) || "Someone"),
        rota: {
          thisWeekLabel: weekLabel(thisWeek),
          nextWeekLabel: weekLabel(nextWeek),
          changed,
          nextNotSent,
          thisNotSent,
          hours: Math.round(hours * 10) / 10,
          people: people.size,
          seen,
          onRota,
        },
        onToday: onToday.sort((a, b) => a.start.localeCompare(b.start)),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load right now" }, { status: 502 });
  }
}
