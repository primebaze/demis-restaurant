import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";


/**
 * PATCH /api/admin/settings/policies — Update a booking policy
 */
export async function PATCH(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    id,
    minPartySize,
    maxPartySize,
    depositThreshold,
    depositAmountPence,
    cancellationWindowH,
    maxAdvanceDays,
  } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Policy ID required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (minPartySize !== undefined) data.minPartySize = minPartySize;
  if (maxPartySize !== undefined) data.maxPartySize = maxPartySize;
  if (depositThreshold !== undefined) data.depositThreshold = depositThreshold;
  if (depositAmountPence !== undefined) data.depositAmountPence = depositAmountPence;
  if (cancellationWindowH !== undefined) data.cancellationWindowH = cancellationWindowH;
  if (maxAdvanceDays !== undefined) data.maxAdvanceDays = maxAdvanceDays;

  const updated = await prisma.bookingPolicy.update({ where: { id }, data });

  return NextResponse.json({ success: true, policy: updated });
}
