import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { getTimesheets, getShifts } from "@/lib/clockin";
import { londonToday, mondayOf, addDays, isDate, isTime, weekRota } from "@/lib/meet-rota";
import { activePeople, firstNameOf } from "@/lib/meet-people";
import { notifyPeople } from "@/lib/meet-notify";
import { spanMinutes } from "@/lib/meet-hours";

export const dynamic = "force-dynamic";

/**
 * GET ?period=week|month : my hours (design 18) from the clock-in app: bars per day (or per week for
 * the month), the rota for the rest of the week, recent shifts with their in/out times, and my fixes.
 */
export async function GET(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const period = new URL(req.url).searchParams.get("period") === "month" ? "month" : "week";
  const today = londonToday();
  const monday = mondayOf(today);

  try {
    const from = addDays(monday, -28);
    const [sheet] = await getTimesheets(from, addDays(monday, 6), me.person.id);
    const days = sheet?.days || [];
    const hoursOn = (d: string) => days.find((x) => x.date === d)?.hours || 0;
    const people = await activePeople();
    const rota = await weekRota(monday, people);
    const myRota = rota.shifts.filter((s) => s.staffId === me.person.id);

    const week = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      const planned = myRota.filter((s) => s.date === d);
      return { date: d, hours: hoursOn(d), future: d > today, today: d === today, planned: planned.map((s) => ({ start: s.start, end: s.end, branch: s.branch })) };
    });
    const weekTotal = week.reduce((n, d) => n + d.hours, 0);
    const lastWeek = Array.from({ length: 7 }, (_, i) => hoursOn(addDays(monday, i - 7))).reduce((a, b) => a + b, 0);
    const weeks = Array.from({ length: 5 }, (_, i) => {
      const m = addDays(monday, (i - 4) * 7);
      return { monday: m, hours: Array.from({ length: 7 }, (_, j) => hoursOn(addDays(m, j))).reduce((a, b) => a + b, 0) };
    });

    // Recent shifts: last 21 days, newest first, with any fix asked for or approved.
    const fixes = await prisma.meetHoursFix.findMany({ where: { clockinId: me.person.id, date: { gte: addDays(today, -40) } }, orderBy: { createdAt: "desc" } });
    const pastShifts = await getShifts(addDays(today, -21), today);
    const branchOf = new Map<number, string>();
    for (const s of rota.shifts) branchOf.set(s.id, s.branch);
    const recent = days
      .filter((d) => d.date >= addDays(today, -21) && d.date <= today && (d.shifts.length || d.adjusted))
      .flatMap((d) => (d.shifts.length ? d.shifts : [{ in: "", out: "" as string | null }]).map((s) => {
        const fix = fixes.find((f) => f.date === d.date && (f.wasStart === s.in || !s.in));
        const planned = pastShifts.find((p) => p.staffId === me.person.id && p.date === d.date);
        return {
          date: d.date, in: s.in, out: s.out, hours: d.shifts.length > 1 && s.out ? Math.round((spanMinutes(s.in, s.out) / 60) * 100) / 100 : d.hours,
          adjusted: d.adjusted, branch: planned ? branchOf.get(planned.id) || me.branch : me.branch,
          fix: fix ? { status: fix.status, start: fix.start, end: fix.end, by: firstNameOf(fix.decidedBy) } : null,
        };
      }))
      .sort((a, b) => (b.date + b.in).localeCompare(a.date + a.in));

    return NextResponse.json(
      { period, today, week, weekTotal, lastWeek, weeks, recent, fixes: fixes.slice(0, 10).map((f) => ({ id: f.id, date: f.date, start: f.start, end: f.end, status: f.status, by: firstNameOf(f.decidedBy) })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load your hours" }, { status: 502 });
  }
}

/** POST { date, start, end, reason } : ask a manager to fix one shift's times (design 23). */
export async function POST(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const today = londonToday();
  if (!isDate(body.date) || body.date > today || body.date < addDays(today, -31)) return NextResponse.json({ error: "Pick a day in the last month" }, { status: 400 });
  if (!isTime(body.start) || !isTime(body.end)) return NextResponse.json({ error: "Enter both times, like 09:00" }, { status: 400 });
  if (body.start === body.end) return NextResponse.json({ error: "In and out can't be the same" }, { status: 400 });
  if (spanMinutes(body.start, body.end) > 16 * 60) return NextResponse.json({ error: "A shift can't be longer than 16 hours" }, { status: 400 });
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  if (!reason) return NextResponse.json({ error: "Say why" }, { status: 400 });

  try {
    const open = await prisma.meetHoursFix.findFirst({ where: { clockinId: me.person.id, date: body.date, status: "asked" } });
    if (open) return NextResponse.json({ error: "You've already asked to fix that day" }, { status: 400 });
    const [sheet] = await getTimesheets(body.date, body.date, me.person.id);
    const shifts = sheet?.days.find((d) => d.date === body.date)?.shifts || [];
    const was = shifts.find((s) => s.in === body.wasStart) || shifts[0];
    await prisma.meetHoursFix.create({
      data: { clockinId: me.person.id, date: body.date, wasStart: was?.in || "", wasEnd: was?.out || "", start: body.start, end: body.end, reason },
    });
    const managers = (await activePeople()).filter((p) => p.manager && p.id !== me.person.id).map((p) => p.id);
    await notifyPeople(managers, { title: "Hours fix to approve", body: `${firstNameOf(me.person.name)}: ${body.start} – ${body.end} on ${body.date}. ${reason}`, url: "/meet/hours", tag: `fix-${me.person.id}-${body.date}`, icon: "schedule" }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't send that" }, { status: 502 });
  }
}
