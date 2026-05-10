import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBlogAuthor } from "@/lib/blog-auth";
import { sanitizeHtml, slugify } from "@/lib/blog-sanitize";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = 20;
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const categoryId = url.searchParams.get("categoryId") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { excerpt: { contains: search, mode: "insensitive" } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: { author: { select: { name: true } }, category: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const { author, unauthorized } = await requireBlogAuthor();
  if (unauthorized || !author) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, excerpt, content, featuredImage, categoryId, metaTitle, metaDescription, status, authorId: bodyAuthorId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Use provided authorId if valid and active, otherwise fall back to logged-in author
    let resolvedAuthorId = author.sub;
    if (bodyAuthorId && bodyAuthorId !== author.sub) {
      const targetAuthor = await prisma.blogAuthor.findUnique({ where: { id: bodyAuthorId, isActive: true } });
      if (!targetAuthor) return NextResponse.json({ error: "Selected author not found" }, { status: 400 });
      resolvedAuthorId = bodyAuthorId;
    }

    let slug = slugify(title);
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const post = await prisma.blogPost.create({
      data: {
        title: title.trim(),
        slug,
        excerpt: (excerpt || "").trim(),
        content: sanitizeHtml(content || ""),
        featuredImage: featuredImage || null,
        categoryId: categoryId || null,
        authorId: resolvedAuthorId,
        status: status === "published" ? "published" : "draft",
        publishedAt: status === "published" ? new Date() : null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      },
      include: { author: { select: { name: true } }, category: { select: { name: true } } },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
