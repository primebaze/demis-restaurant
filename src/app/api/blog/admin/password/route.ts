import { NextResponse } from "next/server";
import { requireBlogAuthor } from "@/lib/blog-auth";
import { prisma } from "@/lib/prisma";
import { compareSync, hashSync } from "bcryptjs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const { author, unauthorized } = await requireBlogAuthor();
  if (unauthorized || !author) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const blogAuthor = await prisma.blogAuthor.findUnique({
      where: { id: author.sub },
    });

    if (!blogAuthor) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }

    const valid = compareSync(currentPassword, blogAuthor.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    const newHash = hashSync(newPassword, 12);
    await prisma.blogAuthor.update({
      where: { id: author.sub },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
