import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { looksLikeScanner } from "@/lib/marketing";

export const dynamic = "force-dynamic";

const CAMPAIGN = "vote";

/** Caps how many clicks one IP can WRITE. Never caps the redirect itself. */
const LOG_RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };

/**
 * GET /vote — the link that goes in the email.
 *
 * Lives on our own domain so the From domain and the link domain match, which is
 * the single biggest spam-filter signal. The real destination is admin-set, so a
 * mid-campaign URL change never invalidates mail already sent.
 *
 * Destination resolves from AppSetting "vote_url", falling back to VOTE_URL.
 */

async function destination(): Promise<string> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: "vote_url" } });
    if (row?.value) return row.value;
  } catch {
    // fall through to the env var
  }
  return process.env.VOTE_URL || "";
}

export async function GET(req: NextRequest) {
  const url = await destination();

  // Nothing configured, or something that isn't a plain web address — send them
  // to the homepage rather than anywhere unexpected.
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  const ua = req.headers.get("user-agent") || "";
  const token = (req.nextUrl.searchParams.get("e") || "").slice(0, 32);
  const ip = getClientIp(req);

  // Over the cap we drop the log line, never the redirect — a guest clicking
  // twice must still reach the ballot.
  if (rateLimit(`linkclick:${ip}`, LOG_RATE_LIMIT).success) {
    try {
      await prisma.linkClick.create({
        data: {
          campaign: CAMPAIGN,
          url: url.slice(0, 500),
          token,
          bot: looksLikeScanner(ua),
          ip,
          userAgent: ua.slice(0, 300),
        },
      });
    } catch {
      // A logging failure must never cost us the click.
    }
  }

  // 302, not 301: inboxes and browsers cache 301s permanently, which would strand
  // every recipient if the destination ever changes.
  return NextResponse.redirect(url, 302);
}
