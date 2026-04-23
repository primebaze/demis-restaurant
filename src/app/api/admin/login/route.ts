import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareSync } from "bcryptjs";
import { SignJWT } from "jose";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";


if (!process.env.ADMIN_JWT_SECRET) {
  console.warn("⚠️  ADMIN_JWT_SECRET is not set — admin login will be disabled!");
}
const JWT_SECRET = process.env.ADMIN_JWT_SECRET
  ? new TextEncoder().encode(process.env.ADMIN_JWT_SECRET)
  : null;

// 5 login attempts per IP every 15 minutes
const LOGIN_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };

/**
 * POST /api/admin/login — Admin authentication
 */
export async function POST(req: Request) {
  try {
    if (!JWT_SECRET) {
      return NextResponse.json({ error: "Admin login is not configured" }, { status: 500 });
    }

    const ip = getClientIp(req);
    const limiter = rateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limiter.resetMs / 1000)),
          },
        }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });

    if (!admin || !admin.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = compareSync(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create JWT
    const token = await new SignJWT({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    const res = NextResponse.json({
      success: true,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });

    // Set HTTP-only cookie
    res.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/login — Logout (clear cookie)
 */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
