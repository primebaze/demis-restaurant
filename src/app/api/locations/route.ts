import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/locations — Get active locations
 */
export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, address: true, phone: true },
    });

    return NextResponse.json({ locations });
  } catch (error: unknown) {
    console.error("Locations API error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}
