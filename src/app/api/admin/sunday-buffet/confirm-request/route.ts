import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendViaResend, sendRawEmail, isResendConfigured } from "@/lib/email";
import { upcomingSunday, prettyDate, confirmUrl, BUFFET_ADDRESS } from "@/lib/sunday-buffet";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function esc(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Normal transactional delivery (Resend bookings@ domain, SMTP fallback). NOT the marketing domain. */
async function deliver(to: string, subject: string, html: string): Promise<boolean> {
  if (isResendConfigured() && (await sendViaResend(to, subject, html))) return true;
  return sendRawEmail(to, subject, html);
}

function confirmEmailHtml(name: string, dateLabel: string, url: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f0f0f0;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="padding:36px 40px 20px;">
  <div style="font-family:Georgia,serif;font-size:34px;color:#e8cc9c;letter-spacing:2px;">Demi&rsquo;s</div>
  <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#999;text-transform:uppercase;margin-top:4px;">Restaurant</div>
</td></tr>
<tr><td style="padding:8px 44px 8px;font-family:Helvetica,Arial,sans-serif;color:#333;font-size:15px;line-height:1.7;">
  <p style="margin:0 0 16px;">Hi ${esc(name) || "there"},</p>
  <p style="margin:0 0 20px;">We can&rsquo;t wait to see you at our Sunday buffet on <strong>${esc(dateLabel)}</strong>. Could you let us know you&rsquo;re still coming? It helps us save your table.</p>
</td></tr>
<tr><td align="center" style="padding:6px 44px 8px;">
  <a href="${url}" style="display:inline-block;background:#e3c07a;color:#141210;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:15px 44px;border-radius:8px;">Yes, I&rsquo;ll be there</a>
</td></tr>
<tr><td style="padding:14px 44px 36px;font-family:Helvetica,Arial,sans-serif;color:#888;font-size:12px;line-height:1.6;">
  <p style="margin:0 0 6px;">Can&rsquo;t make it? Just give us a call and we&rsquo;ll free up your table.</p>
  <p style="margin:0;">${esc(BUFFET_ADDRESS)} &middot; Doors 12pm, buffet from 12:30pm.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

/** POST { date } — email everyone booked, asking them to confirm attendance. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date: rawDate, id } = await req.json().catch(() => ({}));
  const date = rawDate || upcomingSunday();
  const dateLabel = prettyDate(date);

  // With an `id`, ask just that one guest to confirm; otherwise everyone booked.
  const bookings = await prisma.sundayBuffetBooking.findMany({
    where: id
      ? { id: String(id), status: { not: "cancelled" }, email: { not: "" } }
      : { date, status: { not: "cancelled" }, email: { not: "" } },
    select: { id: true, name: true, email: true, confirmToken: true, date: true },
  });
  if (bookings.length === 0) {
    return NextResponse.json({ error: "No reservation with an email to send to." }, { status: 400 });
  }

  let sent = 0, failed = 0;
  for (const b of bookings) {
    // Give each booking a stable token the first time we ask them to confirm.
    let token = b.confirmToken;
    if (!token) {
      token = randomUUID();
      await prisma.sundayBuffetBooking.update({ where: { id: b.id }, data: { confirmToken: token } });
    }
    const html = confirmEmailHtml(b.name, prettyDate(b.date), confirmUrl(token));
    const ok = await deliver(b.email, "Confirm buffet attendance", html).catch(() => false);
    if (ok) sent++; else failed++;
  }

  return NextResponse.json({ sent, failed, total: bookings.length, date, prettyDate: dateLabel });
}
