import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";


/**
 * GET /api/admin/calendar?month=2026-04&location=cricklewood
 * Returns booking counts per date for a given month
 */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "2026-04"
  const locationSlug = searchParams.get("location");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Missing or invalid month (YYYY-MM)" }, { status: 400 });
  }

  const [year, mon] = month.split("-").map(Number);
  const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
  const endDay = new Date(year, mon, 0).getDate();
  const endDate = `${year}-${String(mon).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  const where: Record<string, unknown> = {
    date: { gte: startDate, lte: endDate },
    status: { in: ["confirmed", "pending_payment", "modified"] },
  };

  if (locationSlug) {
    const location = await prisma.location.findUnique({ where: { slug: locationSlug } });
    if (location) where.locationId = location.id;
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      date: true,
      time: true,
      partySize: true,
      status: true,
      confirmationCode: true,
      guest: { select: { name: true } },
      location: { select: { name: true, slug: true } },
      timeSlot: { select: { startTime: true, endTime: true } },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  // Group by date
  const byDate: Record<string, typeof bookings> = {};
  for (const b of bookings) {
    if (!byDate[b.date]) byDate[b.date] = [];
    byDate[b.date].push(b);
  }

  // Summary per date
  const dates = Object.entries(byDate).map(([date, items]) => ({
    date,
    count: items.length,
    totalCovers: items.reduce((sum, b) => sum + b.partySize, 0),
    bookings: items.map((b) => ({
      id: b.id,
      code: b.confirmationCode,
      guest: b.guest.name,
      partySize: b.partySize,
      time: b.timeSlot ? b.timeSlot.startTime : b.time,
      location: b.location.name,
      status: b.status,
    })),
  }));

  return NextResponse.json({ month, dates });
}
