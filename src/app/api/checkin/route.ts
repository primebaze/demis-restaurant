import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isCheckinUnlocked, priceTierFor, groupPrice, serviceDate, CHECKIN_WINDOW_MIN } from "@/lib/checkin-auth";
export const dynamic = "force-dynamic";

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
  const date = serviceDate();
  const endsAt = new Date(Date.now() + CHECKIN_WINDOW_MIN * 60 * 1000);

  // The group occupies covers [startCover .. startCover+partySize-1]. number =
  // startCover (the running people total + 1). The unique (date, number)
  // constraint prevents two groups taking the same start under simultaneous
  // taps; on collision we recompute and retry.
  for (let attempt = 0; attempt < 12; attempt++) {
    const agg = await prisma.buffetCheckIn.aggregate({ where: { date }, _sum: { partySize: true } });
    const startCover = (agg._sum.partySize || 0) + 1;
    try {
      const row = await prisma.buffetCheckIn.create({
        data: { date, number: startCover, name, partySize, priceTier: priceTierFor(startCover), endsAt },
      });
      const endCover = startCover + partySize - 1;
      return NextResponse.json({
        number: startCover,
        endCover,
        partySize,
        totalPrice: groupPrice(startCover, partySize),
        checkedInAt: row.checkedInAt,
        endsAt: row.endsAt,
        windowMin: CHECKIN_WINDOW_MIN,
      });
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }

  return NextResponse.json({ error: "Could not check in, please try again." }, { status: 503 });
}
