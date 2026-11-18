import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { getClockinStaff, getShifts } from "@/lib/clockin";
import { isDate, mondayOf, addDays, shiftHours, londonToday } from "@/lib/meet-rota";
import { approveSwap, approvedOffOn, day, range, firstName } from "@/lib/meet-requests";
import { notifyPeople } from "@/lib/meet-notify";

export const dynamic = "force-dynamic";

/** GET: requests waiting for a manager (with checks), ones still with a colleague, and recent decisions. */
export async function GET() {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });

  try {
    const staff = await getClockinStaff();
    const nameOf = (id: number | null) => (id ? staff.find((s) => s.id === id)?.name || "Someone" : "");
    const today = londonToday();

    const open = await prisma.meetRequest.findMany({
      where: { OR: [{ kind: "swap", status: { in: ["asked", "open", "agreed"] }, shiftDate: { gte: today } }, { kind: "timeoff", status: "asked" }] },
      orderBy: { createdAt: "asc" },
    });
    const recent = await prisma.meetRequest.findMany({
      where: { status: { in: ["approved", "declined"] }, decidedAt: { gte: new Date(Date.now() - 21 * 86400_000) } },
      orderBy: { decidedAt: "desc" },
      take: 12,
    });

    const items = [];
    for (const r of open) {
      const base = {
        id: r.id, kind: r.kind, status: r.status, by: nameOf(r.clockinId), byId: r.clockinId, target: nameOf(r.targetId), targetId: r.targetId || 0,
        date: r.shiftDate, start: r.shiftStart, end: r.shiftEnd, branch: r.branch, from: r.fromDate, to: r.toDate,
        reason: r.reason, createdAt: r.createdAt.toISOString(), checks: [] as { ok: boolean; text: string }[],
      };
      if (r.kind === "swap" && r.status === "agreed" && r.targetId) {
        // Is the colleague still free, and how many hours would they have that week?
        const monday = mondayOf(r.shiftDate);
        const week = await getShifts(monday, addDays(monday, 6));
        const theirs = week.filter((s) => s.staffId === r.targetId);
        const busy = theirs.some((s) => s.date === r.shiftDate);
        const hours = theirs.reduce((n, s) => n + shiftHours(s.start, s.end), 0) + shiftHours(r.shiftStart, r.shiftEnd);
        const t = firstName(nameOf(r.targetId));
        base.checks.push(busy ? { ok: false, text: `${t} now has a shift that day` } : { ok: true, text: `${t} has no other shift that day` });
        base.checks.push(hours > 48 ? { ok: false, text: `${t} would have ${Math.round(hours)}h that week` } : { ok: true, text: `${t} would have ${Math.round(hours)}h that week` });
      }
      if (r.kind === "timeoff") {
        const theirShifts = (await getShifts(r.fromDate, r.toDate)).filter((s) => s.staffId === r.clockinId);
        if (theirShifts.length) base.checks.push({ ok: false, text: `Has ${theirShifts.length} shift${theirShifts.length === 1 ? "" : "s"} on those days: ${theirShifts.slice(0, 3).map((s) => day(s.date)).join(", ")}${theirShifts.length > 3 ? "…" : ""}` });
        const alsoOff = new Set<number>();
        for (let d = r.fromDate; d <= r.toDate; d = addDays(d, 1)) (await approvedOffOn(d)).forEach((id) => id !== r.clockinId && alsoOff.add(id));
        if (alsoOff.size) base.checks.push({ ok: false, text: `Also off then: ${Array.from(alsoOff).map((id) => firstName(nameOf(id))).join(", ")}` });
        if (!theirShifts.length && !alsoOff.size) base.checks.push({ ok: true, text: "No shifts on those days and no one else off" });
      }
      items.push(base);
    }

    return NextResponse.json(
      {
        waiting: items.filter((i) => i.kind === "timeoff" || i.status === "agreed"),
        withColleague: items.filter((i) => i.kind === "swap" && i.status !== "agreed"),
        recent: recent.map((r) => ({
          id: r.id, kind: r.kind, status: r.status, by: nameOf(r.clockinId), target: nameOf(r.targetId),
          date: r.shiftDate, from: r.approvedFrom || r.fromDate, to: r.approvedTo || r.toDate, decidedBy: r.decidedBy, decidedAt: r.decidedAt?.toISOString() || "",
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load requests" }, { status: 502 });
  }
}

/** POST { id, action: "approve" | "decline", from?, to? }  (from/to: approve part of a time-off request) */
export async function POST(req: Request) {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const r = await prisma.meetRequest.findUnique({ where: { id: String(body.id || "") } });
  if (!r) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  const by = me.person.name.slice(0, 80);

  try {
    if (body.action === "decline") {
      if (!["asked", "open", "agreed"].includes(r.status)) return NextResponse.json({ error: "Already decided" }, { status: 400 });
      await prisma.meetRequest.update({ where: { id: r.id }, data: { status: "declined", decidedBy: by, decidedAt: new Date() } });
      const what = r.kind === "swap" ? `Your swap for ${day(r.shiftDate)} ${r.shiftStart} – ${r.shiftEnd}` : `Your time off for ${range(r.fromDate, r.toDate)}`;
      await notifyPeople([r.clockinId], { title: "Request declined", body: `${what} wasn't approved. Speak to ${firstName(me.person.name)} if you'd like to talk about it.`, url: "/meet?tab=rota", tag: `req-${r.id}` }).catch(() => {});
      if (r.kind === "swap" && r.targetId && r.status === "agreed") {
        await notifyPeople([r.targetId], { title: "Swap not approved", body: `The swap for ${day(r.shiftDate)} wasn't approved, so you're not on that shift.`, url: "/meet?tab=rota", tag: `req-${r.id}` }).catch(() => {});
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "approve") {
      if (r.kind === "swap") {
        const res = await approveSwap(r.id, me.person.name);
        return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: res.error }, { status: 400 });
      }
      if (r.status !== "asked") return NextResponse.json({ error: "Already decided" }, { status: 400 });
      const from = isDate(body.from) ? body.from : r.fromDate;
      const to = isDate(body.to) ? body.to : r.toDate;
      if (from < r.fromDate || to > r.toDate || to < from) return NextResponse.json({ error: "Pick days inside what they asked for" }, { status: 400 });
      await prisma.meetRequest.update({ where: { id: r.id }, data: { status: "approved", approvedFrom: from, approvedTo: to, decidedBy: by, decidedAt: new Date() } });
      const part = from !== r.fromDate || to !== r.toDate;
      await notifyPeople([r.clockinId], {
        title: "Time off approved",
        body: part ? `${range(from, to)} is approved (you asked for ${range(r.fromDate, r.toDate)}).` : `${range(from, to)} is approved. Enjoy it.`,
        url: "/meet?tab=rota",
        tag: `req-${r.id}`,
      }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save that" }, { status: 502 });
  }
}

