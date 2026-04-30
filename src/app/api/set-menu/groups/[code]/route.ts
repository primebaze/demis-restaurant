import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

/** GET /api/set-menu/groups/[code] — public, returns group info for guest selection page */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const groupCode = code.toUpperCase();

  const group = await prisma.setMenuGroup.findUnique({
    where: { groupCode },
    select: {
      groupCode: true,
      date: true,
      partySize: true,
      locationSlug: true,
      status: true,
      _count: { select: { selections: true } },
    },
  });

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.status === "inactive") return NextResponse.json({ error: "This link is no longer active" }, { status: 410 });

  return NextResponse.json({
    groupCode: group.groupCode,
    date: group.date,
    partySize: group.partySize,
    locationSlug: group.locationSlug,
    selectionsCount: group._count.selections,
    isFull: group._count.selections >= group.partySize,
  });
}
