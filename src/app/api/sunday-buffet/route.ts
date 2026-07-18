import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upcomingSunday, prettyDate, BUFFET_START, BUFFET_END, BUFFET_LOCATION, BUFFET_ADDRESS } from "@/lib/sunday-buffet";
import { sendRawEmail, sendViaResend, isResendConfigured } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

// Max reservations accepted from one IP per hour (blocks scripted floods).
const RESERVE_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

/** Escape user-supplied text before putting it into email HTML. */
function esc(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Send via Resend (from bookings@demisrestaurant.co.uk) when configured, else SMTP. */
async function deliver(to: string, subject: string, html: string): Promise<void> {
  if (isResendConfigured() && (await sendViaResend(to, subject, html))) return;
  await sendRawEmail(to, subject, html);
}

/** GET — the Sunday people are booking for. */
export async function GET() {
  const date = upcomingSunday();
  return NextResponse.json({
    date,
    prettyDate: prettyDate(date),
    start: BUFFET_START,
    end: BUFFET_END,
    location: BUFFET_LOCATION,
    address: BUFFET_ADDRESS,
  });
}

/** POST — reserve a spot for the upcoming Sunday. */
export async function POST(req: Request) {
  const body = await req.json();

  // Honeypot: a hidden field real users never fill.
  if (String(body.website || "").trim()) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  }

  // Rate limit by IP to block scripted reservation floods.
  const ip = getClientIp(req);
  const limit = rateLimit(`buffet:${ip}`, RESERVE_RATE_LIMIT);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many reservations from this device. Please try again in a little while, or give us a call." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetMs / 1000)) } }
    );
  }

  // Cloudflare Turnstile — blocks scripts that skip the honeypot. Only enforced
  // when TURNSTILE_SECRET_KEY is configured (until then the other checks apply).
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const token = String(body.turnstileToken || "");
    if (!token) return NextResponse.json({ error: "Please complete the verification and try again." }, { status: 400 });
    try {
      const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: ip }),
      });
      const outcome = (await verify.json()) as { success?: boolean };
      if (!outcome.success) {
        return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Could not verify. Please try again." }, { status: 400 });
    }
  }

  const name = String(body.name || "").trim().slice(0, 80);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
  const phone = String(body.phone || "").trim().slice(0, 30);
  const partySize = Math.min(10, Math.max(1, parseInt(body.partySize) || 1));

  if (!name) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Please enter your phone number" }, { status: 400 });
  if ((phone.match(/\d/g) || []).length < 7) return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Please enter your email" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });

  const date = upcomingSunday();

  // One booking per email per Sunday.
  const already = await prisma.sundayBuffetBooking.findFirst({
    where: { date, email, status: { not: "cancelled" } },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json(
      { error: "You have already reserved for Sunday. See you there! To change your booking, give us a call." },
      { status: 429 }
    );
  }

  const booking = await prisma.sundayBuffetBooking.create({
    data: { date, name, email, phone, partySize, ip },
  });

  // Guest confirmation + admin notification (fire-and-forget)
  deliver(email, "Your Sunday buffet reservation is confirmed", guestEmailHtml({ name, date, partySize })).catch(() => {});
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "bookings@demisrestaurant.co.uk";
  deliver(adminEmail, `New Sunday buffet reservation · ${name} (party of ${partySize})`, adminEmailHtml({ name, email, phone, date, partySize })).catch(() => {});

  return NextResponse.json({
    id: booking.id,
    date,
    partySize,
    prettyDate: prettyDate(date),
    start: BUFFET_START,
    end: BUFFET_END,
    address: BUFFET_ADDRESS,
  });
}

function adminEmailHtml(o: { name: string; email: string; phone: string; date: string; partySize: number }): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#888;font-size:13px;width:120px;">${k}</td><td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;">${v}</td></tr>`;
  return `<!DOCTYPE html><html><body style="margin:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 20px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:10px;overflow:hidden;">
  <tr><td style="background:#141210;padding:18px 28px;color:#e8cc9c;font-size:14px;font-weight:700;letter-spacing:1px;">NEW SUNDAY BUFFET RESERVATION</td></tr>
  <tr><td style="padding:22px 28px;"><table width="100%" cellpadding="0" cellspacing="0">
    ${row("Name", esc(o.name))}
    ${row("Party size", String(o.partySize))}
    ${row("Date", prettyDate(o.date))}
    ${row("Email", esc(o.email))}
    ${row("Phone", esc(o.phone))}
  </table></td></tr>
</table></td></tr></table></body></html>`;
}

function guestEmailHtml(o: { name: string; date: string; partySize: number }): string {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f0f0f0;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="padding:36px 40px 24px;">
  <div style="font-family:Georgia,serif;font-size:34px;color:#e8cc9c;letter-spacing:2px;">Demi&rsquo;s</div>
  <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#999;text-transform:uppercase;margin-top:4px;">Restaurant</div>
</td></tr>
<tr><td style="padding:8px 44px 36px;font-family:Helvetica,Arial,sans-serif;color:#333;font-size:15px;line-height:1.7;">
  <p style="margin:0 0 16px;">Hi ${esc(o.name)},</p>
  <p style="margin:0 0 16px;">Your reservation for our Sunday buffet is <strong>confirmed</strong>. We can't wait to have you.</p>
  <table width="100%" style="background:#faf7f0;border-radius:8px;margin:0 0 16px;"><tr><td style="padding:20px;text-align:center;">
    <div style="font-family:Georgia,serif;font-size:22px;color:#8b0000;">${prettyDate(o.date)}</div>
    <div style="font-size:13px;color:#666;margin-top:6px;">Party of ${o.partySize} &middot; Doors 12pm &middot; buffet from 12:30pm</div>
  </td></tr></table>
  <p style="margin:0;color:#666;font-size:13px;">${BUFFET_ADDRESS}. See you Sunday!</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
