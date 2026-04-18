import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";


/**
 * PATCH /api/admin/settings/addons — Update an add-on
 */
export async function PATCH(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, description, pricePence, isActive } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Add-on ID required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (pricePence !== undefined) data.pricePence = pricePence;
  if (isActive !== undefined) data.isActive = isActive;

  const updated = await prisma.addOn.update({ where: { id }, data });

  return NextResponse.json({ success: true, addOn: updated });
}

/**
 * POST /api/admin/settings/addons — Create new add-on
 */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, pricePence } = await req.json();

  if (!name || pricePence === undefined) {
    return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
  }

  const addOn = await prisma.addOn.create({
    data: { name, description: description || "", pricePence },
  });

  return NextResponse.json({ success: true, addOn });
}

/**
 * DELETE /api/admin/settings/addons — Delete an add-on
 */
export async function DELETE(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Add-on ID required" }, { status: 400 });
  }

  await prisma.addOn.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
