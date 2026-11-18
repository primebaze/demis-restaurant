import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { getClockinStaff } from "@/lib/clockin";
import { listDevices } from "@/lib/meet-devices";
import { addDays, weekRota, londonToday, mondayOf, publishState, weekLabel, shiftHours } from "@/lib/meet-rota";

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

    return NextResponse.json(
      {
        today,
        requests,
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
