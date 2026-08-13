import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDest, looksLikeScanner } from "@/lib/marketing";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Caps how many clicks one IP can WRITE. Never caps the redirect itself. */
const LOG_RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };

/**
 * GET /r?u=<base64url dest>&s=<sig>&c=<campaign>&e=<token>
 *
 * The click-tracking hop for outbound links in an email blast. Every link keeps
 * our domain in the visible href, which is what spam filters compare against the
 * From domain, and the destination is signed so this can never be turned into an
 * open redirect pointing at somebody else's site.
 */

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const home = NextResponse.redirect(new URL("/", req.url), 302);

  let dest: string;
  try {
    dest = Buffer.from(params.get("u") || "", "base64url").toString("utf8");
  } catch {
    return home;
  }

  // Unsigned, tampered, or not a plain web address — refuse to forward.
  if (!/^https?:\/\//i.test(dest) || !verifyDest(dest, params.get("s") || "")) {
    return home;
  }

  const ua = req.headers.get("user-agent") || "";
  const ip = getClientIp(req);

  // Over the cap we drop the log line, never the redirect — a guest clicking
  // twice must still reach the destination.
  if (rateLimit(`linkclick:${ip}`, LOG_RATE_LIMIT).success) {
    try {
      await prisma.linkClick.create({
        data: {
          campaign: (params.get("c") || "blast").slice(0, 60),
          url: dest.slice(0, 500),
          token: (params.get("e") || "").slice(0, 32),
          bot: looksLikeScanner(ua),
          ip,
          userAgent: ua.slice(0, 300),
        },
      });
    } catch {
      // A logging failure must never cost us the click.
    }
  }

  return NextResponse.redirect(dest, 302);
}
