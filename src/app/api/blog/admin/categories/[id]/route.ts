import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBlogAuthor } from "@/lib/blog-auth";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const postsUsingCategory = await prisma.blogPost.count({ where: { categoryId: id } });
  if (postsUsingCategory > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${postsUsingCategory} post(s) use this category. Reassign them first.` },
      { status: 400 }
    );
  }

  await prisma.blogCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
