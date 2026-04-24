import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBlogAuthor } from "@/lib/blog-auth";
import { slugify } from "@/lib/blog-sanitize";
export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.blogCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = slugify(name);
  const existing = await prisma.blogCategory.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "Category already exists" }, { status: 400 });

  const category = await prisma.blogCategory.create({
    data: { name: name.trim(), slug, description: (description || "").trim() },
  });

  return NextResponse.json({ category }, { status: 201 });
}
