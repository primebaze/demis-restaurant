import { NextResponse } from "next/server";
import { requireMeet } from "@/lib/meet-auth";
import { listDevices, decideDevice } from "@/lib/meet-devices";

export const dynamic = "force-dynamic";

/** GET: phones waiting for approval and phones in use. Managers only. */
export async function GET() {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  return NextResponse.json(await listDevices(), { headers: { "Cache-Control": "no-store" } });
}

/** POST { id, action: approve | decline | revoke }. Managers only. */
export async function POST(req: Request) {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const { id, action } = await req.json().catch(() => ({}));
  if (id === me.deviceId && action !== "approve") {
    return NextResponse.json({ error: "Use Sign out to leave on this phone" }, { status: 400 });
  }
  const result = await decideDevice(String(id || ""), String(action || ""), me.person.name);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
