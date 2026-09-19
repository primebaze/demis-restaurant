import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const SHARE_SESSION_SECONDS = 12 * 60 * 60;
export const validShareToken = (token: string) => /^[a-f0-9]{48}$/.test(token);
type Access = "viewer" | "editor";
export const shareCookieName = (token: string, access: Access = "viewer") =>
  `${access === "editor" ? "shoot_edit" : "shoot_share"}_${token}`;
export const shareCookiePath = (token: string, access: Access = "viewer") =>
  `/api/shoot-plans/${access === "editor" ? "collaborate/" : ""}${token}`;
function signature(
  token: string,
  version: number,
  expires: number,
  access: Access,
) {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error("Share signing is unavailable");
  // Different format and domain from both the admin JWT and the check-in token.
  return createHmac("sha256", secret)
    .update(
      `${access === "editor" ? "shoot-edit" : "shoot-share"}:${token}:${version}:${expires}`,
    )
    .digest("hex");
}
export function signShareSession(
  token: string,
  version: number,
  access: Access = "viewer",
) {
  const expires = Date.now() + SHARE_SESSION_SECONDS * 1000;
  return `${expires}.${version}.${signature(token, version, expires, access)}`;
}
export async function isShareUnlocked(
  token: string,
  version: number,
  access: Access = "viewer",
) {
  if (!process.env.ADMIN_JWT_SECRET) return false;
  const value = cookies().get(shareCookieName(token, access))?.value || "";
  const [exp, revision, sig, extra] = value.split(".");
  if (
    extra ||
    !/^\d+$/.test(exp || "") ||
    revision !== String(version) ||
    !/^[a-f0-9]{64}$/.test(sig || "")
  )
    return false;
  const expires = Number(exp);
  if (!Number.isSafeInteger(expires) || expires <= Date.now()) return false;
  return timingSafeEqual(
    Buffer.from(sig, "hex"),
    Buffer.from(signature(token, version, expires, access), "hex"),
  );
}
export function shareJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
    },
  });
}
