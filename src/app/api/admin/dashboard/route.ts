import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";


/**
 * GET /api/admin/dashboard — Dashboard stats
 */
// UK service date (server runs in UTC, so derive London date)
function ukToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

// Shift a YYYY-MM-DD string by n days, timezone-safe
function shiftDate(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().split("T")[0];
}

export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = ukToday();

  // Selected day for the bookings list — defaults to today, navigable via ?date=
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  // Location slug → display name (set-menu / buffet store slug, not a relation)
  const locations = await prisma.location.findMany({ select: { slug: true, name: true } });
  const slugToName: Record<string, string> = {};
  for (const l of locations) slugToName[l.slug] = l.name;
  const locName = (slug: string) => slugToName[slug] || slug;

  type TodayRow = {
    id: string;
    confirmationCode: string;
    guest: string;
    phone: string;
    email: string;
    location: string;
    time: string;
    slot: string;
    partySize: number;
    status: string;
    notes: string;
    type: string;
    sortKey: string;
  };

  // Build the merged, sorted bookings (website + set-menu + buffet) for one date.
  // Buffet is wrapped defensively: if the table isn't migrated yet it must not break the dashboard.
  async function buildDayRows(date: string): Promise<TodayRow[]> {
    const [websiteBookings, setMenu, buffet] = await Promise.all([
      prisma.booking.findMany({
        where: { date, status: { in: ["confirmed", "modified", "pending_payment"] } },
        include: { location: true, guest: true, timeSlot: true },
        orderBy: { time: "asc" },
      }),
      prisma.setMenuGroup.findMany({
        where: { date, status: "active" },
        include: { selections: true },
      }),
      prisma.buffetBooking
        .findMany({ where: { date, status: "confirmed" } })
        .catch(() => []),
    ]);

    const websiteRows: TodayRow[] = websiteBookings.map((b) => ({
      id: b.id,
      confirmationCode: b.confirmationCode,
      guest: b.guest.name,
      phone: b.guest.phone || "",
      email: b.guest.email || "",
      location: b.location.name,
      time: b.time,
      slot: `${b.timeSlot.startTime} – ${b.timeSlot.endTime}`,
      partySize: b.partySize,
      status: b.status,
      notes: b.notes || "",
      type: "Website",
      sortKey: b.time,
    }));

    const setMenuRows: TodayRow[] = setMenu.map((g) => ({
      id: g.id,
      confirmationCode: g.groupCode,
      guest: g.organizerName,
      phone: g.organizerPhone || "",
      email: g.organizerEmail || "",
      location: locName(g.locationSlug),
      time: "",
      slot: "All day",
      partySize: g.selections.length || g.partySize,
      status: "confirmed",
      notes: g.notes || "",
      type: "Set Menu",
      sortKey: "99:98",
    }));

    const buffetRows: TodayRow[] = buffet.map((b) => ({
      id: b.id,
      confirmationCode: b.bookingCode,
      guest: b.name,
      phone: b.phone || "",
      email: b.email || "",
      location: locName(b.locationSlug),
      time: b.time,
      slot: b.time,
      partySize: b.partySize,
      status: b.status,
      notes: b.notes || "",
      type: "Buffet",
      sortKey: b.time || "99:99",
    }));

    return [...websiteRows, ...setMenuRows, ...buffetRows].sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey)
    );
  }

  // Selected-day rows for the table; actual-today rows for the stat cards.
  const targetRows = await buildDayRows(targetDate);
  const actualTodayRows = targetDate === today ? targetRows : await buildDayRows(today);
  const targetCovers = targetRows.reduce((sum, b) => sum + b.partySize, 0);
  const todayCovers = actualTodayRows.reduce((sum, b) => sum + b.partySize, 0);

  // Stats for last 30 days
  const thirtyDaysAgoStr = shiftDate(today, -30);

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
  const sevenDaysStr = shiftDate(today, 7);

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
      date: targetDate,
      isToday: targetDate === today,
      bookings: targetRows.map((r) => ({
        id: r.id,
        confirmationCode: r.confirmationCode,
        guest: r.guest,
        phone: r.phone,
        email: r.email,
        location: r.location,
        time: r.time,
        slot: r.slot,
        partySize: r.partySize,
        status: r.status,
        notes: r.notes,
        type: r.type,
      })),
      totalCovers: targetCovers,
      totalBookings: targetRows.length,
    },
    stats: {
      todayBookings: actualTodayRows.length,
      todayCovers,
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
