import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upcomingSunday, prettyDate, groupPrice, priceTierFor, tiersLeft, BUFFET_START, BUFFET_END, BUFFET_LOCATION, BUFFET_ADDRESS } from "@/lib/sunday-buffet";
import { sendRawEmail, sendViaResend, isResendConfigured } from "@/lib/email";
export const dynamic = "force-dynamic";

/** Send via Resend (from bookings@demisrestaurant.co.uk) when configured, else SMTP. */
async function deliver(to: string, subject: string, html: string): Promise<void> {
  if (isResendConfigured() && (await sendViaResend(to, subject, html))) return;
  await sendRawEmail(to, subject, html);
}

/** Next starting cover number for a date — based on the highest number assigned so
 *  far, so cancelling or deleting a booking never causes number collisions. */
async function nextCover(date: string): Promise<number> {
  const last = await prisma.sundayBuffetBooking.findFirst({
    where: { date },
    orderBy: { number: "desc" },
    select: { number: true, partySize: true },
  });
  return last ? last.number + last.partySize : 1;
}

/** GET — availability for the upcoming Sunday. */
export async function GET() {
  const date = upcomingSunday();
  try {
    const nextNumber = await nextCover(date);
    const booked = nextNumber - 1;
    return NextResponse.json({
      date,
      prettyDate: prettyDate(date),
      start: BUFFET_START,
      end: BUFFET_END,
      location: BUFFET_LOCATION,
      address: BUFFET_ADDRESS,
      bookedCovers: booked,
      nextNumber,
      nextPrice: priceTierFor(nextNumber),
      tiersLeft: tiersLeft(booked),
    });
  } catch {
    // Table not migrated yet — still let the page render.
    return NextResponse.json({
      date, prettyDate: prettyDate(date), start: BUFFET_START, end: BUFFET_END,
      location: BUFFET_LOCATION, address: BUFFET_ADDRESS,
      bookedCovers: 0, nextNumber: 1, nextPrice: 20, tiersLeft: tiersLeft(0), notMigrated: true,
    });
  }
}

/** POST — reserve a spot; assigns the next cover number(s) atomically. */
export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const partySize = Math.min(20, Math.max(1, parseInt(body.partySize) || 1));

  if (!name) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
  }

  const date = upcomingSunday();

  // Assign the next cover number; retry if two people grab the same slot at once.
  for (let attempt = 0; attempt < 6; attempt++) {
    const startCover = await nextCover(date);
    try {
      const booking = await prisma.sundayBuffetBooking.create({
        data: { date, number: startCover, partySize, name, email, phone },
      });
      const endCover = startCover + partySize - 1;
      const total = groupPrice(startCover, partySize);

      const range = partySize === 1 ? `No. ${startCover}` : `No. ${startCover}–${endCover}`;

      // Guest confirmation (fire-and-forget)
      if (email) {
        deliver(email, `You're booked for Sunday buffet — ${range}`, buffetEmailHtml({ name, range, total, partySize, date })).catch(() => {});
      }

      // Admin notification (fire-and-forget)
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "admin@demisrestaurant.co.uk";
      deliver(
        adminEmail,
        `New Sunday buffet booking — ${range} · ${name}`,
        buffetAdminHtml({ name, email, phone, range, total, partySize, date })
      ).catch(() => {});

      return NextResponse.json({
        id: booking.id,
        number: startCover,
        endCover,
        partySize,
        total,
        perPerson: partySize === 1 ? total : null,
        date,
        prettyDate: prettyDate(date),
        start: BUFFET_START,
        end: BUFFET_END,
        location: BUFFET_LOCATION,
        address: BUFFET_ADDRESS,
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "P2002") continue; // number taken, retry
      console.error("Sunday buffet booking error:", e);
      return NextResponse.json({ error: "Could not book right now. Please try again." }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Too busy right now, please try again." }, { status: 409 });
}

function buffetAdminHtml(o: { name: string; email: string; phone: string; range: string; total: number; partySize: number; date: string }): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#888;font-size:13px;width:120px;">${k}</td><td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;">${v}</td></tr>`;
  return `<!DOCTYPE html><html><body style="margin:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 20px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:10px;overflow:hidden;">
  <tr><td style="background:#141210;padding:18px 28px;color:#e8cc9c;font-size:14px;font-weight:700;letter-spacing:1px;">NEW SUNDAY BUFFET BOOKING</td></tr>
  <tr><td style="padding:22px 28px;">
    <p style="margin:0 0 14px;font-size:22px;color:#8b0000;font-weight:700;">${o.range}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Name", o.name)}
      ${row("Party size", String(o.partySize))}
      ${row("Total (at door)", "£" + o.total)}
      ${row("Date", prettyDate(o.date))}
      ${row("Email", o.email || "—")}
      ${row("Phone", o.phone || "—")}
    </table>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function buffetEmailHtml(o: { name: string; range: string; total: number; partySize: number; date: string }): string {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f0f0f0;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="padding:36px 40px 24px;">
  <div style="font-family:Georgia,serif;font-size:34px;color:#e8cc9c;letter-spacing:2px;">Demi&rsquo;s</div>
  <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#999;text-transform:uppercase;margin-top:4px;">Restaurant</div>
</td></tr>
<tr><td style="padding:8px 44px 36px;font-family:Helvetica,Arial,sans-serif;color:#333;font-size:15px;line-height:1.7;">
  <p style="margin:0 0 16px;">Hi ${o.name},</p>
  <p style="margin:0 0 16px;">You're booked in for our Sunday buffet at Streatham Hill. Here's your spot:</p>
  <table width="100%" style="background:#faf7f0;border-radius:8px;margin:0 0 16px;"><tr><td style="padding:20px;text-align:center;">
    <div style="font-family:Georgia,serif;font-size:30px;color:#8b0000;">${o.range}</div>
    <div style="font-size:13px;color:#666;margin-top:6px;">Party of ${o.partySize} &middot; £${o.total} total, paid when you arrive</div>
  </td></tr></table>
  <p style="margin:0 0 8px;">${prettyDate(o.date)}, doors from ${BUFFET_START} until ${BUFFET_END}.</p>
  <p style="margin:0;color:#666;font-size:13px;">${BUFFET_ADDRESS}. Come early, the lower your number, the less you pay. See you Sunday!</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
