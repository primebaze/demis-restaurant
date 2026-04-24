import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBlogAuthor } from "@/lib/blog-auth";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "pending";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status;

  const [comments, total] = await Promise.all([
    prisma.blogComment.findMany({
      where,
      include: { post: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.blogComment.count({ where }),
  ]);

  return NextResponse.json({ comments, total, page, totalPages: Math.ceil(total / limit) });
}

export async function PATCH(req: Request) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const comment = await prisma.blogComment.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ comment });
}
