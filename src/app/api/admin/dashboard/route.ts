import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/dashboard — Dashboard stats
 */
export async function GET() {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  // Today's bookings
  const todayBookings = await prisma.booking.findMany({
    where: { date: today, status: { in: ["confirmed", "modified", "pending_payment"] } },
    include: { location: true, guest: true, timeSlot: true },
    orderBy: { time: "asc" },
  });

  const todayCovers = todayBookings.reduce((sum, b) => sum + b.partySize, 0);

  // Stats for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const recentBookings = await prisma.booking.findMany({
    where: { date: { gte: thirtyDaysAgoStr } },
    select: { status: true, partySize: true, depositAmountPence: true, depositStatus: true },
  });

  const totalBookings30d = recentBookings.length;
  const confirmedBookings30d = recentBookings.filter((b) =>
    ["confirmed", "modified", "completed"].includes(b.status)
  ).length;
  const noShows30d = recentBookings.filter((b) => b.status === "no_show").length;
  const noShowRate = totalBookings30d > 0 ? ((noShows30d / totalBookings30d) * 100).toFixed(1) : "0";
  const totalCovers30d = recentBookings
    .filter((b) => ["confirmed", "modified", "completed"].includes(b.status))
    .reduce((sum, b) => sum + b.partySize, 0);
  const depositsCaptured = recentBookings
    .filter((b) => b.depositStatus === "captured")
    .reduce((sum, b) => sum + b.depositAmountPence, 0);

  // Upcoming bookings (next 7 days)
  const sevenDaysAhead = new Date();
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
  const sevenDaysStr = sevenDaysAhead.toISOString().split("T")[0];

  const upcomingCount = await prisma.booking.count({
    where: {
      date: { gte: today, lte: sevenDaysStr },
      status: { in: ["confirmed", "modified", "pending_payment"] },
    },
  });

  // Total guests
  const totalGuests = await prisma.guest.count();

  return NextResponse.json({
    today: {
      bookings: todayBookings.map((b) => ({
        id: b.id,
        confirmationCode: b.confirmationCode,
        guest: b.guest.name,
        location: b.location.name,
        time: b.time,
        slot: `${b.timeSlot.startTime} – ${b.timeSlot.endTime}`,
        partySize: b.partySize,
        status: b.status,
      })),
      totalCovers: todayCovers,
      totalBookings: todayBookings.length,
    },
    stats: {
      totalBookings30d,
      confirmedBookings30d,
      noShows30d,
      noShowRate: `${noShowRate}%`,
      totalCovers30d,
      depositsCapturedPence: depositsCaptured,
      upcomingNext7Days: upcomingCount,
      totalGuests,
    },
  });
}
