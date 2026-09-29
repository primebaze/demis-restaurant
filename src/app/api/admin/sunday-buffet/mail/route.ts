import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendViaResend, sendRawEmail, isResendConfigured } from "@/lib/email";
import { upcomingSunday, prettyDate } from "@/lib/sunday-buffet";
import { serviceDate } from "@/lib/checkin-auth";
import { trackedSiteUrl } from "@/lib/marketing";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The public booking page. Deliberately NOT tracked itself — see trackedSiteUrl. */
const BUFFET_PATH = "/sunday-buffet";

function esc(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Normal transactional delivery (Resend bookings@ domain, SMTP fallback). NOT the marketing domain. */
async function deliver(to: string, subject: string, html: string): Promise<boolean> {
  if (isResendConfigured() && (await sendViaResend(to, subject, html))) return true;
  return sendRawEmail(to, subject, html);
}

/**
 * Plain, personal-note style email (no logo/banner/buttons) so Gmail is more
 * likely to file it under Primary rather than Promotions. Escapes name + message.
 *
 * {buffet} in the message becomes a link to the booking page carrying this
 * recipient's token, so a click is attributable to them. The placeholder is
 * substituted AFTER escaping — it holds no special characters, so it comes
 * through untouched, and the anchor inserted here is not re-escaped.
 */
function buildHtml(name: string, message: string, email: string, campaign: string): string {
  const link = trackedSiteUrl(BUFFET_PATH, campaign, email);
  const body = esc(message)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("")
    // A pasted URL becomes a real anchor. Left as typed, so it is untracked —
    // {buffet} is the version that identifies who clicked.
    .replace(
      /(https?:\/\/[^\s<"]+)/g,
      '<a href="$1" style="color:#b8862f;text-decoration:underline;">$1</a>'
    )
    .replace(
      /\{\{?\s*buffet\s*\}?\}/gi,
      `<a href="${link}" style="color:#b8862f;text-decoration:underline;">book your place</a>`
    );
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:20px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#222;font-size:15px;line-height:1.6;">
  <p style="margin:0 0 14px;">Hi ${esc(name) || "there"},</p>
  ${body}
  <p style="margin:18px 0 0;">Thanks,<br>Demi&rsquo;s Restaurant, Streatham Hill</p>
</div>
</body></html>`;
}

/** Sends per request when mailing everyone, so each call finishes well inside maxDuration. */
const PAGE_SIZE = 25;
/** Gap between sends. Keeps us under Resend's per-second limit so nothing spills to the 50/hr SMTP fallback. */
const SEND_GAP_MS = 550;

/**
 * Everyone booked for a Sunday that has already happened, one entry per email
 * address. Upcoming bookings don't count, so this reaches people who have been.
 * A regular who came five Sundays gets one email, greeted by the name on their
 * most recent booking. Sorted by email so paging is stable between calls.
 */
async function everyoneEverBooked(): Promise<{ email: string; name: string }[]> {
  const rows = await prisma.sundayBuffetBooking.findMany({
    where: { date: { lt: serviceDate() }, status: { not: "cancelled" }, email: { not: "" } },
    orderBy: { createdAt: "desc" },
    select: { email: true, name: true },
  });
  const byEmail = new Map<string, { email: string; name: string }>();
  for (const r of rows) {
    const key = r.email.trim().toLowerCase();
    if (key && !byEmail.has(key)) byEmail.set(key, { email: r.email.trim(), name: r.name });
  }
  return Array.from(byEmail.values()).sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()));
}

/** GET /api/admin/sunday-buffet/mail?scope=all — how many past guests "everyone" would reach. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = new URL(req.url).searchParams.get("scope");
  if (scope !== "all") return NextResponse.json({ error: "Unknown scope" }, { status: 400 });
  return NextResponse.json({ total: (await everyoneEverBooked()).length });
}

/** POST /api/admin/sunday-buffet/mail — email everyone booked for a Sunday. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date: rawDate, subject, message, id, scope, offset: rawOffset } = await req.json();
  const date = rawDate || upcomingSunday();
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  // Every past guest, sent a page at a time. The admin screen
  // calls this repeatedly with the returned nextOffset until it comes back null.
  if (scope === "all") {
    const everyone = await everyoneEverBooked();
    if (everyone.length === 0) {
      return NextResponse.json({ error: "No past guests with an email to send to." }, { status: 400 });
    }
    const offset = Math.max(0, Math.floor(Number(rawOffset) || 0));
    const page = everyone.slice(offset, offset + PAGE_SIZE);
    const subj = String(subject).slice(0, 150);
    // One campaign per send day, so a "come back" blast has its own click count.
    const campaign = `buffet-all-${serviceDate()}`;

    let sent = 0, failed = 0;
    for (let i = 0; i < page.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, SEND_GAP_MS));
      const b = page[i];
      const ok = await deliver(b.email, subj, buildHtml(b.name, message, b.email, campaign)).catch(() => false);
      if (ok) sent++; else failed++;
    }

    const next = offset + page.length;
    return NextResponse.json({
      sent, failed, total: everyone.length,
      nextOffset: next < everyone.length ? next : null,
    });
  }

  // With an `id`, email just that one guest; otherwise everyone booked for the Sunday.
  const bookings = await prisma.sundayBuffetBooking.findMany({
    where: id
      ? { id: String(id), status: { not: "cancelled" }, email: { not: "" } }
      : { date, status: { not: "cancelled" }, email: { not: "" } },
    select: { email: true, name: true },
  });
  if (bookings.length === 0) {
    return NextResponse.json({ error: "No reservation with an email to send to." }, { status: 400 });
  }

  const subj = String(subject).slice(0, 150);
  // Per-Sunday campaign, so each week's send has its own click count.
  const campaign = `buffet-${date}`;

  let sent = 0, failed = 0;
  for (const b of bookings) {
    const ok = await deliver(b.email, subj, buildHtml(b.name, message, b.email, campaign)).catch(
      () => false
    );
    if (ok) sent++; else failed++;
  }

  return NextResponse.json({ sent, failed, total: bookings.length, date, prettyDate: prettyDate(date) });
}
