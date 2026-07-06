import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBlogAuthor } from "@/lib/blog-auth";
export const dynamic = "force-dynamic";

/** GET /api/blog/admin/ads — all ads (admin) */
export async function GET() {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ads = await prisma.blogAd.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ ads });
}

/** POST /api/blog/admin/ads — create an ad */
export async function POST(req: Request) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, imageUrl, linkUrl } = await req.json();
  if (!imageUrl?.trim()) {
    return NextResponse.json({ error: "An ad image is required" }, { status: 400 });
  }

  const ad = await prisma.blogAd.create({
    data: {
      title: (title || "").trim(),
      imageUrl: imageUrl.trim(),
      linkUrl: (linkUrl || "").trim(),
    },
  });
  return NextResponse.json({ ad }, { status: 201 });
}
