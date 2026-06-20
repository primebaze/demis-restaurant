import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCheckinUnlocked } from "@/lib/checkin-auth";
export const dynamic = "force-dynamic";

/** POST /api/checkin/reset — clear a day's check-ins (for testing). Kiosk-PIN gated. */
export async function POST(req: Request) {
  if (!(await isCheckinUnlocked()))
    return NextResponse.json({ error: "Locked" }, { status: 401 });

  let date = new Date().toISOString().split("T")[0];
  try {
    const body = await req.json();
    if (typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) date = body.date;
  } catch {
    // default to today
  }

  // Scoped to a single date — cannot affect any other data.
  const { count } = await prisma.buffetCheckIn.deleteMany({ where: { date } });
  return NextResponse.json({ deleted: count, date });
}
