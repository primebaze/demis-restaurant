import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareSync } from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "demis-admin-secret-change-me"
);

/**
 * POST /api/admin/login — Admin authentication
 */
export async function POST(req: Request) {
  try {
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
