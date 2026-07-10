import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { upcomingSunday, prettyDate, groupPrice } from "@/lib/sunday-buffet";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sunday-buffet — admin actions on a Sunday's count.
 * Body: { action: "reset", date } — clear all bookings for that Sunday (back to No. 1).
 *       { action: "adjust", date, covers } — add N covers (e.g. walk-ins), bumping the count.
 */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const date = body.date || upcomingSunday();

  if (body.action === "reset") {
    const { count } = await prisma.sundayBuffetBooking.deleteMany({ where: { date } });
    return NextResponse.json({ ok: true, deleted: count });
  }

  if (body.action === "adjust") {
    const covers = Math.max(1, Math.min(500, parseInt(body.covers) || 1));
    for (let attempt = 0; attempt < 6; attempt++) {
      const last = await prisma.sundayBuffetBooking.findFirst({
        where: { date },
        orderBy: { number: "desc" },
        select: { number: true, partySize: true },
      });
      const startCover = last ? last.number + last.partySize : 1;
      try {
        await prisma.sundayBuffetBooking.create({
          data: { date, number: startCover, partySize: covers, name: "Manual (walk-ins)", status: "booked" },
        });
        return NextResponse.json({ ok: true });
      } catch (e: unknown) {
        if ((e as { code?: string }).code === "P2002") continue;
        throw e;
      }
    }
    return NextResponse.json({ error: "Please try again" }, { status: 409 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/** GET /api/admin/sunday-buffet?date=YYYY-MM-DD — bookings for a Sunday + summary. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") || upcomingSunday();

  try {
    const rows = await prisma.sundayBuffetBooking.findMany({
      where: { date },
      orderBy: { number: "asc" },
    });

    const bookings = rows.map((b) => ({
      id: b.id,
      number: b.number,
      endCover: b.number + b.partySize - 1,
      partySize: b.partySize,
      name: b.name,
      email: b.email,
      phone: b.phone,
      status: b.status,
      total: groupPrice(b.number, b.partySize),
      createdAt: b.createdAt,
    }));

    const active = rows.filter((b) => b.status !== "cancelled");
    const covers = active.reduce((s, b) => s + b.partySize, 0);
    const revenue = active.reduce((s, b) => s + groupPrice(b.number, b.partySize), 0);
    // Cover counts per tier (based on the highest cover used)
    const highest = rows.reduce((m, b) => Math.max(m, b.number + b.partySize - 1), 0);
    const tier20 = Math.min(highest, 20);
    const tier25 = Math.max(0, Math.min(highest, 45) - 20);
    const tier30 = Math.max(0, highest - 45);

    return NextResponse.json({
      date,
      prettyDate: prettyDate(date),
      bookings,
      summary: {
        parties: active.length,
        covers,
        revenue,
        tier20,
        tier25,
        tier30,
        cancelled: rows.length - active.length,
      },
    });
  } catch {
    return NextResponse.json({
      date, prettyDate: prettyDate(date), bookings: [],
      summary: { parties: 0, covers: 0, revenue: 0, tier20: 0, tier25: 0, tier30: 0, cancelled: 0 },
      notMigrated: true,
    });
  }
}
