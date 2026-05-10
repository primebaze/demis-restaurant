import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBlogAuthor } from "@/lib/blog-auth";
export const dynamic = "force-dynamic";

/** PATCH /api/blog/admin/authors/[id] — update name, bio, avatarUrl */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { name?: string; bio?: string; avatarUrl?: string; isActive?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name.trim() || body.name.trim().length > 100)
      return NextResponse.json({ error: "Name is required (max 100 chars)" }, { status: 400 });
    data.name = body.name.trim();
  }
  if (body.bio !== undefined) data.bio = body.bio.trim().slice(0, 500);
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl.trim() || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const author = await prisma.blogAuthor.update({
    where: { id },
    data,
    select: { id: true, name: true, bio: true, avatarUrl: true, isActive: true },
  });

  return NextResponse.json({ author });
}

/** DELETE /api/blog/admin/authors/[id] — deactivate (soft delete) */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { author: me, unauthorized } = await requireBlogAuthor();
  if (unauthorized || !me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (id === me.sub)
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });

  const author = await prisma.blogAuthor.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, name: true, isActive: true },
  });

  return NextResponse.json({ author });
}
