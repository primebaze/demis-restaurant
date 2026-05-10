import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBlogAuthor } from "@/lib/blog-auth";
import { hashSync } from "bcryptjs";
import { nanoid } from "nanoid";
export const dynamic = "force-dynamic";

/** GET /api/blog/admin/authors — list all active authors */
export async function GET(req: Request) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("all") === "true";

  const authors = await prisma.blogAuthor.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: { id: true, name: true, bio: true, avatarUrl: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ authors });
}

/** POST /api/blog/admin/authors — create a display profile (no login credentials) */
export async function POST(req: Request) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name: string; bio?: string; avatarUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, bio = "", avatarUrl = "" } = body;
  if (!name?.trim() || name.trim().length > 100)
    return NextResponse.json({ error: "Name is required (max 100 chars)" }, { status: 400 });

  // Auto-generate placeholder credentials — this profile cannot log in
  const placeholderEmail = `author-${nanoid(10)}@noreply.internal`;
  const placeholderHash = hashSync(nanoid(32), 10);

  const author = await prisma.blogAuthor.create({
    data: {
      name: name.trim(),
      bio: bio.trim().slice(0, 500),
      avatarUrl: avatarUrl.trim() || null,
      email: placeholderEmail,
      passwordHash: placeholderHash,
      isActive: true,
    },
    select: { id: true, name: true, bio: true, avatarUrl: true, isActive: true },
  });

  return NextResponse.json({ author }, { status: 201 });
}
