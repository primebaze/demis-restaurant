import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

/**
 * GET /api/blog/ads/[id]/click — count a click and redirect to the ad's target.
 * Works without JavaScript (it's a plain link the browser follows).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ad = await prisma.blogAd
    .update({ where: { id }, data: { clicks: { increment: 1 } }, select: { linkUrl: true } })
    .catch(() => null);

  const target = ad?.linkUrl && /^https?:\/\//.test(ad.linkUrl) ? ad.linkUrl : "/blog";
  return NextResponse.redirect(target, { status: 302 });
}
