import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isDoorLocation } from "@/lib/door";
import { listDay } from "@/lib/door-service";
export const dynamic = "force-dynamic";

/** Read-only: staff check guests in on the kiosk (/api/door), never from admin. */

/** GET /api/admin/door?location=slug&date=YYYY-MM-DD — the day's visits and totals. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const locationSlug = searchParams.get("location") || "";
  if (!isDoorLocation(locationSlug)) {
    return NextResponse.json({ error: "Unknown location" }, { status: 400 });
  }
  return NextResponse.json(await listDay(locationSlug, searchParams.get("date")));
}
