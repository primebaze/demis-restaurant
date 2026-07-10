import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

/** PATCH /api/admin/reviews/[id] — edit fields / toggle active. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.author === "string") data.author = body.author.trim().slice(0, 80);
  if (typeof body.body === "string") data.body = body.body.trim().slice(0, 1000);
  if (typeof body.location === "string") data.location = body.location.trim().slice(0, 80);
  if (body.rating !== undefined) data.rating = Math.min(5, Math.max(1, parseInt(String(body.rating)) || 5));
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  const review = await prisma.review.update({ where: { id }, data });
  return NextResponse.json({ review });
}

/** DELETE /api/admin/reviews/[id] */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
