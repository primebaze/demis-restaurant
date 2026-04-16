import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/settings — Get all settings data
 */
export async function GET() {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [locations, policies, addOns, blackoutDates, timeSlots] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.bookingPolicy.findMany(),
    prisma.addOn.findMany({ orderBy: { name: "asc" } }),
    prisma.blackoutDate.findMany({ orderBy: { date: "asc" } }),
    prisma.timeSlot.findMany({
      include: { location: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  ]);

  // Map location names for policies
  const locationMap = new Map(locations.map((l) => [l.slug, l.name]));

  return NextResponse.json({
    locations,
    policies: policies.map((p) => ({
      ...p,
      locationName: p.locationSlug === "default"
        ? "Default (all locations)"
        : locationMap.get(p.locationSlug) || p.locationSlug,
    })),
    addOns,
    blackoutDates,
    timeSlots,
  });
}
