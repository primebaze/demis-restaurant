import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { unsubToken } from "@/lib/marketing";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/link-clicks?campaign=vote — click stats for a tracked link.
 *
 * Tokens in the URL are one-way HMACs, so they are resolved back to contacts here
 * by hashing the list once and matching, rather than ever putting an address in a
 * link. Scanner prefetches are counted separately so the real number is visible.
 */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = new URL(req.url).searchParams.get("campaign");

  // No campaign named — list what's been tracked so far.
  if (!campaign) {
    const grouped = await prisma.linkClick.groupBy({
      by: ["campaign"],
      where: { bot: false },
      _count: { _all: true },
      _max: { createdAt: true },
    });
    return NextResponse.json({
      campaigns: grouped
        .map((g) => ({
          campaign: g.campaign,
          clicks: g._count._all,
          lastClickAt: g._max.createdAt,
        }))
        .sort((a, b) => (b.lastClickAt?.getTime() ?? 0) - (a.lastClickAt?.getTime() ?? 0)),
    });
  }

  const clicks = await prisma.linkClick.findMany({
    where: { campaign },
    orderBy: { createdAt: "desc" },
  });

  const human = clicks.filter((c) => !c.bot);

  // token -> email, built once from the list rather than per click
  const contacts = await prisma.mailingContact.findMany({
    select: { email: true, name: true },
  });
  const byToken = new Map(contacts.map((c) => [unsubToken(c.email), c]));

  // First click per token is what "unique" means here; repeats still show in total.
  const seen = new Map<string, { email: string; name: string; at: Date; count: number }>();
  let anonymous = 0;

  for (const c of human) {
    if (!c.token) {
      anonymous++; // forwarded on, or the link was shared
      continue;
    }
    const existing = seen.get(c.token);
    if (existing) {
      existing.count++;
      if (c.createdAt < existing.at) existing.at = c.createdAt;
      continue;
    }
    const contact = byToken.get(c.token);
    seen.set(c.token, {
      email: contact?.email || "(unknown)",
      name: contact?.name || "",
      at: c.createdAt,
      count: 1,
    });
  }

  const clickers = Array.from(seen.values()).sort((a, b) => b.at.getTime() - a.at.getTime());

  // Which link they clicked, for blasts carrying more than one.
  const perUrl = new Map<string, number>();
  for (const c of human) {
    if (c.url) perUrl.set(c.url, (perUrl.get(c.url) || 0) + 1);
  }
  const byUrl = Array.from(perUrl.entries())
    .map(([url, clicks]) => ({ url, clicks }))
    .sort((a, b) => b.clicks - a.clicks);

  return NextResponse.json({
    campaign,
    total: human.length, // every human click, repeats included
    unique: seen.size + anonymous, // distinct recipients, plus untracked hits
    identified: seen.size,
    anonymous, // clicked without a token — forwarded, or copied from the email
    scanners: clicks.length - human.length, // filtered-out prefetches
    lastClickAt: human[0]?.createdAt ?? null,
    byUrl,
    clickers,
  });
}
