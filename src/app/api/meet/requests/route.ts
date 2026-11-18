import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { getClockinStaff, getShifts } from "@/lib/clockin";
import { isDate, londonToday, weekRota, mondayOf, addDays } from "@/lib/meet-rota";
import { freeOn, OPEN_SWAP, BRANCH_NAME, day, range, firstName, tellManagers } from "@/lib/meet-requests";
import { notifyPeople } from "@/lib/meet-notify";

export const dynamic = "force-dynamic";

/**
 * GET                : my requests, and swaps other people are asking me to take
 * GET ?free=YYYY-MM-DD: colleagues free that day (for "Who could take it?")
 */
export async function GET(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const url = new URL(req.url);
  const free = url.searchParams.get("free");

  try {
    if (isDate(free)) {
      const people = await freeOn(free, me.person.id);
      return NextResponse.json({ people: people.map((p) => ({ id: p.id, name: p.name })) }, { headers: { "Cache-Control": "no-store" } });
    }

    const today = londonToday();
    const staff = await getClockinStaff();
    const nameOf = new Map(staff.map((s) => [s.id, s.name]));

    const mine = await prisma.meetRequest.findMany({
      where: { clockinId: me.person.id, OR: [{ shiftDate: { gte: today } }, { toDate: { gte: today } }, { createdAt: { gte: new Date(Date.now() - 14 * 86400_000) } }] },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    // Asked by name, or an open "anyone" swap on a day I'm free (and not mine).
    const asks = await prisma.meetRequest.findMany({
      where: { kind: "swap", shiftDate: { gte: today }, OR: [{ status: "asked", targetId: me.person.id }, { status: "open", NOT: { clockinId: me.person.id } }] },
      orderBy: { shiftDate: "asc" },
      take: 20,
    });
    const openDays = Array.from(new Set(asks.filter((a) => a.status === "open").map((a) => a.shiftDate)));
    const busyDays = new Set<string>();
    for (const d of openDays) if ((await getShifts(d, d)).some((s) => s.staffId === me.person.id)) busyDays.add(d);
    const forMe = asks.filter((a) => a.status === "asked" || !busyDays.has(a.shiftDate));

    const view = (r: (typeof mine)[number]) => ({
      id: r.id, kind: r.kind, status: r.status, shiftId: r.shiftId, date: r.shiftDate, start: r.shiftStart, end: r.shiftEnd, branch: r.branch,
      target: r.targetId ? nameOf.get(r.targetId) || "" : "", from: r.fromDate, to: r.toDate, approvedFrom: r.approvedFrom, approvedTo: r.approvedTo,
      by: nameOf.get(r.clockinId) || "", createdAt: r.createdAt.toISOString(),
    });
    return NextResponse.json({ mine: mine.map(view), forMe: forMe.map(view) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load requests" }, { status: 502 });
  }
}

/**
 * POST
 *   { action: "swap", shiftId, targetId | null, reason }
 *   { action: "timeoff", from, to, reason }
 *   { action: "cancel", id }
 *   { action: "answer", id, accept }   (a colleague taking, or not taking, a swap)
 */
export async function POST(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  const today = londonToday();
  const myName = me.person.name;

  try {
    if (body.action === "swap") {
      const shiftId = Number(body.shiftId);
      const monday = mondayOf(today);
      const staff = (await getClockinStaff()).filter((s) => s.active);
      // Only shifts from this week and next, that are mine and haven't happened yet.
      const rota = [...(await weekRota(monday, staff)).shifts, ...(await weekRota(addDays(monday, 7), staff)).shifts];
      const shift = rota.find((s) => s.id === shiftId && s.staffId === me.person.id && s.date >= today);
      if (!shift) return NextResponse.json({ error: "Pick one of your upcoming shifts" }, { status: 400 });
      const already = await prisma.meetRequest.findFirst({ where: { kind: "swap", shiftId, status: { in: OPEN_SWAP } } });
      if (already) return NextResponse.json({ error: "You've already asked to swap that shift" }, { status: 400 });

      let targetId: number | null = null;
      if (body.targetId != null) {
        targetId = Number(body.targetId);
        const free = await freeOn(shift.date, me.person.id);
        if (!free.some((p) => p.id === targetId)) return NextResponse.json({ error: "That person isn't free that day" }, { status: 400 });
      }

      const r = await prisma.meetRequest.create({
        data: { kind: "swap", clockinId: me.person.id, status: targetId ? "asked" : "open", shiftId, shiftDate: shift.date, shiftStart: shift.start, shiftEnd: shift.end, branch: shift.branch, targetId, reason },
      });
      const when = `${day(shift.date)} ${shift.start} – ${shift.end} at ${BRANCH_NAME[shift.branch]}`;
      if (targetId) {
        await notifyPeople([targetId], { title: "Can you take a shift?", body: `${firstName(myName)} asked if you can take ${when}. Open the app to say yes or no.`, url: "/meet", tag: `req-${r.id}` }).catch(() => {});
      } else {
        const free = await freeOn(shift.date, me.person.id);
        await notifyPeople(free.map((p) => p.id), { title: "Shift up for grabs", body: `${firstName(myName)} can't do ${when}. Open the app if you can take it.`, url: "/meet", tag: `req-${r.id}` }, { email: false }).catch(() => {});
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "timeoff") {
      if (!isDate(body.from) || !isDate(body.to) || body.to < body.from) return NextResponse.json({ error: "Pick the first and last day off" }, { status: 400 });
      if (body.from < today) return NextResponse.json({ error: "Time off has to be today or later" }, { status: 400 });
      if ((new Date(`${body.to}T12:00:00Z`).getTime() - new Date(`${body.from}T12:00:00Z`).getTime()) / 86400_000 > 31) {
        return NextResponse.json({ error: "Ask for 31 days or fewer at a time" }, { status: 400 });
      }
      await prisma.meetRequest.create({ data: { kind: "timeoff", clockinId: me.person.id, status: "asked", fromDate: body.from, toDate: body.to, reason } });
      await tellManagers("Time off asked", `${myName} asked for ${range(body.from, body.to)} off.`, me.person.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "cancel") {
      const r = await prisma.meetRequest.findUnique({ where: { id: String(body.id || "") } });
      if (!r || r.clockinId !== me.person.id) return NextResponse.json({ error: "Request not found" }, { status: 404 });
      if (!["asked", "open", "agreed"].includes(r.status)) return NextResponse.json({ error: "That request has already been decided" }, { status: 400 });
      await prisma.meetRequest.update({ where: { id: r.id }, data: { status: "cancelled" } });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "answer") {
      const r = await prisma.meetRequest.findUnique({ where: { id: String(body.id || "") } });
      if (!r || r.kind !== "swap") return NextResponse.json({ error: "Request not found" }, { status: 404 });
      const forMe = (r.status === "asked" && r.targetId === me.person.id) || (r.status === "open" && r.clockinId !== me.person.id);
      if (!forMe) return NextResponse.json({ error: "This has already been taken or answered" }, { status: 400 });
      const staff = await getClockinStaff();
      const askerName = staff.find((s) => s.id === r.clockinId)?.name || "Your colleague";
      const when = `${day(r.shiftDate)} ${r.shiftStart} – ${r.shiftEnd}`;

      if (body.accept) {
        if ((await getShifts(r.shiftDate, r.shiftDate)).some((s) => s.staffId === me.person.id)) return NextResponse.json({ error: "You already have a shift that day" }, { status: 400 });
        await prisma.meetRequest.update({ where: { id: r.id }, data: { status: "agreed", targetId: me.person.id, answeredAt: new Date() } });
        await notifyPeople([r.clockinId], { title: "Swap agreed", body: `${firstName(myName)} can take your shift on ${when}. A manager will confirm it.`, url: "/meet?tab=rota", tag: `req-${r.id}` }).catch(() => {});
        await tellManagers("Swap to approve", `${firstName(askerName)} → ${firstName(myName)}: ${when}.`, me.person.id);
      } else if (r.status === "asked") {
        await prisma.meetRequest.update({ where: { id: r.id }, data: { status: "declined", answeredAt: new Date(), decidedBy: myName.slice(0, 80) } });
        await notifyPeople([r.clockinId], { title: "Swap not possible", body: `${firstName(myName)} can't take your shift on ${when}. You can ask someone else.`, url: "/meet?tab=rota", tag: `req-${r.id}` }).catch(() => {});
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't send that" }, { status: 502 });
  }
}
