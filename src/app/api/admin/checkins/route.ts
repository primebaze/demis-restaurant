import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { serviceDate, priceTierFor, groupPrice } from "@/lib/checkin-auth";
export const dynamic = "force-dynamic";

/** GET /api/admin/checkins?date=YYYY-MM-DD — list a day's door check-ins. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const param = searchParams.get("date");
  const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : serviceDate();

  try {
    const rows = await prisma.buffetCheckIn.findMany({
      where: { date },
      orderBy: { number: "asc" },
    });

    // Tiers count PEOPLE (covers), since pricing is per person
    const tiers = { t20: 0, t25: 0, t30: 0 };
    const checkins = rows.map((r) => {
      const endCover = r.number + r.partySize - 1;
      for (let c = r.number; c <= endCover; c++) {
        const t = priceTierFor(c);
        if (t === 20) tiers.t20++;
        else if (t === 25) tiers.t25++;
        else tiers.t30++;
      }
      return {
        id: r.id,
        number: r.number,
        endCover,
        name: r.name,
        partySize: r.partySize,
        price: groupPrice(r.number, r.partySize),
        checkedInAt: r.checkedInAt,
        endsAt: r.endsAt,
        status: r.status,
      };
    });

    const totalPeople = rows.reduce((s, r) => s + r.partySize, 0);
    return NextResponse.json({ date, total: totalPeople, groups: rows.length, tiers, checkins });
  } catch {
    return NextResponse.json({ date, total: 0, groups: 0, tiers: { t20: 0, t25: 0, t30: 0 }, checkins: [], notMigrated: true });
  }
}
