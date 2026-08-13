import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CAMPAIGN = "vote";

/**
 * GET /vote — the link that goes in the email.
 *
 * Lives on our own domain so the From domain and the link domain match, which is
 * the single biggest spam-filter signal. The real destination is admin-set, so a
 * mid-campaign URL change never invalidates mail already sent.
 *
 * Destination resolves from AppSetting "vote_url", falling back to VOTE_URL.
 */

/** Mail security scanners fetch every link in a message before the human sees it. */
function looksLikeScanner(ua: string): boolean {
  return /bot|crawler|spider|preview|scan|proofpoint|barracuda|mimecast|safelinks|slurp|curl|wget|python-requests|headless/i.test(
    ua
  );
}

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

  try {
    await prisma.linkClick.create({
      data: {
        campaign: CAMPAIGN,
        url: url.slice(0, 500),
        token,
        bot: looksLikeScanner(ua),
        ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "",
        userAgent: ua.slice(0, 300),
      },
    });
  } catch {
    // A logging failure must never cost us the click.
  }

  // 302, not 301: inboxes and browsers cache 301s permanently, which would strand
  // every recipient if the destination ever changes.
  return NextResponse.redirect(url, 302);
}
