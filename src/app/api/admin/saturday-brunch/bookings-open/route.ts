import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { brunchBookingsOpen, setBrunchBookingsOpen } from "@/lib/brunch-settings";
export const dynamic = "force-dynamic";

/** GET — are Saturday brunch bookings switched on? */
export async function GET() {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ open: await brunchBookingsOpen() });
}

/** POST { open: boolean } — switch Saturday brunch bookings on or off. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.open !== "boolean") {
    return NextResponse.json({ error: "Send { open: true } or { open: false }" }, { status: 400 });
  }
  await setBrunchBookingsOpen(body.open);
  return NextResponse.json({ open: body.open });
}
