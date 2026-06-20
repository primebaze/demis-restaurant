import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareSync } from "bcryptjs";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { signCheckinToken, isCheckinUnlocked, CHECKIN_COOKIE, CHECKIN_MAX_AGE } from "@/lib/checkin-auth";
export const dynamic = "force-dynamic";

const PIN_KEY = "checkin_pin_hash";

/** GET /api/checkin/unlock — is this device already unlocked? */
export async function GET() {
  return NextResponse.json({ unlocked: await isCheckinUnlocked() });
}

/** POST /api/checkin/unlock — verify the kiosk PIN, set the kiosk session cookie. */
export async function POST(req: Request) {
  // Heavy rate limit to stop PIN brute-forcing.
  const ip = getClientIp(req);
  const limit = rateLimit(`checkin-unlock:${ip}`, { maxRequests: 8, windowMs: 60_000 });
  if (!limit.success)
    return NextResponse.json({ error: "Too many attempts. Wait a minute and try again." }, { status: 429 });

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pin = (body.pin || "").trim();
  if (!pin) return NextResponse.json({ error: "Enter the PIN" }, { status: 400 });

  const setting = await prisma.appSetting.findUnique({ where: { key: PIN_KEY } });
  if (!setting?.value)
    return NextResponse.json({ error: "No PIN set yet. Ask an admin to set one." }, { status: 400 });

  if (!compareSync(pin, setting.value))
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CHECKIN_COOKIE, signCheckinToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CHECKIN_MAX_AGE,
    path: "/",
  });
  return res;
}
