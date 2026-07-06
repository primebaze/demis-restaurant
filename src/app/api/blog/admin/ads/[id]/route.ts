import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBlogAuthor } from "@/lib/blog-auth";
export const dynamic = "force-dynamic";

/** PATCH /api/blog/admin/ads/[id] — toggle active / edit title, link, order */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.linkUrl === "string") data.linkUrl = body.linkUrl.trim();
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const ad = await prisma.blogAd.update({ where: { id }, data });
  return NextResponse.json({ ad });
}

/** DELETE /api/blog/admin/ads/[id] */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.blogAd.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
