import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { getClockinStaff, createShift, updateShift, deleteShift, getShifts, getRotaCosts, setDayBudget } from "@/lib/clockin";
import {
  weekRota, publishState, snapshotOf, mondayOf, weekDays, addDays, londonToday, isBranch, isDate, isTime,
  shiftHours, dayLabel, weekLabel, ALL, type RotaShift,
} from "@/lib/meet-rota";
import { notifyPeople } from "@/lib/meet-notify";
import { timeOffBetween } from "@/lib/meet-requests";

export const dynamic = "force-dynamic";

const BRANCH_NAME: Record<string, string> = { cricklewood: "Cricklewood", streatham: "Streatham" };

/** One rota for both branches: everyone on the staff list, every shift with its branch. */
async function load(monday: string) {
  const staff = (await getClockinStaff()).filter((s) => s.active);
  const { shifts, homeOf } = await weekRota(monday, staff);
  const { last, changedPeople } = await publishState(monday, shifts);

  const people = staff
    .map((s) => ({ id: s.id, name: s.name, role: s.role, branch: homeOf.get(s.id) || "" }))
    .sort((a, b) => Number(b.role === "manager") - Number(a.role === "manager") || a.name.localeCompare(b.name));

  let seen = 0;
  let onRota = 0;
  if (last) {
    const sent = new Set(((last.snapshot as string[]) || []).map((k) => Number(k.split("|")[0])));
    onRota = sent.size;
    seen = await prisma.meetRotaSeen.count({ where: { publishId: last.id, clockinId: { in: Array.from(sent) } } });
  }

  const timeOff = await timeOffBetween(monday, addDays(monday, 6));
  // Budget and cost come from the clock-in app; if that part isn't available, the rota still loads.
  const costs = await getRotaCosts(monday, addDays(monday, 6)).catch(() => null);
  const waitingRequests = await prisma.meetRequest.count({ where: { OR: [{ kind: "timeoff", status: "asked" }, { kind: "swap", status: "agreed", shiftDate: { gte: londonToday() } }] } });

  return {
    week: monday,
    timeOff,
    waitingRequests,
    costs,
    weekLabel: weekLabel(monday),
    days: weekDays(monday),
    today: londonToday(),
    people,
    shifts: shifts.map((s) => ({ ...s, hours: shiftHours(s.start, s.end) })),
    published: last ? { at: last.publishedAt.toISOString(), by: last.publishedBy, changedPeople, seen, onRota } : null,
  };
}

/** GET ?week=YYYY-MM-DD : the week's rota. Managers only. */
export async function GET(req: Request) {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const week = new URL(req.url).searchParams.get("week");
  const monday = mondayOf(isDate(week) ? week : londonToday());
  try {
    return NextResponse.json(await load(monday), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load the rota" }, { status: 502 });
  }
}

/**
 * POST
 *   { action: "save", branch, id?, staffId, date, start, end, notes? }
 *   { action: "delete", id }
 *   { action: "budget", date, amount }   (amount null or 0 clears that day's budget)
 *   { action: "copy_last_week", week }
 *   { action: "publish", week }   (first time: everyone on it; after that: only people whose shifts changed)
 */
export async function POST(req: Request) {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const actor = me.person.name;

  try {
    if (body.action === "save") {
      const staffId = Number(body.staffId);
      if (!isBranch(body.branch) || !Number.isInteger(staffId) || !isDate(body.date) || !isTime(body.start) || !isTime(body.end)) {
        return NextResponse.json({ error: "Pick a person, a branch, a day and both times" }, { status: 400 });
      }
      if (body.start === body.end) return NextResponse.json({ error: "Start and finish can't be the same" }, { status: 400 });
      if (shiftHours(body.start, body.end) > 16) return NextResponse.json({ error: "A shift can't be longer than 16 hours" }, { status: 400 });
      const input = { staffId, date: body.date, start: body.start, end: body.end, notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 500) : null };
      const id = Number(body.id);
      const shift = Number.isInteger(id) && id > 0 ? await updateShift(id, input, actor) : await createShift(input, actor);
      await prisma.meetShiftBranch.upsert({ where: { shiftId: shift.id }, create: { shiftId: shift.id, branch: body.branch }, update: { branch: body.branch } });
      return NextResponse.json({ ok: true, shift });
    }

    if (body.action === "budget") {
      if (!isDate(body.date)) return NextResponse.json({ error: "Which day?" }, { status: 400 });
      const amount = body.amount === null || body.amount === "" ? null : Number(body.amount);
      if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 999999)) return NextResponse.json({ error: "Enter an amount in pounds" }, { status: 400 });
      await setDayBudget(body.date, amount, actor);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Which shift?" }, { status: 400 });
      await deleteShift(id, actor);
      await prisma.meetShiftBranch.deleteMany({ where: { shiftId: id } });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "copy_last_week") {
      if (!isDate(body.week)) return NextResponse.json({ error: "Which week?" }, { status: 400 });
      const monday = mondayOf(body.week);
      const staff = (await getClockinStaff()).filter((s) => s.active);
      const prev = await weekRota(addDays(monday, -7), staff);
      // Anyone already working that day keeps what they have.
      const thisWeek = await getShifts(monday, addDays(monday, 6));
      const busy = new Set(thisWeek.map((s) => `${s.staffId}|${s.date}`));
      let copied = 0;
      for (const s of prev.shifts) {
        const date = addDays(s.date, 7);
        if (busy.has(`${s.staffId}|${date}`)) continue;
        const shift = await createShift({ staffId: s.staffId, date, start: s.start, end: s.end, notes: s.notes }, actor);
        await prisma.meetShiftBranch.create({ data: { shiftId: shift.id, branch: s.branch } });
        busy.add(`${s.staffId}|${date}`);
        copied++;
      }
      return NextResponse.json({ ok: true, copied });
    }

    if (body.action === "publish") {
      if (!isDate(body.week)) return NextResponse.json({ error: "Which week?" }, { status: 400 });
      const monday = mondayOf(body.week);
      const staff = (await getClockinStaff()).filter((s) => s.active);
      const { shifts } = await weekRota(monday, staff);
      const { last, changedPeople } = await publishState(monday, shifts);
      if (!last && shifts.length === 0) return NextResponse.json({ error: "There are no shifts in this week yet" }, { status: 400 });
      if (last && changedPeople.length === 0) return NextResponse.json({ error: "Nothing has changed since it was sent" }, { status: 400 });

      await prisma.meetRotaPublish.create({ data: { branch: ALL, weekStart: monday, snapshot: snapshotOf(shifts), publishedBy: actor.slice(0, 80) } });

      const label = weekLabel(monday);
      const byPerson = new Map<number, RotaShift[]>();
      for (const s of shifts) byPerson.set(s.staffId, [...(byPerson.get(s.staffId) || []), s]);
      const recipients = last ? changedPeople : Array.from(byPerson.keys());

      for (const id of recipients) {
        const mine = (byPerson.get(id) || []).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
        const list = mine.map((s) => `${dayLabel(s.date)}: ${s.start} – ${s.end}, ${BRANCH_NAME[s.branch]}`).join("\n");
        const title = last ? `Your shifts changed: ${label}` : `New rota: ${label}`;
        const text = mine.length ? `${last ? "Your updated shifts" : "Your shifts"}:\n${list}` : `You're no longer on the rota for ${label}.`;
        await notifyPeople([id], { title, body: text, url: "/meet?tab=rota", tag: `rota-${monday}` }).catch(() => null);
      }
      return NextResponse.json({ ok: true, people: recipients.length, update: !!last });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save that" }, { status: 502 });
  }
}
