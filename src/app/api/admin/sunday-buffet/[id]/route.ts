import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

const STATUSES = new Set(["booked", "arrived", "cancelled"]);

/** PATCH /api/admin/sunday-buffet/[id] — update status (booked / arrived / cancelled). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();
  if (!STATUSES.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const booking = await prisma.sundayBuffetBooking.update({ where: { id }, data: { status } });
  return NextResponse.json({ booking });
}

/** DELETE /api/admin/sunday-buffet/[id] */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.sundayBuffetBooking.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
