import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isCheckinUnlocked, serviceDate } from "@/lib/checkin-auth";
import { BRUNCH_PRICE, BRUNCH_WINDOW_MIN } from "@/lib/saturday-brunch";
export const dynamic = "force-dynamic";

function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
}

/** POST /api/brunch-checkin — record one door check-in. Requires the kiosk session. */
export async function POST(req: Request) {
  if (!(await isCheckinUnlocked()))
    return NextResponse.json({ error: "Locked" }, { status: 401 });

  const ip = getClientIp(req);
  const limit = rateLimit(`brunch-checkin:${ip}`, { maxRequests: 60, windowMs: 60_000 });
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
  const endsAt = new Date(Date.now() + BRUNCH_WINDOW_MIN * 60 * 1000);

  // number = the group's first cover (running people total + 1). The unique
  // (date, number) constraint stops two groups taking the same start under
  // simultaneous taps; on collision we recompute and retry.
  for (let attempt = 0; attempt < 12; attempt++) {
    const agg = await prisma.brunchCheckIn.aggregate({ where: { date }, _sum: { partySize: true } });
    const startCover = (agg._sum.partySize || 0) + 1;
    try {
      const row = await prisma.brunchCheckIn.create({
        data: { date, number: startCover, name, partySize, pricePerHead: BRUNCH_PRICE, endsAt },
      });
      return NextResponse.json({
        number: startCover,
        endCover: startCover + partySize - 1,
        partySize,
        pricePerHead: BRUNCH_PRICE,
        totalPrice: BRUNCH_PRICE * partySize,
        checkedInAt: row.checkedInAt,
        endsAt: row.endsAt,
        windowMin: BRUNCH_WINDOW_MIN,
      });
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }

  return NextResponse.json({ error: "Could not check in, please try again." }, { status: 503 });
}
