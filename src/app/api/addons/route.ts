import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/addons — List active add-ons
 */
export async function GET() {
  const addOns = await prisma.addOn.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    addOns: addOns.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      pricePence: a.pricePence,
    })),
  });
}
