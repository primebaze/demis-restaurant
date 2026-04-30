import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

/** PATCH /api/admin/set-menu/groups/[id] — update group status */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!["active", "inactive"].includes(body.status)) {
    return NextResponse.json({ error: "Status must be active or inactive" }, { status: 400 });
  }

  const group = await prisma.setMenuGroup.update({
    where: { id },
    data: { status: body.status },
  });

  return NextResponse.json({ group });
}
