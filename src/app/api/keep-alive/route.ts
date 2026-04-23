import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    console.error("[keep-alive] Database ping failed:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
