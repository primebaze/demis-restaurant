import { NextResponse } from "next/server";
import { getClockinStaff, clockinConfigured } from "@/lib/clockin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET ?q=abc : names for "Who's signing in?". Staff type the first 3 letters of their first name or
 * surname; only switched-on staff whose name starts with those letters come back (up to 8), so the
 * whole staff list is never handed out to whoever opens the page.
 */
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export async function GET(req: Request) {
  if (!rateLimit(`meet-staff:${getClientIp(req)}`, { maxRequests: 60, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!clockinConfigured()) return NextResponse.json({ error: "Not set up yet" }, { status: 503 });
  const q = fold((new URL(req.url).searchParams.get("q") || "").trim());
  if (q.replace(/[^a-z]/g, "").length < 3) return NextResponse.json({ people: [] }, { headers: { "Cache-Control": "no-store" } });
  try {
    const staff = await getClockinStaff();
    const people = staff
      .filter((s) => s.active && fold(s.name).split(/[\s'-]+/).some((w) => w.startsWith(q)))
      .slice(0, 8)
      .map((s) => ({ id: s.id, name: s.name }));
    return NextResponse.json({ people }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Can't reach the clock-in app right now" }, { status: 502 });
  }
}
