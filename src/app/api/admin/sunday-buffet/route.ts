import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { upcomingSunday, prettyDate } from "@/lib/sunday-buffet";
export const dynamic = "force-dynamic";

/** POST /api/admin/sunday-buffet — { action: "reset", date } clears a Sunday's reservations. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const date = body.date || upcomingSunday();

  if (body.action === "reset") {
    const { count } = await prisma.sundayBuffetBooking.deleteMany({ where: { date } });
    return NextResponse.json({ ok: true, deleted: count });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/** GET /api/admin/sunday-buffet?date=YYYY-MM-DD — reservations for a Sunday. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") || upcomingSunday();

  try {
    const rows = await prisma.sundayBuffetBooking.findMany({
      where: { date },
      orderBy: { createdAt: "asc" },
    });
    const bookings = rows.map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email,
      phone: b.phone,
      partySize: b.partySize,
      status: b.status,
      createdAt: b.createdAt,
    }));
    const active = rows.filter((b) => b.status !== "cancelled");
    const people = active.reduce((s, b) => s + b.partySize, 0);
    return NextResponse.json({
      date,
      prettyDate: prettyDate(date),
      bookings,
      summary: { reservations: active.length, people, cancelled: rows.length - active.length },
    });
  } catch {
    return NextResponse.json({
      date, prettyDate: prettyDate(date), bookings: [],
      summary: { reservations: 0, people: 0, cancelled: 0 }, notMigrated: true,
    });
  }
}
