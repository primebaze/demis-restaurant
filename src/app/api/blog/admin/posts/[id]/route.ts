import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBlogAuthor } from "@/lib/blog-auth";
import { sanitizeHtml, slugify } from "@/lib/blog-sanitize";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, slug: rawSlug, excerpt, content, featuredImage, categoryId, metaTitle, metaDescription, status } = body;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title.trim();
  if (rawSlug !== undefined) {
    const newSlug = slugify(rawSlug);
    const conflict = await prisma.blogPost.findFirst({ where: { slug: newSlug, id: { not: id } } });
    if (conflict) return NextResponse.json({ error: "Slug already in use" }, { status: 400 });
    data.slug = newSlug;
  }
  if (excerpt !== undefined) data.excerpt = excerpt.trim();
  if (content !== undefined) data.content = sanitizeHtml(content);
  if (featuredImage !== undefined) data.featuredImage = featuredImage || null;
  if (categoryId !== undefined) data.categoryId = categoryId || null;
  if (metaTitle !== undefined) data.metaTitle = metaTitle || null;
  if (metaDescription !== undefined) data.metaDescription = metaDescription || null;
  if (status !== undefined) {
    data.status = status;
    if (status === "published" && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
  }

  const post = await prisma.blogPost.update({
    where: { id },
    data,
    include: { author: { select: { name: true } }, category: { select: { name: true } } },
  });

  return NextResponse.json({ post });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.blogPost.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
