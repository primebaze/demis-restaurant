import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { serviceDate } from "@/lib/checkin-auth";
import { BRUNCH_PRICE } from "@/lib/saturday-brunch";
export const dynamic = "force-dynamic";

/** GET /api/admin/brunch-checkins?date=YYYY-MM-DD — list a day's brunch check-ins. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const param = searchParams.get("date");
  const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : serviceDate();

  try {
    const rows = await prisma.brunchCheckIn.findMany({ where: { date }, orderBy: { number: "asc" } });
    // Rows written before packages existed have totalPrice 0 — fall back to the old flat price.
    const groupTotal = (r: { totalPrice: number; pricePerHead: number; partySize: number }) =>
      r.totalPrice || r.pricePerHead * r.partySize;
    const checkins = rows.map((r) => ({
      id: r.id,
      number: r.number,
      endCover: r.number + r.partySize - 1,
      name: r.name,
      partySize: r.partySize,
      foodOnly: r.totalPrice ? r.foodOnly : r.partySize,
      withDrinks: r.totalPrice ? r.withDrinks : 0,
      price: groupTotal(r),
      checkedInAt: r.checkedInAt,
      endsAt: r.endsAt,
      status: r.status,
    }));
    const totalPeople = rows.reduce((s, r) => s + r.partySize, 0);
    const takings = rows.reduce((s, r) => s + groupTotal(r), 0);
    const drinkers = checkins.reduce((s, c) => s + c.withDrinks, 0);
    return NextResponse.json({ date, total: totalPeople, groups: rows.length, takings, drinkers, pricePerHead: BRUNCH_PRICE, checkins });
  } catch {
    return NextResponse.json({ date, total: 0, groups: 0, takings: 0, drinkers: 0, pricePerHead: BRUNCH_PRICE, checkins: [], notMigrated: true });
  }
}

/** POST /api/admin/brunch-checkins — { date } clears that day's brunch check-ins. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let date = serviceDate();
  try {
    const body = await req.json();
    if (typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) date = body.date;
  } catch {
    // default to today
  }

  const { count } = await prisma.brunchCheckIn.deleteMany({ where: { date } });
  return NextResponse.json({ deleted: count, date });
}
