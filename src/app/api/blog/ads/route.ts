import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

/** GET /api/blog/ads — active ads for public display */
export async function GET() {
  try {
    const ads = await prisma.blogAd.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, imageUrl: true, linkUrl: true },
    });
    return NextResponse.json({ ads });
  } catch {
    // Table not migrated yet — return empty so the blog still renders.
    return NextResponse.json({ ads: [] });
  }
}
