/**
 * Sign-in for Demi's Meetings (meeting.demisrestaurant.co.uk).
 *
 * One signed, httpOnly cookie per phone names its MeetDevice row. Everything
 * else lives on that row, so a manager can approve, decline or sign a phone
 * out and it takes effect on the next request:
 *   - status: pending until a manager approves the phone
 *   - sessionUntil: 30 days from the last PIN sign-in; null after signing out
 * The person must also still be switched on in the clock-in app.
 */
import { SignJWT, jwtVerify } from "jose";
import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getClockinPerson, isManagerRole, type ClockinStaff } from "@/lib/clockin";

export const MEET_COOKIE = "meet_device";
export const SESSION_DAYS = 30;
const COOKIE_DAYS = 400; // the phone stays known; the session inside it is what expires

// Own key, derived from the admin secret, so a meetings cookie can never pass as an admin one.
function key(): Uint8Array {
  const base = process.env.ADMIN_JWT_SECRET;
  if (!base) throw new Error("ADMIN_JWT_SECRET is not set");
  return new Uint8Array(createHmac("sha256", base).update("demis-meetings-device-v1").digest());
}

export async function deviceCookieValue(deviceId: string): Promise<string> {
  return new SignJWT({ d: deviceId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setAudience("demis-meetings")
    .setExpirationTime(`${COOKIE_DAYS}d`)
    .sign(key());
}

export const deviceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_DAYS * 24 * 60 * 60,
};

/** The device id in this request's cookie, if the cookie is genuine. */
export async function cookieDeviceId(): Promise<string | null> {
  const raw = (await cookies()).get(MEET_COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, key(), { audience: "demis-meetings" });
    return typeof payload.d === "string" ? payload.d : null;
  } catch {
    return null;
  }
}

export type MeetState =
  | { state: "signed_out"; lastName?: string }
  | { state: "pending" | "declined"; name: string }
  | { state: "approved"; deviceId: string; person: ClockinStaff; manager: boolean; branch: string };

/** Where this phone stands right now. */
export async function currentMeetState(): Promise<MeetState> {
  const id = await cookieDeviceId();
  if (!id) return { state: "signed_out" };
  const device = await prisma.meetDevice.findUnique({ where: { id } });
  if (!device || device.status === "revoked") return { state: "signed_out" };
  if (!device.sessionUntil || device.sessionUntil < new Date()) return { state: "signed_out", lastName: device.staffName };
  if (device.status === "pending" || device.status === "declined") return { state: device.status, name: device.staffName };

  const person = await getClockinPerson(device.clockinId);
  if (!person || !person.active) return { state: "signed_out" };

  // Note activity at most every 5 minutes.
  if (Date.now() - device.lastSeenAt.getTime() > 5 * 60_000) {
    await prisma.meetDevice.update({ where: { id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  const extra = await prisma.meetStaff.findUnique({ where: { clockinId: person.id } });
  return { state: "approved", deviceId: id, person, manager: isManagerRole(person.role), branch: extra?.branch || "" };
}

/** For API routes: the signed-in person, or null. `managerOnly` also requires the manager role. */
export async function requireMeet(managerOnly = false) {
  const s = await currentMeetState();
  if (s.state !== "approved") return null;
  if (managerOnly && !s.manager) return null;
  return s;
}

/** "iPhone · Safari" style label from a user agent, for the approvals list. */
export function deviceLabel(ua: string): string {
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Device";
  const browser = /CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua) ? "Chrome" : /Edg\//.test(ua) ? "Edge" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${browser}`;
}
