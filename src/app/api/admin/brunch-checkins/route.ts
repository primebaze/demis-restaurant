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
    const checkins = rows.map((r) => ({
      id: r.id,
      number: r.number,
      endCover: r.number + r.partySize - 1,
      name: r.name,
      partySize: r.partySize,
      price: r.pricePerHead * r.partySize,
      checkedInAt: r.checkedInAt,
      endsAt: r.endsAt,
      status: r.status,
    }));
    const totalPeople = rows.reduce((s, r) => s + r.partySize, 0);
    const takings = rows.reduce((s, r) => s + r.pricePerHead * r.partySize, 0);
    return NextResponse.json({ date, total: totalPeople, groups: rows.length, takings, pricePerHead: BRUNCH_PRICE, checkins });
  } catch {
    return NextResponse.json({ date, total: 0, groups: 0, takings: 0, pricePerHead: BRUNCH_PRICE, checkins: [], notMigrated: true });
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
