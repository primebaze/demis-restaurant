import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

/** GET /api/admin/checkins?date=YYYY-MM-DD — list a day's door check-ins. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const param = searchParams.get("date");
  const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : new Date().toISOString().split("T")[0];

  try {
    const checkins = await prisma.buffetCheckIn.findMany({
      where: { date },
      orderBy: { number: "asc" },
    });

    const tiers = {
      t20: checkins.filter((c) => c.priceTier === 20).length,
      t25: checkins.filter((c) => c.priceTier === 25).length,
      t30: checkins.filter((c) => c.priceTier === 30).length,
    };

    return NextResponse.json({ date, total: checkins.length, tiers, checkins });
  } catch {
    return NextResponse.json({ date, total: 0, tiers: { t20: 0, t25: 0, t30: 0 }, checkins: [], notMigrated: true });
  }
}
