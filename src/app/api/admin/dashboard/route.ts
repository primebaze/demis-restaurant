import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";


/**
 * GET /api/admin/dashboard — Dashboard stats
 */
export async function GET() {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  // Location slug → display name (set-menu / buffet store slug, not a relation)
  const locations = await prisma.location.findMany({ select: { slug: true, name: true } });
  const slugToName: Record<string, string> = {};
  for (const l of locations) slugToName[l.slug] = l.name;
  const locName = (slug: string) => slugToName[slug] || slug;

  // Today's bookings — merge website bookings, set-menu groups, and buffet bookings.
  // Buffet is wrapped defensively: if the table isn't migrated yet it must not break the dashboard.
  const [websiteBookings, todaySetMenu, todayBuffet] = await Promise.all([
    prisma.booking.findMany({
      where: { date: today, status: { in: ["confirmed", "modified", "pending_payment"] } },
      include: { location: true, guest: true, timeSlot: true },
      orderBy: { time: "asc" },
    }),
    prisma.setMenuGroup.findMany({
      where: { date: today, status: "active" },
      include: { selections: true },
    }),
    prisma.buffetBooking
      .findMany({ where: { date: today, status: "confirmed" } })
      .catch(() => []),
  ]);

  type TodayRow = {
    id: string;
    confirmationCode: string;
    guest: string;
    location: string;
    time: string;
    slot: string;
    partySize: number;
    status: string;
    type: string;
    sortKey: string;
  };

  const websiteRows: TodayRow[] = websiteBookings.map((b) => ({
    id: b.id,
    confirmationCode: b.confirmationCode,
    guest: b.guest.name,
    location: b.location.name,
    time: b.time,
    slot: `${b.timeSlot.startTime} – ${b.timeSlot.endTime}`,
    partySize: b.partySize,
    status: b.status,
    type: "Website",
    sortKey: b.time,
  }));

  const setMenuRows: TodayRow[] = todaySetMenu.map((g) => ({
    id: g.id,
    confirmationCode: g.groupCode,
    guest: g.organizerName,
    location: locName(g.locationSlug),
    time: "",
    slot: "All day",
    partySize: g.selections.length || g.partySize,
    status: "confirmed",
    type: "Set Menu",
    sortKey: "99:98",
  }));

  const buffetRows: TodayRow[] = todayBuffet.map((b) => ({
    id: b.id,
    confirmationCode: b.bookingCode,
    guest: b.name,
    location: locName(b.locationSlug),
    time: b.time,
    slot: b.time,
    partySize: b.partySize,
    status: b.status,
    type: "Buffet",
    sortKey: b.time || "99:99",
  }));

  const todayRows = [...websiteRows, ...setMenuRows, ...buffetRows].sort((a, b) =>
    a.sortKey.localeCompare(b.sortKey)
  );

  const todayCovers = todayRows.reduce((sum, b) => sum + b.partySize, 0);

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

  const [upcomingBookingCount, upcomingSetMenuCount, upcomingBuffetCount] = await Promise.all([
    prisma.booking.count({
      where: {
        date: { gte: today, lte: sevenDaysStr },
        status: { in: ["confirmed", "modified", "pending_payment"] },
      },
    }),
    prisma.setMenuGroup.count({
      where: { date: { gte: today, lte: sevenDaysStr }, status: "active" },
    }),
    prisma.buffetBooking
      .count({ where: { date: { gte: today, lte: sevenDaysStr }, status: "confirmed" } })
      .catch(() => 0),
  ]);
  const upcomingCount = upcomingBookingCount + upcomingSetMenuCount + upcomingBuffetCount;

  // Total guests
  const totalGuests = await prisma.guest.count();

  return NextResponse.json({
    today: {
      bookings: todayRows.map((r) => ({
        id: r.id,
        confirmationCode: r.confirmationCode,
        guest: r.guest,
        location: r.location,
        time: r.time,
        slot: r.slot,
        partySize: r.partySize,
        status: r.status,
        type: r.type,
      })),
      totalCovers: todayCovers,
      totalBookings: todayRows.length,
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
