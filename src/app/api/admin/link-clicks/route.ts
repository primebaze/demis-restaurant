import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { unsubToken } from "@/lib/marketing";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/**
 * GET /api/admin/link-clicks — click stats for a tracked link.
 *
 *   (no params)                → every campaign with a click count
 *   ?campaign=vote&page=2      → one campaign in detail, clickers paginated
 *
 * Counting happens in SQL rather than by pulling every row: one person clicking
 * fifty times collapses to a single grouped row, so memory stays flat however
 * long a campaign runs.
 *
 * Tokens in the URL are one-way HMACs, so they are resolved back to contacts
 * here by hashing the list once and matching, rather than ever putting an
 * address in a link. Scanner and link-preview fetches are excluded from every
 * figure except `scanners`.
 */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const campaign = params.get("campaign");

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

  const page = Math.max(1, Number(params.get("page")) || 1);
  const human = { campaign, bot: false };

  const [total, scanners, anonymous, urlGroups, tokenGroups, latest] = await Promise.all([
    prisma.linkClick.count({ where: human }),
    prisma.linkClick.count({ where: { campaign, bot: true } }),
    prisma.linkClick.count({ where: { ...human, token: "" } }),
    prisma.linkClick.groupBy({
      by: ["url"],
      where: human,
      _count: { _all: true },
    }),
    // One row per person, not per click.
    prisma.linkClick.groupBy({
      by: ["token"],
      where: { ...human, token: { not: "" } },
      _count: { _all: true },
      _min: { createdAt: true },
    }),
    prisma.linkClick.findFirst({
      where: human,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  // token -> contact, built once from the list rather than per click
  const contacts = await prisma.mailingContact.findMany({ select: { email: true, name: true } });
  const byToken = new Map(contacts.map((c) => [unsubToken(c.email), c]));

  const identified = tokenGroups.length;
  const totalPages = Math.max(1, Math.ceil(identified / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  const clickers = tokenGroups
    .sort((a, b) => (b._min.createdAt?.getTime() ?? 0) - (a._min.createdAt?.getTime() ?? 0))
    .slice(start, start + PAGE_SIZE)
    .map((g) => {
      const contact = byToken.get(g.token);
      return {
        email: contact?.email || "(unknown)",
        name: contact?.name || "",
        at: g._min.createdAt,
        count: g._count._all,
      };
    });

  return NextResponse.json({
    campaign,
    total, // every human click, repeats included
    unique: identified + anonymous, // distinct recipients, plus untracked hits
    identified,
    anonymous, // clicked without a token — forwarded, or copied from the email
    scanners, // security scanners and messaging-app link previews
    lastClickAt: latest?.createdAt ?? null,
    byUrl: Array.from(urlGroups)
      .filter((g) => g.url)
      .map((g) => ({ url: g.url, clicks: g._count._all }))
      .sort((a, b) => b.clicks - a.clicks),
    clickers,
    page,
    totalPages,
    pageSize: PAGE_SIZE,
  });
}
