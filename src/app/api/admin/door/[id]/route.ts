import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { isVisitType, parseAmountToPence } from "@/lib/door";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/door/[id]
 *   { action: "checkout", amount?: "45.50" }  — close the visit, optionally with the bill
 *   { action: "reopen" }                       — undo a checkout
 *   { name?, phone?, email?, partySize?, visitType?, amount? } — correct the details
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: {
    status?: string; checkedOutAt?: Date | null; amountPence?: number | null;
    name?: string; phone?: string; email?: string; partySize?: number; visitType?: string; note?: string;
  } = {};

  if (body.action === "checkout") {
    data.status = "closed";
    data.checkedOutAt = new Date();
  } else if (body.action === "reopen") {
    data.status = "active";
    data.checkedOutAt = null;
  }

  if (body.amount !== undefined) {
    if (body.amount === "" || body.amount === null) data.amountPence = null;
    else {
      const pence = parseAmountToPence(String(body.amount));
      if (pence === null) return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
      data.amountPence = pence;
    }
  }
  if (typeof body.name === "string") data.name = body.name.trim().slice(0, 80);
  if (typeof body.phone === "string") data.phone = body.phone.trim().slice(0, 30);
  if (typeof body.email === "string") data.email = body.email.trim().toLowerCase().slice(0, 120);
  if (typeof body.note === "string") data.note = body.note.slice(0, 200);
  if (body.partySize !== undefined) {
    data.partySize = Math.max(1, Math.min(30, Math.floor(Number(body.partySize) || 1)));
  }
  if (isVisitType(body.visitType)) data.visitType = body.visitType;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const visit = await prisma.guestVisit.update({ where: { id }, data });
  return NextResponse.json({ ok: true, visit });
}

/** DELETE /api/admin/door/[id] — remove a mistaken check-in. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.guestVisit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
