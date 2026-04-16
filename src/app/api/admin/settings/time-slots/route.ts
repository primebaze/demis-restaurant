import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/settings/time-slots?location=<locationId>
 * Returns all time slots for a location (grouped by day)
 */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("location");

  const where: Record<string, unknown> = { specificDate: null };
  if (locationId) where.locationId = locationId;

  const slots = await prisma.timeSlot.findMany({
    where,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    include: { location: { select: { name: true, slug: true } } },
  });

  return NextResponse.json({ slots });
}

/**
 * POST /api/admin/settings/time-slots
 * Create a new time slot
 */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { locationId, dayOfWeek, startTime, endTime, maxCovers } = body;

  if (!locationId || dayOfWeek === undefined || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const slot = await prisma.timeSlot.create({
    data: {
      locationId,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      maxCovers: maxCovers || 30,
      isActive: true,
    },
  });

  return NextResponse.json({ slot });
}

/**
 * PATCH /api/admin/settings/time-slots
 * Update a time slot (startTime, endTime, maxCovers, isActive)
 */
export async function PATCH(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing slot id" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (updates.startTime !== undefined) data.startTime = updates.startTime;
  if (updates.endTime !== undefined) data.endTime = updates.endTime;
  if (updates.maxCovers !== undefined) data.maxCovers = Number(updates.maxCovers);
  if (updates.isActive !== undefined) data.isActive = Boolean(updates.isActive);

  const slot = await prisma.timeSlot.update({ where: { id }, data });

  return NextResponse.json({ slot });
}

/**
 * DELETE /api/admin/settings/time-slots
 * Delete a time slot
 */
export async function DELETE(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing slot id" }, { status: 400 });
  }

  await prisma.timeSlot.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
