import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/locations — Get active locations
 */
export async function GET() {
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, address: true, phone: true },
  });

  return NextResponse.json({ locations });
}
