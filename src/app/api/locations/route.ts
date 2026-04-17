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
    const message = error instanceof Error ? error.message : String(error);
    console.error("Locations API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
