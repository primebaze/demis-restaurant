import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { parseWindow } from "@/lib/blackouts";
export const dynamic = "force-dynamic";


/**
 * POST /api/admin/settings/blackout-dates — Create a blackout
 * { date, reason, locationId?, fromTime?, toTime? }. Leave both times out for a whole day.
 */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, locationId, reason, fromTime, toTime } = await req.json();

  if (!date || !reason) {
    return NextResponse.json({ error: "Date and reason are required" }, { status: 400 });
  }

  const window = parseWindow(fromTime, toTime);
  if (!window.ok) return NextResponse.json({ error: window.error }, { status: 400 });

  const blackout = await prisma.blackoutDate.create({
    data: { date, locationId: locationId || null, reason, fromTime: window.fromTime, toTime: window.toTime },
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
