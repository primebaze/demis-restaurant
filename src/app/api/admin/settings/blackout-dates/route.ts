import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * POST /api/admin/settings/blackout-dates — Create a blackout date
 */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, locationId, reason } = await req.json();

  if (!date || !reason) {
    return NextResponse.json({ error: "Date and reason are required" }, { status: 400 });
  }

  const blackout = await prisma.blackoutDate.create({
    data: { date, locationId: locationId || null, reason },
    include: { location: true },
  });

  return NextResponse.json({ success: true, blackoutDate: blackout });
}

/**
 * DELETE /api/admin/settings/blackout-dates — Remove a blackout date
 */
export async function DELETE(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Blackout date ID required" }, { status: 400 });
  }

  await prisma.blackoutDate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
