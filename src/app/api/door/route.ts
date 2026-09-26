import { NextResponse } from "next/server";
import { isCheckinUnlocked } from "@/lib/checkin-auth";
import { isDoorLocation } from "@/lib/door";
import { listDay, createVisit } from "@/lib/door-service";
export const dynamic = "force-dynamic";

/**
 * Kiosk twin of /api/admin/door. Guarded by the staff PIN session rather than
 * an admin login, so a tablet on the door can never reach anything else.
 */

/** GET /api/door?location=slug — today's visits and totals for the kiosk. */
export async function GET(req: Request) {
  if (!(await isCheckinUnlocked())) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const locationSlug = searchParams.get("location") || "";
  if (!isDoorLocation(locationSlug)) {
    return NextResponse.json({ error: "Unknown location" }, { status: 400 });
  }
  // The kiosk only ever shows today; no date override.
  return NextResponse.json(await listDay(locationSlug, null));
}

/** POST /api/door — check a guest or party in from the kiosk. */
export async function POST(req: Request) {
  if (!(await isCheckinUnlocked())) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const locationSlug = String(body.location || "");
  if (!isDoorLocation(locationSlug)) {
    return NextResponse.json({ error: "Unknown location" }, { status: 400 });
  }
  const res = await createVisit(locationSlug, body);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.visit);
}
