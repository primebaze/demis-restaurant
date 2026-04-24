import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareSync } from "bcryptjs";
import { SignJWT } from "jose";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { BLOG_JWT_SECRET } from "@/lib/blog-auth";
export const dynamic = "force-dynamic";

const LOGIN_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };

export async function POST(req: Request) {
  try {
    if (!BLOG_JWT_SECRET) {
      return NextResponse.json({ error: "Blog admin is not configured" }, { status: 500 });
    }

    const ip = getClientIp(req);
    const limiter = rateLimit(`blog-login:${ip}`, LOGIN_RATE_LIMIT);
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limiter.resetMs / 1000)) } }
      );
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const author = await prisma.blogAuthor.findUnique({ where: { email } });
    if (!author || !author.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = compareSync(password, author.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await new SignJWT({
      sub: author.id,
      email: author.email,
      name: author.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(BLOG_JWT_SECRET);

    const res = NextResponse.json({
      success: true,
      author: { id: author.id, name: author.name, email: author.email },
    });

    res.cookies.set("blog_author_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Blog login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("blog_author_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
