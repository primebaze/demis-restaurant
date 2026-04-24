import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/blog-sanitize";
export const dynamic = "force-dynamic";

const COMMENT_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 1000 };

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limiter = rateLimit(`blog-comment:${ip}`, COMMENT_RATE_LIMIT);
  if (!limiter.success) {
    return NextResponse.json({ error: "Too many comments. Please wait." }, { status: 429 });
  }

  try {
    const { postSlug, name, email, content } = await req.json();

    if (!postSlug || !name?.trim() || !email?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "Comment too long (max 2000 characters)" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const post = await prisma.blogPost.findFirst({
      where: { slug: postSlug, status: "published" },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.blogComment.create({
      data: {
        postId: post.id,
        name: escapeHtml(name.trim().slice(0, 100)),
        email: email.trim().toLowerCase().slice(0, 200),
        content: escapeHtml(content.trim()),
        status: "pending",
      },
    });

    return NextResponse.json({ success: true, message: "Comment submitted for review" });
  } catch (error) {
    console.error("Comment submit error:", error);
    return NextResponse.json({ error: "Failed to submit comment" }, { status: 500 });
  }
}
