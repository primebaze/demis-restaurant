import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { housekeeping } from "@/lib/meet-housekeeping";
import { londonToday } from "@/lib/meet-rota";

export const dynamic = "force-dynamic";

/** GET: the numbers on the manager sidebar (things waiting for a manager). */
export async function GET() {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  await housekeeping().catch(() => {});
  const today = londonToday();
  const [rota, hours, reports, tasks, phones, live] = await Promise.all([
    prisma.meetRequest.count({ where: { OR: [{ kind: "timeoff", status: "asked" }, { kind: "swap", status: "agreed", shiftDate: { gte: today } }] } }),
    prisma.meetHoursFix.count({ where: { status: "asked" } }),
    prisma.meetReport.count({ where: { status: "new", OR: [{ aboutId: null }, { aboutId: { not: me.person.id } }] } }),
    prisma.meetTask.count({ where: { OR: [{ status: "help" }, { status: "suggested" }] } }),
    prisma.meetDevice.count({ where: { status: "pending", createdAt: { gte: new Date(Date.now() - 14 * 86400_000) } } }),
    prisma.meetMeeting.count({ where: { status: "live" } }),
  ]);
  return NextResponse.json({ rota, hours, reports, tasks, staff: phones, calendar: live }, { headers: { "Cache-Control": "no-store" } });
}
