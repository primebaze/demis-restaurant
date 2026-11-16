import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClockinPerson, verifyClockinPin } from "@/lib/clockin";
import { cookieDeviceId, deviceCookieValue, deviceCookieOptions, deviceLabel, MEET_COOKIE, SESSION_DAYS } from "@/lib/meet-auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

/**
 * POST { staffId, pin }: sign in on this phone with the clock-in PIN.
 * A phone this person hasn't used before is created as "pending" until a manager approves it.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`meet-signin:${ip}`, { maxRequests: 10, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  }

  let body: { staffId?: unknown; pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const staffId = Number(body.staffId);
  const pin = String(body.pin ?? "");
  if (!Number.isInteger(staffId) || staffId <= 0 || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Pick your name and enter your 4-digit PIN" }, { status: 400 });
  }

  // Several wrong PINs in a row lock that name for a while, whatever phone they come from.
  const lock = await prisma.meetPinLock.findUnique({ where: { clockinId: staffId } });
  if (lock?.lockedUntil && lock.lockedUntil > new Date()) {
    const mins = Math.ceil((lock.lockedUntil.getTime() - Date.now()) / 60_000);
    return NextResponse.json({ error: `Too many wrong PINs. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or ask a manager.` }, { status: 423 });
  }

  let ok = false;
  try {
    ok = await verifyClockinPin(staffId, pin);
  } catch {
    return NextResponse.json({ error: "Can't reach the clock-in app right now. Try again shortly." }, { status: 502 });
  }

  if (!ok) {
    const failures = (lock?.failures ?? 0) + 1;
    const lockedUntil = failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
    await prisma.meetPinLock.upsert({
      where: { clockinId: staffId },
      create: { clockinId: staffId, failures, lockedUntil },
      update: { failures: lockedUntil ? 0 : failures, lockedUntil },
    });
    return NextResponse.json(
      { error: lockedUntil ? `Too many wrong PINs. That name is locked for ${LOCK_MINUTES} minutes.` : "That PIN isn't right" },
      { status: lockedUntil ? 423 : 401 },
    );
  }
  if (lock) await prisma.meetPinLock.update({ where: { clockinId: staffId }, data: { failures: 0, lockedUntil: null } });

  const person = await getClockinPerson(staffId);
  if (!person || !person.active) return NextResponse.json({ error: "That PIN isn't right" }, { status: 401 });

  const sessionUntil = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60_000);
  const ua = req.headers.get("user-agent") || "";

  // Same phone, same person: reuse its row (approved phones stay approved).
  const existingId = await cookieDeviceId();
  const existing = existingId ? await prisma.meetDevice.findUnique({ where: { id: existingId } }) : null;
  let device;
  if (existing && existing.clockinId === staffId && existing.status !== "revoked" && existing.status !== "declined") {
    device = await prisma.meetDevice.update({ where: { id: existing.id }, data: { sessionUntil, lastSeenAt: new Date(), staffName: person.name } });
  } else {
    device = await prisma.meetDevice.create({
      data: { clockinId: staffId, staffName: person.name, label: deviceLabel(ua), status: "pending", sessionUntil },
    });
  }

  const res = NextResponse.json({ state: device.status === "approved" ? "approved" : "pending" });
  res.cookies.set(MEET_COOKIE, await deviceCookieValue(device.id), deviceCookieOptions);
  return res;
}
