import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * Door-kiosk session token. Deliberately a CUSTOM HMAC token ("<exp>.<sig>"),
 * NOT a JWT — so it can never be parsed/accepted by the admin JWT verifier even
 * though it shares the same secret. The "checkin:" domain prefix further isolates
 * it. A leaked kiosk session can only reach the check-in endpoints, nothing else.
 */

const SECRET = process.env.ADMIN_JWT_SECRET || "";
export const CHECKIN_COOKIE = "checkin_session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12h — covers a full service day
export const CHECKIN_MAX_AGE = TTL_MS / 1000;

export function signCheckinToken(): string {
  const exp = String(Date.now() + TTL_MS);
  const sig = crypto.createHmac("sha256", SECRET).update("checkin:" + exp).digest("hex");
  return `${exp}.${sig}`;
}

function tokenValid(token: string): boolean {
  if (!SECRET || !token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET).update("checkin:" + exp).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const expNum = Number(exp);
  return Number.isFinite(expNum) && Date.now() < expNum;
}

/** True if the current request carries a valid kiosk session cookie. */
export async function isCheckinUnlocked(): Promise<boolean> {
  const store = await cookies();
  return tokenValid(store.get(CHECKIN_COOKIE)?.value || "");
}

/** Price tier (£) for a given cover position: 1-10 = 20, 11-22 = 25, 23+ = 30. */
export function priceTierFor(n: number): number {
  if (n <= 10) return 20;
  if (n <= 22) return 25;
  return 30;
}

/** Total £ for a group occupying covers [startCover .. startCover+partySize-1], priced per person. */
export function groupPrice(startCover: number, partySize: number): number {
  let total = 0;
  for (let c = startCover; c < startCover + partySize; c++) total += priceTierFor(c);
  return total;
}

export const CHECKIN_WINDOW_MIN = 90; // 1h 30m dining window

/** Service date in UK time (YYYY-MM-DD) — server runs in UTC, so derive London date. */
export function serviceDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
}
