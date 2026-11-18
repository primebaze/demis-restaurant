import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { getTimesheets, setDayHours } from "@/lib/clockin";
import { activePeople, firstNameOf } from "@/lib/meet-people";
import { londonToday, mondayOf, addDays, isDate, isTime, weekRota, weekLabel, shiftHours, dayLabel } from "@/lib/meet-rota";
import { notifyPeople } from "@/lib/meet-notify";
import { dayHoursWithFix, spanMinutes, hoursWatchList, repeatFixIds } from "@/lib/meet-hours";

export const dynamic = "force-dynamic";

/**
 * GET ?week=YYYY-MM-DD           : the week's hours against the rota, fixes to approve, missed clock-outs.
 * GET ?week=...&export=csv       : the same week for payroll.
 */
export async function GET(req: Request) {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const url = new URL(req.url);
  const w = url.searchParams.get("week");
  const monday = mondayOf(isDate(w) ? w : londonToday());
  const sunday = addDays(monday, 6);

  try {
    const people = await activePeople();
    const sheets = await getTimesheets(monday, sunday);
    const rota = await weekRota(monday, people);
    const today = londonToday();
    const fixes = await prisma.meetHoursFix.findMany({ where: { status: "asked" }, orderBy: { createdAt: "asc" } });

    if (url.searchParams.get("export") === "csv") {
      const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
      const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const lines = [["Name", "Role", "Hourly rate", ...days.map((d) => dayLabel(d)), "Total hours", "Pay"].map(esc).join(",")];
      for (const s of sheets) {
        const byDay = new Map(s.days.map((d) => [d.date, d.hours]));
        lines.push([s.name, s.role, s.rate.toFixed(2), ...days.map((d) => (byDay.get(d) || 0).toFixed(2)), s.total.toFixed(2), s.pay.toFixed(2)].map(esc).join(","));
      }
      return new NextResponse(lines.join("\r\n") + "\r\n", {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="demis-hours-${monday}.csv"`, "Cache-Control": "no-store" },
      });
    }

    const missed: { staffId: number; name: string; date: string; in: string }[] = [];
    const rows = sheets.map((s) => {
      const planned = rota.shifts.filter((x) => x.staffId === s.staffId);
      const rotaHours = planned.reduce((n, x) => n + shiftHours(x.start, x.end), 0);
      const worked = s.days.reduce((n, d) => n + d.hours, 0);
      const misses = s.days.flatMap((d) => d.shifts.filter((x) => !x.out && d.date < today && !d.adjusted).map((x) => ({ date: d.date, in: x.in })));
      misses.forEach((m) => missed.push({ staffId: s.staffId, name: s.name, ...m }));
      return {
        staffId: s.staffId, name: s.name, shifts: s.days.reduce((n, d) => n + d.shifts.length, 0), rota: Math.round(rotaHours * 100) / 100,
        worked: Math.round(worked * 100) / 100, fixes: fixes.filter((f) => f.clockinId === s.staffId).length, missed: misses.map((m) => m.date),
      };
    }).filter((r) => r.shifts > 0 || r.rota > 0 || r.fixes > 0);

    // Each fix with what the rota said, so the manager can compare.
    const fixRota = new Map<string, { start: string; end: string }>();
    const fixWeeks = Array.from(new Set(fixes.map((f) => mondayOf(f.date))));
    for (const m of fixWeeks) for (const s of (await weekRota(m, people)).shifts) fixRota.set(`${s.staffId}|${s.date}`, { start: s.start, end: s.end });
    const nameOf = (id: number) => people.find((p) => p.id === id)?.name || "Someone";

    const watch = await hoursWatchList();
    const repeats = await repeatFixIds(fixes.map((f) => f.id));
    const workedTotal = rows.reduce((n, r) => n + r.worked, 0);
    const rotaTotal = rota.shifts.filter((s) => s.date <= today).reduce((n, s) => n + shiftHours(s.start, s.end), 0);
    return NextResponse.json({
      week: monday, weekLabel: weekLabel(monday),
      stats: { worked: Math.round(workedTotal * 10) / 10, againstRota: Math.round((workedTotal - rotaTotal) * 10) / 10, fixes: fixes.length, missed: missed.length },
      fixes: fixes.map((f) => {
        const r = fixRota.get(`${f.clockinId}|${f.date}`);
        const overBy = r ? spanMinutes(f.start, f.end) - spanMinutes(r.start, r.end) : 0;
        return { id: f.id, staffId: f.clockinId, name: nameOf(f.clockinId), date: f.date, wasStart: f.wasStart, wasEnd: f.wasEnd, start: f.start, end: f.end, reason: f.reason, rota: r || null, overBy, repeat: repeats.has(f.id), watch: watch.has(f.clockinId) };
      }),
      missed,
      watchList: Array.from(watch.entries()).map(([id, weeks]) => ({ staffId: id, name: nameOf(id), weeks })),
      rows: rows.sort((a, b) => a.name.localeCompare(b.name)),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load hours" }, { status: 502 });
  }
}

/** POST { id, action: "approve" | "decline", start?, end? } (start/end: approve with edited times) */
export async function POST(req: Request) {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const f = await prisma.meetHoursFix.findUnique({ where: { id: String(body.id || "") } });
  if (!f) return NextResponse.json({ error: "Fix not found" }, { status: 404 });
  if (f.status !== "asked") return NextResponse.json({ error: "Already decided" }, { status: 400 });
  const by = me.person.name.slice(0, 80);

  try {
    if (body.action === "decline") {
      await prisma.meetHoursFix.update({ where: { id: f.id }, data: { status: "declined", decidedBy: by, decidedAt: new Date() } });
      await notifyPeople([f.clockinId], { title: "Hours fix not approved", body: `Your fix for ${dayLabel(f.date)} wasn't approved. Speak to ${firstNameOf(by)} if you think it's wrong.`, url: "/meet?tab=me", tag: `fix-${f.id}`, icon: "schedule" }).catch(() => null);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "approve") {
      const start = isTime(body.start) ? body.start : f.start;
      const end = isTime(body.end) ? body.end : f.end;
      if (start === end || spanMinutes(start, end) > 16 * 60) return NextResponse.json({ error: "Check the times" }, { status: 400 });
      const [sheet] = await getTimesheets(f.date, f.date, f.clockinId);
      const hours = dayHoursWithFix(sheet, f.date, f.wasStart, start, end);
      await setDayHours(f.clockinId, f.date, hours, me.person.name);
      await prisma.meetHoursFix.update({ where: { id: f.id }, data: { status: "approved", start, end, decidedBy: by, decidedAt: new Date() } });
      await notifyPeople([f.clockinId], { title: "Hours fix approved", body: `${dayLabel(f.date)}: ${start} – ${end} is now on your hours.`, url: "/meet?tab=me", tag: `fix-${f.id}`, icon: "task_alt" }).catch(() => null);
      return NextResponse.json({ ok: true, hours });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save that" }, { status: 502 });
  }
}
