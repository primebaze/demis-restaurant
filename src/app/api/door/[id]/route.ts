import { NextResponse } from "next/server";
import { isCheckinUnlocked } from "@/lib/checkin-auth";
import { updateVisit, deleteVisit } from "@/lib/door-service";
export const dynamic = "force-dynamic";

/** PATCH /api/door/[id] — check out, reopen, or correct a visit from the kiosk. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCheckinUnlocked())) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const res = await updateVisit(id, body);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true, visit: res.visit });
}

/** DELETE /api/door/[id] — remove a mistaken check-in from the kiosk. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCheckinUnlocked())) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }
  const { id } = await params;
  await deleteVisit(id);
  return NextResponse.json({ ok: true });
}
