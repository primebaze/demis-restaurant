import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

const COOKIE = "blog_viewed";
const MAX_SLUGS = 100; // keep the cookie small
const ONE_DAY = 60 * 60 * 24;

/**
 * POST /api/blog/posts/[slug]/view — count a unique-ish view.
 * A browser only counts once per post per ~day (tracked via a cookie),
 * so refreshing the page does not keep bumping the number.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const jar = await cookies();
  const seen = (jar.get(COOKIE)?.value || "").split(",").filter(Boolean);

  // Already counted for this browser recently — do nothing.
  if (seen.includes(slug)) {
    return NextResponse.json({ counted: false });
  }

  // Only published posts get counted.
  const { count } = await prisma.blogPost.updateMany({
    where: { slug, status: "published" },
    data: { views: { increment: 1 } },
  });

  if (count === 0) {
    return NextResponse.json({ counted: false });
  }

  const next = [slug, ...seen].slice(0, MAX_SLUGS).join(",");
  const res = NextResponse.json({ counted: true });
  res.cookies.set(COOKIE, next, {
    maxAge: ONE_DAY,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
