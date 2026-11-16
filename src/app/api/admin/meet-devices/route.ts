import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listDevices, decideDevice } from "@/lib/meet-devices";

export const dynamic = "force-dynamic";

/** GET: Demi's Meetings phones (waiting and in use), for the bookings admin. */
export async function GET() {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listDevices(), { headers: { "Cache-Control": "no-store" } });
}

/** POST { id, action: approve | decline | revoke } */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, action } = await req.json().catch(() => ({}));
  const result = await decideDevice(String(id || ""), String(action || ""), "Bookings admin");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
