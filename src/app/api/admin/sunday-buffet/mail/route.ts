import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendViaResend, sendRawEmail, isResendConfigured } from "@/lib/email";
import { upcomingSunday, prettyDate } from "@/lib/sunday-buffet";
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

/**
 * Plain, personal-note style email (no logo/banner/buttons) so Gmail is more
 * likely to file it under Primary rather than Promotions. Escapes name + message.
 */
function buildHtml(name: string, message: string): string {
  const body = esc(message)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:20px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#222;font-size:15px;line-height:1.6;">
  <p style="margin:0 0 14px;">Hi ${esc(name) || "there"},</p>
  ${body}
  <p style="margin:18px 0 0;">Thanks,<br>Demi&rsquo;s Restaurant, Streatham Hill</p>
</div>
</body></html>`;
}

/** POST /api/admin/sunday-buffet/mail — email everyone booked for a Sunday. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date: rawDate, subject, message, id } = await req.json();
  const date = rawDate || upcomingSunday();
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
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
  let sent = 0, failed = 0;
  for (const b of bookings) {
    const ok = await deliver(b.email, subj, buildHtml(b.name, message)).catch(() => false);
    if (ok) sent++; else failed++;
  }

  return NextResponse.json({ sent, failed, total: bookings.length, date, prettyDate: prettyDate(date) });
}
