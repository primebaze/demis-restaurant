import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isCheckinUnlocked, priceTierFor, CHECKIN_WINDOW_MIN } from "@/lib/checkin-auth";
export const dynamic = "force-dynamic";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
}

/** POST /api/checkin — record one door check-in. Requires the kiosk session. */
export async function POST(req: Request) {
  if (!(await isCheckinUnlocked()))
    return NextResponse.json({ error: "Locked" }, { status: 401 });

  const ip = getClientIp(req);
  const limit = rateLimit(`checkin:${ip}`, { maxRequests: 60, windowMs: 60_000 });
  if (!limit.success)
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });

  let body: { name?: string; partySize?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const name = (body.name || "").trim().slice(0, 120);
  const partySize = Math.max(1, Math.min(50, Math.floor(Number(body.partySize) || 1)));
  const date = todayStr();
  const endsAt = new Date(Date.now() + CHECKIN_WINDOW_MIN * 60 * 1000);

  // Atomic numbering: the unique (date, number) constraint prevents duplicates
  // even under simultaneous taps; on collision we recount and retry.
  for (let attempt = 0; attempt < 12; attempt++) {
    const count = await prisma.buffetCheckIn.count({ where: { date } });
    const number = count + 1;
    try {
      const row = await prisma.buffetCheckIn.create({
        data: { date, number, name, partySize, priceTier: priceTierFor(number), endsAt },
      });
      return NextResponse.json({
        number: row.number,
        priceTier: row.priceTier,
        checkedInAt: row.checkedInAt,
        endsAt: row.endsAt,
        windowMin: CHECKIN_WINDOW_MIN,
      });
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }

  return NextResponse.json({ error: "Could not assign a number, try again." }, { status: 503 });
}
