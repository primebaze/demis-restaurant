import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { activePeople, firstNameOf } from "@/lib/meet-people";
import { getShifts } from "@/lib/clockin";
import { londonToday, mondayOf, addDays } from "@/lib/meet-rota";
import { londonDate, londonToDate } from "@/lib/meet-meetings";

export const dynamic = "force-dynamic";

const LATE_MS = 5 * 60_000; // joined more than 5 minutes after the start

type Cell = "attended" | "late" | "missed_on" | "missed_off" | "not_invited";

/** GET ?period=week|month|3months[&export=csv] : every finished meeting × every person (design 11). */
export async function GET(req: Request) {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const url = new URL(req.url);
  const period = ["week", "month", "3months"].includes(url.searchParams.get("period") || "") ? url.searchParams.get("period")! : "month";
  const today = londonToday();
  const from = period === "week" ? mondayOf(today) : period === "month" ? today.slice(0, 8) + "01" : addDays(today, -91);

  try {
    const meetings = await prisma.meetMeeting.findMany({
      where: { status: { in: ["ended", "ready"] }, startsAt: { gte: londonToDate(from, "00:00"), lt: londonToDate(addDays(today, 1), "00:00") } },
      orderBy: { startsAt: "asc" },
    });
    const attendees = await prisma.meetAttendee.findMany({ where: { meetingId: { in: meetings.map((m) => m.id) } } });
    const people = await activePeople();
    const shifts = meetings.length ? await getShifts(londonDate(meetings[0].startsAt), londonDate(meetings[meetings.length - 1].startsAt)).catch(() => []) : [];

    const cellFor = (personId: number, m: (typeof meetings)[number]): Cell => {
      const a = attendees.find((x) => x.meetingId === m.id && x.clockinId === personId);
      if (!a) return "not_invited";
      if (m.kind === "room" ? a.inRoom : !!a.joinedAt) {
        if (m.kind === "call" && a.joinedAt && m.startedAt && a.joinedAt.getTime() - m.startedAt.getTime() > LATE_MS) return "late";
        return "attended";
      }
      if (!a.invited) return "not_invited";
      return shifts.some((s) => s.staffId === personId && s.date === londonDate(m.startsAt)) ? "missed_on" : "missed_off";
    };

    const rows = people
      .map((p) => {
        const cells = meetings.map((m) => cellFor(p.id, m));
        const asked = cells.filter((c) => c !== "not_invited").length;
        const came = cells.filter((c) => c === "attended" || c === "late").length;
        return { id: p.id, name: p.name, branch: p.branch, cells, asked, came, rate: asked ? Math.round((came / asked) * 100) : null };
      })
      .filter((r) => r.asked > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const all = rows.flatMap((r) => r.cells).filter((c) => c !== "not_invited");
    const stats = {
      held: meetings.length,
      average: all.length ? Math.round((all.filter((c) => c === "attended" || c === "late").length / all.length) * 100) : 0,
      late: all.filter((c) => c === "late").length,
      missedOnShift: all.filter((c) => c === "missed_on").length,
    };
    const cols = meetings.map((m) => ({ id: m.id, date: londonDate(m.startsAt), title: m.title, short: firstNameOf(m.title.replace(/^(weekly|the)\s+/i, "")).replace(/['’]s?$/, "") }));

    if (url.searchParams.get("export") === "csv") {
      const label: Record<Cell, string> = { attended: "Attended", late: "Late", missed_on: "Missed (on shift)", missed_off: "Missed (off shift)", not_invited: "" };
      const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const lines = [["Person", "Branch", ...cols.map((c) => `${c.date} ${c.title}`), "Rate"].map(esc).join(",")];
      for (const r of rows) lines.push([r.name, r.branch, ...r.cells.map((c) => label[c]), r.rate == null ? "" : `${r.rate}%`].map(esc).join(","));
      return new NextResponse(lines.join("\r\n") + "\r\n", {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="demis-attendance-${from}.csv"`, "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json({ period, from, stats, meetings: cols, rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load attendance" }, { status: 502 });
  }
}
