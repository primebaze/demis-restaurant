import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { upcomingFeastDate, prettyDate, BRUNCH_PRICE, packagePrice, packageLabel } from "@/lib/saturday-brunch";
import { HEARD_FROM_OPTIONS, heardFromLabel } from "@/lib/heard-from";
export const dynamic = "force-dynamic";

/** POST /api/admin/saturday-brunch — { action: "reset", date } clears a Sunday. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const date = body.date || upcomingFeastDate();

  if (body.action === "reset") {
    const { count } = await prisma.saturdayBrunchBooking.deleteMany({ where: { date } });
    return NextResponse.json({ ok: true, deleted: count });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/** GET /api/admin/saturday-brunch?date=YYYY-MM-DD — reservations for a Sunday. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") || upcomingFeastDate();

  try {
    const rows = await prisma.saturdayBrunchBooking.findMany({
      where: { date },
      orderBy: [{ arrivalTime: "asc" }, { createdAt: "asc" }],
    });
    const bookings = rows.map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email,
      phone: b.phone,
      partySize: b.partySize,
      arrivalTime: b.arrivalTime,
      package: b.package,
      packageLabel: packageLabel(b.package),
      pricePerHead: b.pricePerHead || packagePrice(b.package),
      heardFrom: heardFromLabel(b.heardFrom),
      fromPopup: b.source === "popup",
      status: b.status,
      confirmSentAt: b.confirmSentAt,
      confirmedAt: b.confirmedAt,
      createdAt: b.createdAt,
    }));
    const active = rows.filter((b) => b.status !== "cancelled");
    const people = active.reduce((s, b) => s + b.partySize, 0);
    const drinkers = active.reduce((s, b) => s + (b.package === "drinks" ? b.partySize : 0), 0);
    const confirmed = active.filter((b) => b.confirmedAt).length;
    const fromPopup = active.filter((b) => b.source === "popup").length;
    // Expected takings at each guest's chosen package; the door check-in is the final word.
    const revenue = active.reduce((s, b) => s + (b.pricePerHead || packagePrice(b.package)) * b.partySize, 0);
    // "Where did you hear about us?" counts for this date, by booking (not by head).
    const heardFrom = [
      ...HEARD_FROM_OPTIONS.map((o) => ({ label: o.label, count: active.filter((b) => b.heardFrom === o.key).length })),
      { label: "Not said", count: active.filter((b) => !b.heardFrom).length },
    ];
    return NextResponse.json({
      date,
      prettyDate: prettyDate(date),
      price: BRUNCH_PRICE,
      bookings,
      summary: { reservations: active.length, people, drinkers, confirmed, cancelled: rows.length - active.length, revenue, fromPopup },
      heardFrom,
    });
  } catch {
    return NextResponse.json({
      date, prettyDate: prettyDate(date), price: BRUNCH_PRICE, bookings: [],
      summary: { reservations: 0, people: 0, drinkers: 0, confirmed: 0, cancelled: 0, revenue: 0 }, notMigrated: true,
    });
  }
}
