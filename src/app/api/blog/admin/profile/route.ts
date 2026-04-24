import { NextResponse } from "next/server";
import { requireBlogAuthor } from "@/lib/blog-auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET() {
  const { author, unauthorized } = await requireBlogAuthor();
  if (unauthorized || !author) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.blogAuthor.findUnique({
    where: { id: author.sub },
    select: { name: true, email: true, bio: true, avatarUrl: true },
  });

  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const { author, unauthorized } = await requireBlogAuthor();
  if (unauthorized || !author) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, bio, avatarUrl } = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Name must be under 100 characters" }, { status: 400 });
    }

    if (bio && bio.length > 500) {
      return NextResponse.json({ error: "Bio must be under 500 characters" }, { status: 400 });
    }

    const updated = await prisma.blogAuthor.update({
      where: { id: author.sub },
      data: {
        name: name.trim(),
        bio: (bio || "").trim(),
        avatarUrl: avatarUrl || null,
      },
      select: { name: true, email: true, bio: true, avatarUrl: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
