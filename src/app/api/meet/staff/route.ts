import { NextResponse } from "next/server";
import { getClockinStaff, clockinConfigured } from "@/lib/clockin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** GET: names for the "Who's signing in?" picker. Switched-on staff only; nothing else about them. */
export async function GET(req: Request) {
  if (!rateLimit(`meet-staff:${getClientIp(req)}`, { maxRequests: 30, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!clockinConfigured()) return NextResponse.json({ error: "Not set up yet" }, { status: 503 });
  try {
    const staff = await getClockinStaff();
    const people = staff.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }));
    return NextResponse.json({ people }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Can't reach the clock-in app right now" }, { status: 502 });
  }
}
