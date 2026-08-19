import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  upcomingSaturdays, prettyDate, BRUNCH_LOCATION, BRUNCH_ADDRESS, BRUNCH_PRICE, BRUNCH_PRICE_DRINKS,
  BRUNCH_START, BRUNCH_END, ARRIVAL_SLOTS, isArrivalSlot, isBrunchPackage, packagePrice, packageLabel,
} from "@/lib/saturday-brunch";
import { sendRawEmail, sendViaResend, isResendConfigured, type MailAttachment } from "@/lib/email";
import { buildIcs, googleCalendarUrl, londonToUtc, type IcsEvent } from "@/lib/ics";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Max reservations accepted from one IP per hour (blocks scripted floods).
const RESERVE_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

/** Escape user-supplied text before putting it into email HTML. */
function esc(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Send via Resend when configured, else SMTP. Reports whether it worked. */
async function deliver(to: string, subject: string, html: string, attachments?: MailAttachment[]): Promise<boolean> {
  if (isResendConfigured() && (await sendViaResend(to, subject, html, undefined, attachments))) return true;
  return sendRawEmail(to, subject, html, undefined, attachments);
}

/** The guest's sitting, as a calendar event. Ends when service does (4:30pm). */
function brunchEvent(o: { id: string; date: string; arrivalTime: string; partySize: number; pkg: string }): IcsEvent {
  return {
    uid: `brunch-${o.id}@demisrestaurant.co.uk`,
    start: londonToUtc(o.date, o.arrivalTime || "13:00"),
    end: londonToUtc(o.date, "16:30"),
    summary: "Saturday Bottomless Brunch at Demi's",
    description: `${packageLabel(o.pkg)}. Party of ${o.partySize}, arriving ${o.arrivalTime}. Paid at the door.`,
    location: BRUNCH_ADDRESS,
    url: "https://www.demisrestaurant.co.uk/saturday-brunch",
    organizerEmail: "bookings@demisrestaurant.co.uk",
  };
}

/** Cap how long a hung mail server can stall the booking response. */
function withTimeout(p: Promise<boolean>, ms = 8000): Promise<boolean> {
  return Promise.race([p, new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);
}

export type DateAvailability = {
  date: string;
  prettyDate: string;
  blocked: boolean;
  soldOut: boolean;
  capacity: number | null;
  booked: number;
  spotsLeft: number | null;
  note: string;
};

/**
 * Availability for each bookable Saturday. A date is sold out when an admin has
 * blocked it, or when its optional capacity has been reached.
 */
async function availability(): Promise<DateAvailability[]> {
  const dates = upcomingSaturdays();
  try {
    const [settings, bookings] = await Promise.all([
      prisma.brunchDate.findMany({ where: { date: { in: dates } } }),
      prisma.saturdayBrunchBooking.groupBy({
        by: ["date"],
        where: { date: { in: dates }, status: { not: "cancelled" } },
        _sum: { partySize: true },
      }),
    ]);
    const settingFor = new Map(settings.map((s) => [s.date, s]));
    const bookedFor = new Map(bookings.map((b) => [b.date, b._sum.partySize || 0]));

    return dates
      // Hidden dates aren't offered to guests at all.
      .filter((date) => !settingFor.get(date)?.hidden)
      .map((date) => {
        const s = settingFor.get(date);
        const booked = bookedFor.get(date) || 0;
        const capacity = s?.capacity ?? null;
        const full = capacity !== null && booked >= capacity;
        return {
          date,
          prettyDate: prettyDate(date),
          blocked: !!s?.blocked,
          soldOut: !!s?.blocked || full,
          capacity,
          booked,
          spotsLeft: capacity === null ? null : Math.max(0, capacity - booked),
          note: s?.note || "",
        };
      });
  } catch {
    // Table not migrated yet — everything open.
    return dates.map((date) => ({
      date, prettyDate: prettyDate(date), blocked: false, soldOut: false,
      capacity: null, booked: 0, spotsLeft: null, note: "",
    }));
  }
}

/** GET — the Saturdays people can book, and whether each is still open. */
export async function GET() {
  const dates = await availability();
  // Every date could be hidden, so this can legitimately be undefined.
  const firstOpen = dates.find((d) => !d.soldOut) || dates[0];
  return NextResponse.json({
    // The next bookable Saturday (kept top-level for the booking form's header).
    date: firstOpen?.date ?? "",
    prettyDate: firstOpen?.prettyDate ?? "",
    dates,
    allSoldOut: dates.length === 0 || dates.every((d) => d.soldOut),
    price: BRUNCH_PRICE,
    priceWithDrinks: BRUNCH_PRICE_DRINKS,
    location: BRUNCH_LOCATION,
    address: BRUNCH_ADDRESS,
    arrivalSlots: ARRIVAL_SLOTS,
  });
}

/** POST — reserve a table for the upcoming Saturday brunch. */
export async function POST(req: Request) {
  const body = await req.json();

  // Honeypot: a hidden field real users never fill.
  if (String(body.website || "").trim()) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  }

  // Rate limit by IP to block scripted reservation floods.
  const ip = getClientIp(req);
  const limit = rateLimit(`brunch:${ip}`, RESERVE_RATE_LIMIT);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many reservations from this device. Please try again in a little while, or give us a call." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetMs / 1000)) } }
    );
  }

  // Cloudflare Turnstile — only enforced when the secret is configured.
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
  const arrivalTime = String(body.arrivalTime || "").trim();
  const pkg = isBrunchPackage(body.package) ? body.package : "food";
  const pricePerHead = packagePrice(pkg);

  if (!name) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Please enter your phone number" }, { status: 400 });
  if ((phone.match(/\d/g) || []).length < 7) return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Please enter your email" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
  if (!isArrivalSlot(arrivalTime)) return NextResponse.json({ error: "Please choose what time you'll arrive" }, { status: 400 });

  // The Saturday they picked. Must be one we're actually taking bookings for.
  const requested = String(body.date || "").trim();
  const open = await availability();
  const chosen = requested
    ? open.find((d) => d.date === requested)
    : open.find((d) => !d.soldOut);

  if (!chosen) {
    return NextResponse.json({ error: "That date isn't available. Please pick another Saturday." }, { status: 400 });
  }
  if (chosen.soldOut) {
    return NextResponse.json(
      { error: `${chosen.prettyDate} is fully booked. Please choose another Saturday.` },
      { status: 409 }
    );
  }
  // Don't let a group take more covers than are left.
  if (chosen.spotsLeft !== null && partySize > chosen.spotsLeft) {
    return NextResponse.json(
      { error: `Only ${chosen.spotsLeft} space${chosen.spotsLeft === 1 ? "" : "s"} left on ${chosen.prettyDate}.` },
      { status: 409 }
    );
  }
  const date = chosen.date;

  // One booking per email per Saturday.
  const already = await prisma.saturdayBrunchBooking.findFirst({
    where: { date, email, status: { not: "cancelled" } },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json(
      { error: "You have already reserved for Saturday. See you there! To change your booking, give us a call." },
      { status: 429 }
    );
  }

  const booking = await prisma.saturdayBrunchBooking.create({
    data: { date, name, email, phone, partySize, arrivalTime, package: pkg, pricePerHead, ip },
  });

  // Must be awaited — Vercel freezes the function once the response is returned.
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "bookings@demisrestaurant.co.uk";
  const [guestSent, adminSent] = await Promise.all([
    withTimeout(deliver(email, "Your Saturday brunch reservation is confirmed", guestEmailHtml({ name, date, partySize, arrivalTime, pkg, pricePerHead, calendarUrl: googleCalendarUrl(brunchEvent({ id: booking.id, date, arrivalTime, partySize, pkg })) }), [{ filename: "demis-saturday-brunch.ics", content: buildIcs(brunchEvent({ id: booking.id, date, arrivalTime, partySize, pkg })), contentType: "text/calendar; charset=utf-8; method=PUBLISH" }])).catch(() => false),
    withTimeout(deliver(adminEmail, `New Saturday brunch reservation · ${name} (party of ${partySize}, ${arrivalTime})`, adminEmailHtml({ name, email, phone, date, partySize, arrivalTime, pkg, pricePerHead }))).catch(() => false),
  ]);
  if (!guestSent) console.error(`[Brunch] Guest confirmation email FAILED → ${email}`);
  if (!adminSent) console.error(`[Brunch] Admin notification email FAILED → ${adminEmail}`);

  return NextResponse.json({
    id: booking.id,
    date,
    partySize,
    arrivalTime,
    package: pkg,
    packageLabel: packageLabel(pkg),
    pricePerHead,
    price: BRUNCH_PRICE,
    priceWithDrinks: BRUNCH_PRICE_DRINKS,
    prettyDate: prettyDate(date),
    address: BRUNCH_ADDRESS,
  });
}

function adminEmailHtml(o: { name: string; email: string; phone: string; date: string; partySize: number; arrivalTime: string; pkg: string; pricePerHead: number }): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#888;font-size:13px;width:120px;">${k}</td><td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;">${v}</td></tr>`;
  return `<!DOCTYPE html><html><body style="margin:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 20px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:10px;overflow:hidden;">
  <tr><td style="background:#141210;padding:18px 28px;color:#e8cc9c;font-size:14px;font-weight:700;letter-spacing:1px;">NEW SATURDAY BRUNCH RESERVATION</td></tr>
  <tr><td style="padding:22px 28px;"><table width="100%" cellpadding="0" cellspacing="0">
    ${row("Name", esc(o.name))}
    ${row("Party size", String(o.partySize))}
    ${row("Package", `${packageLabel(o.pkg)} &mdash; &pound;${o.pricePerHead} pp (&pound;${o.pricePerHead * o.partySize} total)`)}
    ${row("Arriving", esc(o.arrivalTime))}
    ${row("Date", prettyDate(o.date))}
    ${row("Email", esc(o.email))}
    ${row("Phone", esc(o.phone))}
  </table></td></tr>
</table></td></tr></table></body></html>`;
}

function guestEmailHtml(o: { name: string; date: string; partySize: number; arrivalTime: string; pkg: string; pricePerHead: number; calendarUrl: string }): string {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f0f0f0;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="padding:36px 40px 24px;">
  <div style="font-family:Georgia,serif;font-size:34px;color:#e8cc9c;letter-spacing:2px;">Demi&rsquo;s</div>
  <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#999;text-transform:uppercase;margin-top:4px;">Restaurant</div>
</td></tr>
<tr><td style="padding:8px 44px 36px;font-family:Helvetica,Arial,sans-serif;color:#333;font-size:15px;line-height:1.7;">
  <p style="margin:0 0 16px;">Hi ${esc(o.name)},</p>
  <p style="margin:0 0 16px;">Your table for our Saturday bottomless brunch is <strong>confirmed</strong>. We can't wait to have you.</p>
  <table width="100%" style="background:#faf7f0;border-radius:8px;margin:0 0 16px;"><tr><td style="padding:20px;text-align:center;">
    <div style="font-family:Georgia,serif;font-size:22px;color:#8b0000;">${prettyDate(o.date)}</div>
    <div style="font-size:13px;color:#666;margin-top:6px;">Party of ${o.partySize} &middot; arriving ${esc(o.arrivalTime)}</div>
    <div style="font-size:13px;color:#666;margin-top:4px;">${packageLabel(o.pkg)} &mdash; &pound;${o.pricePerHead} per person, paid at the door</div>
    <div style="font-size:13px;color:#666;margin-top:4px;">Served ${BRUNCH_START} &ndash; ${BRUNCH_END}</div>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td align="center">
    <a href="${o.calendarUrl}" style="display:inline-block;border:1px solid #e0a98c;color:#b85e2c;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:6px;">Add to Google Calendar</a>
    <div style="margin-top:10px;font-size:12px;color:#999;font-family:Helvetica,Arial,sans-serif;">On iPhone or Outlook, open the attached invite to add it.</div>
  </td></tr></table>
  <p style="margin:0;color:#666;font-size:13px;">${BRUNCH_ADDRESS}. See you Saturday!</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
