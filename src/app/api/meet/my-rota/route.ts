import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { getClockinStaff, getShifts } from "@/lib/clockin";
import { addDays, londonToday, mondayOf, weekDays, weekLabel, shiftHours, publishedWeeks, shiftBranch } from "@/lib/meet-rota";

export const dynamic = "force-dynamic";

/**
 * GET: this week and next for the signed-in person. Only weeks a manager has
 * published are shown. Includes the whole team for the branches they work at,
 * and any newly published rota they haven't opened yet.
 */
export async function GET() {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  try {
    const today = londonToday();
    const mondays = [mondayOf(today), addDays(mondayOf(today), 7)];
    const shown = await publishedWeeks(mondays);
    const all = shown.size ? await getShifts(mondays[0], addDays(mondays[1], 6)) : [];
    const visible = all.filter((s) => shown.has(mondayOf(s.date)));

    const tags = await prisma.meetShiftBranch.findMany({ where: { shiftId: { in: visible.map((s) => s.id) } } });
    const homes = await prisma.meetStaff.findMany();
    const tagOf = new Map(tags.map((t) => [t.shiftId, t.branch]));
    const homeOf = new Map(homes.map((h) => [h.clockinId, h.branch]));
    const branchOf = (s: (typeof visible)[number]) => shiftBranch(s.id, s.staffId, tagOf, homeOf);

    const staff = await getClockinStaff();
    const nameOf = new Map(staff.filter((s) => s.active).map((s) => [s.id, s.name]));
    const roleOf = new Map(staff.map((s) => [s.id, s.role]));

    const weeks = mondays.map((monday) => {
      const days = weekDays(monday);
      const inWeek = visible.filter((s) => s.date >= days[0] && s.date <= days[6]);
      const mine = inWeek.filter((s) => s.staffId === me.person.id);
      const myBranches = new Set(mine.map(branchOf).filter(Boolean));
      if (myBranches.size === 0 && (me.branch === "cricklewood" || me.branch === "streatham")) myBranches.add(me.branch);
      const team = inWeek
        .filter((s) => nameOf.has(s.staffId) && (myBranches.size === 0 || myBranches.has(branchOf(s))))
        .map((s) => ({ date: s.date, start: s.start, end: s.end, name: nameOf.get(s.staffId)!, role: roleOf.get(s.staffId) || "", me: s.staffId === me.person.id, branch: branchOf(s) }));
      return {
        week: monday,
        label: weekLabel(monday),
        published: shown.has(monday),
        days,
        mine: mine.map((s) => ({ id: s.id, date: s.date, start: s.start, end: s.end, notes: s.notes, branch: branchOf(s), hours: shiftHours(s.start, s.end) })),
        team,
      };
    });

    // Newly published rotas with me on them that I haven't opened.
    const pubs = await prisma.meetRotaPublish.findMany({ where: { weekStart: { in: mondays } }, orderBy: { publishedAt: "desc" } });
    const latest = new Map<string, (typeof pubs)[number]>();
    for (const p of pubs) if (!latest.has(`${p.weekStart}|${p.branch}`)) latest.set(`${p.weekStart}|${p.branch}`, p);
    const mineIn = Array.from(latest.values()).filter((p) => ((p.snapshot as string[]) || []).some((k) => Number(k.split("|")[0]) === me.person.id));
    const seen = await prisma.meetRotaSeen.findMany({ where: { clockinId: me.person.id, publishId: { in: mineIn.map((p) => p.id) } } });
    const seenIds = new Set(seen.map((s) => s.publishId));
    const unseen = mineIn.filter((p) => !seenIds.has(p.id));

    return NextResponse.json(
      { today, weeks, unseen: unseen.map((p) => ({ id: p.id, week: p.weekStart, label: weekLabel(p.weekStart), branch: p.branch })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load the rota" }, { status: 502 });
  }
}

/** POST { seen: [publishId, ...] } : they've opened the new rota. */
export async function POST(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.seen) ? body.seen.filter((x: unknown) => typeof x === "string").slice(0, 10) : [];
  for (const publishId of ids) {
    await prisma.meetRotaSeen.upsert({ where: { publishId_clockinId: { publishId, clockinId: me.person.id } }, create: { publishId, clockinId: me.person.id }, update: {} });
  }
  return NextResponse.json({ ok: true });
}
