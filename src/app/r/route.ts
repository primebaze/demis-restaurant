import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDest } from "@/lib/marketing";

export const dynamic = "force-dynamic";

/**
 * GET /r?u=<base64url dest>&s=<sig>&c=<campaign>&e=<token>
 *
 * The click-tracking hop for outbound links in an email blast. Every link keeps
 * our domain in the visible href, which is what spam filters compare against the
 * From domain, and the destination is signed so this can never be turned into an
 * open redirect pointing at somebody else's site.
 */

/** Mail security scanners fetch every link in a message before the human sees it. */
function looksLikeScanner(ua: string): boolean {
  return /bot|crawler|spider|preview|scan|proofpoint|barracuda|mimecast|safelinks|slurp|curl|wget|python-requests|headless/i.test(
    ua
  );
}

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

  try {
    await prisma.linkClick.create({
      data: {
        campaign: (params.get("c") || "blast").slice(0, 60),
        url: dest.slice(0, 500),
        token: (params.get("e") || "").slice(0, 32),
        bot: looksLikeScanner(ua),
        ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "",
        userAgent: ua.slice(0, 300),
      },
    });
  } catch {
    // A logging failure must never cost us the click.
  }

  return NextResponse.redirect(dest, 302);
}
