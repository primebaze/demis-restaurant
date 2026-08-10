import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { upcomingSaturdays, prettyDate } from "@/lib/saturday-brunch";
export const dynamic = "force-dynamic";

/** GET /api/admin/saturday-brunch/dates — availability for each bookable Saturday. */
export async function GET() {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dates = upcomingSaturdays();
  try {
    const [settings, bookings] = await Promise.all([
      prisma.brunchDate.findMany({ where: { date: { in: dates } } }),
      prisma.saturdayBrunchBooking.groupBy({
        by: ["date"],
        where: { date: { in: dates }, status: { not: "cancelled" } },
        _sum: { partySize: true },
      }),
    ]);
    const settingFor = new Map(settings.map((s) => [s.date, s]));
    const bookedFor = new Map(bookings.map((b) => [b.date, b._sum.partySize || 0]));

    return NextResponse.json({
      dates: dates.map((date) => {
        const s = settingFor.get(date);
        const booked = bookedFor.get(date) || 0;
        const capacity = s?.capacity ?? null;
        return {
          date,
          prettyDate: prettyDate(date),
          blocked: !!s?.blocked,
          capacity,
          booked,
          soldOut: !!s?.blocked || (capacity !== null && booked >= capacity),
          note: s?.note || "",
        };
      }),
    });
  } catch {
    return NextResponse.json({ dates: [], notMigrated: true });
  }
}

/** PATCH /api/admin/saturday-brunch/dates — { date, blocked?, capacity?, note? } */
export async function PATCH(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const date = String(body.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const data: { blocked?: boolean; capacity?: number | null; note?: string } = {};
  if (typeof body.blocked === "boolean") data.blocked = body.blocked;
  if (body.capacity === null || body.capacity === "") data.capacity = null;
  else if (body.capacity !== undefined) {
    const n = parseInt(body.capacity);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "Invalid capacity" }, { status: 400 });
    data.capacity = n;
  }
  if (typeof body.note === "string") data.note = body.note.slice(0, 200);

  const row = await prisma.brunchDate.upsert({
    where: { date },
    create: { date, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true, date: row.date, blocked: row.blocked, capacity: row.capacity, note: row.note });
}
