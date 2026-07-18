import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendViaResend, sendRawEmail, isResendConfigured } from "@/lib/email";
import { upcomingSunday, prettyDate, BOOKINGS_FROM } from "@/lib/sunday-buffet";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function esc(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Normal transactional delivery (Resend bookings@ domain, SMTP fallback). NOT the marketing domain. */
async function deliver(to: string, subject: string, html: string): Promise<boolean> {
  if (isResendConfigured() && (await sendViaResend(to, subject, html, BOOKINGS_FROM))) return true;
  return sendRawEmail(to, subject, html, BOOKINGS_FROM);
}

/** Branded email wrapping the admin's message. Escapes name + message. */
function buildHtml(name: string, message: string): string {
  const body = esc(message)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!DOCTYPE html><html><body style="margin:0;background:#f0f0f0;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="padding:36px 40px 20px;">
  <div style="font-family:Georgia,serif;font-size:34px;color:#e8cc9c;letter-spacing:2px;">Demi&rsquo;s</div>
  <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#999;text-transform:uppercase;margin-top:4px;">Restaurant</div>
</td></tr>
<tr><td style="padding:8px 44px 36px;font-family:Helvetica,Arial,sans-serif;color:#333;font-size:15px;line-height:1.7;">
  <p style="margin:0 0 16px;">Hi ${esc(name) || "there"},</p>
  ${body}
  <p style="margin:24px 0 0;color:#888;font-size:12px;">Demi&rsquo;s Nigerian Restaurant &middot; Streatham Hill</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

/** POST /api/admin/sunday-buffet/mail — email everyone booked for a Sunday. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date: rawDate, subject, message } = await req.json();
  const date = rawDate || upcomingSunday();
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const bookings = await prisma.sundayBuffetBooking.findMany({
    where: { date, status: { not: "cancelled" }, email: { not: "" } },
    select: { email: true, name: true },
  });
  if (bookings.length === 0) {
    return NextResponse.json({ error: "No reservations with an email for this Sunday." }, { status: 400 });
  }

  const subj = String(subject).slice(0, 150);
  let sent = 0, failed = 0;
  for (const b of bookings) {
    const ok = await deliver(b.email, subj, buildHtml(b.name, message)).catch(() => false);
    if (ok) sent++; else failed++;
  }

  return NextResponse.json({ sent, failed, total: bookings.length, date, prettyDate: prettyDate(date) });
}
