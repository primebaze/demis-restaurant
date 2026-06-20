import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { drainEmailQueue } from "@/lib/email-queue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    // Piggyback the bulk-email queue drain (internally capped at 15/hour).
    // Defensive: a queue issue must not fail the keep-alive ping.
    const queue = await drainEmailQueue().catch(() => null);
    return NextResponse.json({ ok: true, ts: new Date().toISOString(), queue });
  } catch (e) {
    console.error("[keep-alive] Database ping failed:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
