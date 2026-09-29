import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendViaResend, sendRawEmail, isResendConfigured } from "@/lib/email";
import { serviceDate } from "@/lib/checkin-auth";
import { trackedSiteUrl } from "@/lib/marketing";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sends per request, so each call finishes well inside maxDuration. */
const PAGE_SIZE = 25;
/** Gap between sends. Keeps us under Resend's per-second limit so nothing spills to the 50/hr SMTP fallback. */
const SEND_GAP_MS = 550;

/** A booking that actually took place. No-shows, cancellations and unpaid holds are left out. */
const ATTENDED = ["confirmed", "modified", "completed"];

const LOCATIONS: Record<string, string> = { cricklewood: "Cricklewood", streatham: "Streatham Hill" };

function esc(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Normal transactional delivery (Resend bookings@ domain, SMTP fallback). NOT the marketing domain. */
async function deliver(to: string, subject: string, html: string): Promise<boolean> {
  if (isResendConfigured() && (await sendViaResend(to, subject, html))) return true;
  return sendRawEmail(to, subject, html);
}

/**
 * Plain, personal-note style email, same as the buffet one: no logo, banner or
 * buttons, so Gmail is more likely to file it under Primary.
 *
 * {booking} becomes a tracked link to the table booking page for this
 * recipient. Pasted URLs become ordinary untracked links.
 */
function buildHtml(firstName: string, message: string, email: string, campaign: string, signoff: string): string {
  const link = trackedSiteUrl("/booking", campaign, email);
  const body = esc(message)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("")
    .replace(
      /(https?:\/\/[^\s<"]+)/g,
      '<a href="$1" style="color:#b8862f;text-decoration:underline;">$1</a>'
    )
    .replace(
      /\{\{?\s*booking\s*\}?\}/gi,
      `<a href="${link}" style="color:#b8862f;text-decoration:underline;">book a table</a>`
    );
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:20px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#222;font-size:15px;line-height:1.6;">
  <p style="margin:0 0 14px;">Hi ${esc(firstName) || "there"},</p>
  ${body}
  <p style="margin:18px 0 0;">Thanks,<br>${esc(signoff)}</p>
</div>
</body></html>`;
}

/**
 * Everyone whose table booking date has already passed, one entry per email
 * address. Upcoming bookings don't count. A regular who came five times gets
 * one email. Sorted by email so paging is stable between calls.
 */
async function pastGuests(location: string | null): Promise<{ email: string; firstName: string }[]> {
  const rows = await prisma.booking.findMany({
    where: {
      date: { lt: serviceDate() },
      status: { in: ATTENDED },
      ...(location ? { location: { slug: location } } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: { guest: { select: { email: true, name: true } } },
  });
  const byEmail = new Map<string, { email: string; firstName: string }>();
  for (const r of rows) {
    const email = (r.guest.email || "").trim();
    const key = email.toLowerCase();
    if (!key.includes("@") || byEmail.has(key)) continue;
    byEmail.set(key, { email, firstName: (r.guest.name || "").trim().split(/\s+/)[0] || "" });
  }
  return Array.from(byEmail.values()).sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()));
}

function parseLocation(v: unknown): string | null {
  return typeof v === "string" && v in LOCATIONS ? v : null;
}

/** GET /api/admin/bookings/mail?location=cricklewood — how many past guests a send would reach. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const location = parseLocation(new URL(req.url).searchParams.get("location"));
  return NextResponse.json({ total: (await pastGuests(location)).length });
}

/**
 * POST /api/admin/bookings/mail { subject, message, location?, offset? }
 * Sends one page and returns nextOffset; the admin screen calls again until it is null.
 */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, message, location: rawLocation, offset: rawOffset } = await req.json();
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const location = parseLocation(rawLocation);
  const guests = await pastGuests(location);
  if (guests.length === 0) {
    return NextResponse.json({ error: "No past guests with an email to send to." }, { status: 400 });
  }

  const offset = Math.max(0, Math.floor(Number(rawOffset) || 0));
  const page = guests.slice(offset, offset + PAGE_SIZE);
  const subj = String(subject).slice(0, 150);
  const signoff = location ? `Demi's Restaurant, ${LOCATIONS[location]}` : "Demi's Restaurant";
  // One campaign per send day and site, so each blast has its own click count.
  const campaign = `bookings-${location || "all"}-${serviceDate()}`;

  let sent = 0, failed = 0;
  for (let i = 0; i < page.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    const g = page[i];
    const ok = await deliver(g.email, subj, buildHtml(g.firstName, message, g.email, campaign, signoff)).catch(() => false);
    if (ok) sent++; else failed++;
  }

  const next = offset + page.length;
  return NextResponse.json({
    sent, failed, total: guests.length,
    nextOffset: next < guests.length ? next : null,
  });
}
