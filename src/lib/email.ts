import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.demisrestaurant.co.uk",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (Number(process.env.SMTP_PORT) || 465) === 465, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  pool: true,          // reuse connections for multiple emails
  maxConnections: 3,   // up to 3 concurrent connections
  maxMessages: 10,     // messages per connection before reconnect
});

const FROM_EMAIL =
  process.env.EMAIL_FROM || "Demi's Restaurant <bookings@demisrestaurant.co.uk>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// ─── Helpers ───

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Shared email layout (SevenRooms-inspired) ───

function emailLayout(body: string, reservationNumber?: string, jsonLd?: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Demi's Restaurant</title>
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body style="margin:0; padding:0; background-color:#f0f0f0; font-family:'Georgia','Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f0f0; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding:40px 40px 32px; background-color:#fff; border-radius:12px 12px 0 0;">
              <h1 style="margin:0; font-family:'Georgia','Times New Roman',serif; font-size:36px; font-weight:400; color:#e8cc9c; letter-spacing:2px;">Demi&rsquo;s</h1>
              <p style="margin:4px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:10px; text-transform:uppercase; letter-spacing:3px; color:#999;">Restaurant</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#fff; padding:0 40px 32px;">
              ${body}
            </td>
          </tr>

          ${reservationNumber ? `
          <!-- Confirmation code banner -->
          <tr>
            <td align="center" style="background-color:#e8e8e8; padding:16px 40px;">
              <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; color:#333;">
                Your reservation number is ${reservationNumber}
              </p>
            </td>
          </tr>
          ` : ""}

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 40px; background-color:#f0f0f0;">
              <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:11px; line-height:1.6;">
                89 Cricklewood Broadway, London NW2 3JG<br/>
                67 Streatham Hill, London SW2 4TX
              </p>
             
              <p style="margin:12px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#bbb; font-size:10px;">
                You are receiving this email from Demi&rsquo;s Restaurant.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Link button helper ───

function linkRow(text: string, url: string): string {
  return `<a href="${url}" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#8b0000; font-size:13px; text-decoration:none;">${text}</a>`;
}

/**
 * Record an email attempt to the EmailLog table. Defensive: never throws, so a
 * logging/DB failure (e.g. table not migrated yet) can't break email sending.
 */
async function recordEmailLog(entry: {
  recipient: string;
  subject: string;
  type?: string;
  status: "sent" | "failed";
  error?: string;
  bodyHtml?: string;
}) {
  try {
    await prisma.emailLog.create({
      data: {
        recipient: entry.recipient,
        subject: entry.subject,
        type: entry.type || "transactional",
        status: entry.status,
        error: entry.error || "",
        bodyHtml: entry.bodyHtml || "",
        sentAt: entry.status === "sent" ? new Date() : null,
      },
    });
  } catch {
    // swallow — logging must never affect delivery
  }
}

async function send(
  to: string,
  subject: string,
  html: string,
  opts?: { type?: string; skipLog?: boolean }
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent: "${subject}" → ${to}`);
    if (!opts?.skipLog) await recordEmailLog({ recipient: to, subject, type: opts?.type, status: "sent", bodyHtml: html });
    return true;
  } catch (error) {
    console.error(`[Email] Failed: "${subject}" → ${to}`, error);
    if (!opts?.skipLog) {
      await recordEmailLog({
        recipient: to,
        subject,
        type: opts?.type,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        bodyHtml: html,
      });
    }
    return false;
  }
}

/** Build the branded HTML for a plain-text guest message (used for direct + bulk). */
export function buildGuestEmailHtml(message: string): string {
  const paragraphs = escapeHtml(message)
    .split(/\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 16px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#555; font-size:14px; line-height:1.7;">${p}</p>`)
    .join("");
  return emailLayout(`<div style="padding:4px 0;">${paragraphs}</div>`);
}

/** Low-level sender for the queue processor — sends pre-rendered HTML, no auto-logging. */
export async function sendRawEmail(to: string, subject: string, html: string): Promise<boolean> {
  return send(to, subject, html, { skipLog: true });
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

const RESEND_FROM = process.env.RESEND_FROM || FROM_EMAIL;

/** Send one email via the Resend HTTP API. No auto-logging. */
export async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`[Resend] Failed (${res.status}): "${subject}" → ${to}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[Resend] Error: "${subject}" → ${to}`, error);
    return false;
  }
}

/**
 * Send a batch (up to 100) via Resend's batch API. Returns whether the whole
 * batch was accepted. No auto-logging.
 */
export async function sendResendBatch(
  messages: { to: string; subject: string; html: string }[]
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || messages.length === 0) return false;
  try {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(messages.map((m) => ({ from: RESEND_FROM, to: m.to, subject: m.subject, html: m.html }))),
    });
    if (!res.ok) {
      console.error(`[Resend] Batch failed (${res.status}) for ${messages.length} messages`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Resend] Batch error", error);
    return false;
  }
}

/** Pick the right sender for a logged email's provider. No auto-logging. */
export async function sendByProvider(
  to: string,
  subject: string,
  html: string,
  provider: string
): Promise<boolean> {
  return provider === "resend" ? sendViaResend(to, subject, html) : sendRawEmail(to, subject, html);
}

// ─── BOOKING CONFIRMATION ───

export async function sendBookingConfirmation(data: {
  guestName: string;
  guestEmail: string;
  confirmationCode: string;
  location: string;
  locationAddress: string;
  date: string;
  time: string;
  slot: string;
  partySize: number;
  depositRequired: boolean;
  depositAmountPence: number;
  addOns: { name: string; pricePence: number }[];
  manageUrl: string;
}) {
  // Build ISO datetime for the reservation (slot is like "7:30 PM", time is "19:30")
  const startDateTime = `${data.date}T${data.time}:00`;

  // JSON-LD structured data for Gmail auto-calendar event
  const jsonLd = {
    "@context": "http://schema.org",
    "@type": "FoodEstablishmentReservation",
    reservationNumber: data.confirmationCode,
    reservationStatus: "http://schema.org/ReservationConfirmed",
    underName: {
      "@type": "Person",
      name: data.guestName,
      email: data.guestEmail,
    },
    reservationFor: {
      "@type": "FoodEstablishment",
      name: `Demi's Restaurant — ${data.location}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: data.locationAddress,
        addressLocality: "London",
        addressCountry: "GB",
      },
      url: "https://www.demisrestaurant.co.uk",
    },
    startDate: startDateTime,
    partySize: data.partySize,
    modifyReservationUrl: `${SITE_URL}${data.manageUrl}`,
    cancelReservationUrl: `${SITE_URL}${data.manageUrl}`,
  };
  const addOnsHtml = data.addOns.length > 0
    ? `<p style="margin:4px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#666; font-size:13px;">
        Add-ons: ${data.addOns.map((a) => `${a.name} (${formatPence(a.pricePence)})`).join(", ")}
      </p>`
    : "";

  const depositHtml = data.depositRequired
    ? `<p style="margin:4px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#666; font-size:13px;">
        Hold fee: ${formatPence(data.depositAmountPence)}
      </p>`
    : "";

  const body = `
    <!-- Guest name -->
    <p style="margin:0 0 24px; text-align:center; font-family:'Georgia','Times New Roman',serif; color:#666; font-size:16px;">
      ${escapeHtml(data.guestName)}
    </p>

    <!-- Date (bold, centered) -->
    <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${formatDate(data.date)}
    </p>

    <!-- Party size · Time -->
    <p style="margin:4px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${data.partySize} guest${data.partySize === 1 ? "" : "s"} &middot; ${data.slot}
    </p>

    <!-- Location -->
    <p style="margin:8px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#666; font-size:13px;">
      Reserved at ${data.location}
    </p>

    ${addOnsHtml ? `<div style="text-align:center; margin-top:8px;">${addOnsHtml}</div>` : ""}
    ${depositHtml ? `<div style="text-align:center; margin-top:4px;">${depositHtml}</div>` : ""}

    <!-- Action links -->
    <p style="margin:28px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px;">
      ${linkRow("manage reservation", `${SITE_URL}${data.manageUrl}`)}
      <span style="color:#ccc; margin:0 12px;">|</span>
      ${linkRow("cancel reservation", `${SITE_URL}${data.manageUrl}`)}
    </p>

    <!-- Divider -->
    <hr style="border:none; border-top:1px solid #eee; margin:28px 0;" />

    <!-- Booking confirmed message -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px; padding:0;">
      <tr>
        <td style="padding:24px 28px;">
          <h3 style="margin:0 0 12px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; color:#333; text-transform:uppercase; letter-spacing:1px;">
            Booking Confirmed
          </h3>
          <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#777; font-size:13px; line-height:1.7;">
            Thank you ${escapeHtml(data.guestName)} for booking with us! We are excited to have you join us for a wonderful dining experience.
            Your reservation has been confirmed and our team is looking forward to welcoming you.
          </p>
          <p style="margin:14px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#777; font-size:13px; line-height:1.7;">
            In the meantime, please feel free to explore our website and learn more about our menu, location, and services. We can&rsquo;t wait to see you soon!
          </p>
        </td>
      </tr>
    </table>

    <!-- Divider -->
    <hr style="border:none; border-top:1px solid #eee; margin:28px 0;" />

    <!-- Cancellation policy -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:24px 28px;">
          <h3 style="margin:0 0 8px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; color:#333;">
            Cancellation Policy
          </h3>
          <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#777; font-size:13px; line-height:1.7;">
            We kindly ask for at least 24 hours notice for all cancellations. Late cancellations or no-shows may forfeit an hold fee if applicable. For any assistance, please don&rsquo;t hesitate to contact our team.
          </p>
        </td>
      </tr>
    </table>

    <!-- Contact -->
    <div style="margin-top:28px; text-align:center;">
      <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:700; color:#333;">Location</p>
      <p style="margin:6px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#777; font-size:12px; line-height:1.6;">
        ${data.location}<br/>
        <a href="https://www.demisrestaurant.co.uk" style="color:#8b0000; text-decoration:none; font-size:12px;">Demi's Nigerian Restaurant</a>
      </p>
    </div>
  `;

  await send(
    data.guestEmail,
    `Booking Confirmed — ${data.confirmationCode} | Demi's Restaurant`,
    emailLayout(body, data.confirmationCode, jsonLd)
  );
}

// ─── BOOKING MODIFICATION ───

export async function sendBookingModification(data: {
  guestName: string;
  guestEmail: string;
  confirmationCode: string;
  location: string;
  date: string;
  time: string;
  slot: string;
  partySize: number;
  changes: { field: string; oldVal: string; newVal: string }[];
  manageUrl: string;
}) {
  const changesHtml = data.changes
    .map(
      (c) =>
        `<p style="margin:4px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#666; font-size:13px;">
          <strong>${c.field}</strong>: ${c.oldVal} &rarr; <span style="color:#333; font-weight:600;">${c.newVal}</span>
        </p>`
    )
    .join("");

  const body = `
    <!-- Guest name -->
    <p style="margin:0 0 24px; text-align:center; font-family:'Georgia','Times New Roman',serif; color:#666; font-size:16px;">
      ${escapeHtml(data.guestName)}
    </p>

    <!-- Date -->
    <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${formatDate(data.date)}
    </p>

    <!-- Party size · Time -->
    <p style="margin:4px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${data.partySize} guest${data.partySize === 1 ? "" : "s"} &middot; ${data.slot}
    </p>

    <!-- Location -->
    <p style="margin:8px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#666; font-size:13px;">
      Reserved at ${escapeHtml(data.location)}
    </p>

    <!-- Action links -->
    <p style="margin:28px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px;">
      ${linkRow("manage reservation", `${SITE_URL}${data.manageUrl}`)}
      <span style="color:#ccc; margin:0 12px;">|</span>
      ${linkRow("cancel reservation", `${SITE_URL}${data.manageUrl}`)}
    </p>

    <hr style="border:none; border-top:1px solid #eee; margin:28px 0;" />

    <!-- Changes section -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:24px 28px;">
          <h3 style="margin:0 0 12px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; color:#333; text-transform:uppercase; letter-spacing:1px;">
            Booking Updated
          </h3>
          <p style="margin:0 0 16px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#777; font-size:13px; line-height:1.7;">
            Hi ${escapeHtml(data.guestName)}, your reservation has been updated. Here are the changes:
          </p>
          <div style="text-align:center;">${changesHtml}</div>
        </td>
      </tr>
    </table>
  `;

  await send(
    data.guestEmail,
    `Booking Updated — ${data.confirmationCode} | Demi's Restaurant`,
    emailLayout(body, data.confirmationCode)
  );
}

// ─── BOOKING CANCELLATION ───

export async function sendBookingCancellation(data: {
  guestName: string;
  guestEmail: string;
  confirmationCode: string;
  location: string;
  date: string;
  slot: string;
  depositRefunded: boolean;
  depositAmountPence: number;
}) {
  const depositMsg = data.depositAmountPence > 0
    ? data.depositRefunded
      ? `<p style="margin:14px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#2e7d32; font-size:13px;">
          Your hold fee of ${formatPence(data.depositAmountPence)} will be refunded to your original payment method.
        </p>`
      : `<p style="margin:14px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#c62828; font-size:13px;">
          Your hold fee of ${formatPence(data.depositAmountPence)} has been retained as the cancellation was within the cancellation window.
        </p>`
    : "";

  const body = `
    <!-- Guest name -->
    <p style="margin:0 0 24px; text-align:center; font-family:'Georgia','Times New Roman',serif; color:#666; font-size:16px;">
      ${escapeHtml(data.guestName)}
    </p>

    <!-- Date -->
    <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:16px; font-weight:700; text-decoration:line-through;">
      ${formatDate(data.date)}
    </p>

    <!-- Location -->
    <p style="margin:8px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:13px;">
      ${data.location} &middot; ${data.slot}
    </p>

    <hr style="border:none; border-top:1px solid #eee; margin:28px 0;" />

    <!-- Cancellation message -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:24px 28px;">
          <h3 style="margin:0 0 12px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; color:#c62828; text-transform:uppercase; letter-spacing:1px;">
            Booking Cancelled
          </h3>
          <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#777; font-size:13px; line-height:1.7;">
            Hi ${escapeHtml(data.guestName)}, your reservation has been cancelled. We&rsquo;re sorry to see you go and hope to welcome you another time.
          </p>
          ${depositMsg}
        </td>
      </tr>
    </table>

    <!-- Book again -->
    <p style="margin:28px 0 0; text-align:center;">
      <a href="${SITE_URL}/booking" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; display:inline-block; background-color:#e8cc9c; color:#1a1a1a; text-decoration:none; font-weight:600; font-size:13px; padding:12px 32px; border-radius:6px;">
        Book Again
      </a>
    </p>
  `;

  await send(
    data.guestEmail,
    `Booking Cancelled — ${data.confirmationCode} | Demi's Restaurant`,
    emailLayout(body, data.confirmationCode)
  );
}

// ─── ADMIN NOTIFICATION (new booking) ───

export async function sendAdminNewBooking(data: {
  confirmationCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  location: string;
  date: string;
  slot: string;
  partySize: number;
  notes?: string;
  depositRequired: boolean;
  depositAmountPence: number;
  addOns: { name: string; pricePence: number; quantity: number }[];
  source: string;
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "admin@demisrestaurant.co.uk";

  const body = `
    <!-- Admin heading -->
    <h2 style="margin:0 0 20px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:18px; font-weight:700; color:#333;">
      New Booking Received
    </h2>

    <p style="margin:0 0 6px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#666; font-size:13px;">
      Via ${data.source}
    </p>

    <!-- Guest info -->
    <p style="margin:20px 0 0; text-align:center; font-family:'Georgia','Times New Roman',serif; color:#333; font-size:16px;">
      ${escapeHtml(data.guestName)}
    </p>
    <p style="margin:2px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:12px;">
      ${escapeHtml(data.guestEmail)}
    </p>
    ${data.guestPhone ? `<p style="margin:2px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:12px;">${escapeHtml(data.guestPhone)}</p>` : ""}

    <!-- Date -->
    <p style="margin:20px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${formatDate(data.date)}
    </p>

    <!-- Party · Time -->
    <p style="margin:4px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${data.partySize} guest${data.partySize === 1 ? "" : "s"} &middot; ${data.slot}
    </p>

    <!-- Location -->
    <p style="margin:8px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#666; font-size:13px;">
      ${escapeHtml(data.location)}
    </p>

    ${data.notes && data.notes.trim() ? `
    <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:18px 24px;">
          <h3 style="margin:0 0 8px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:700; color:#333; text-transform:uppercase; letter-spacing:1px;">
            Guest Notes / Special Requests
          </h3>
          <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; color:#555; line-height:1.6;">
            ${escapeHtml(data.notes.trim())}
          </p>
        </td>
      </tr>
    </table>
    ` : ""}

    ${(data.addOns.length > 0 || data.depositRequired) ? `
    <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <h3 style="margin:0 0 12px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; color:#333; text-transform:uppercase; letter-spacing:1px;">
            Payment Summary
          </h3>
          ${data.addOns.map((a) => `
          <p style="margin:4px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#555;">
            ${escapeHtml(a.name)} ${a.quantity > 1 ? `&times; ${a.quantity}` : ""} &mdash; <strong>${formatPence(a.pricePence * a.quantity)}</strong>
          </p>
          `).join("")}
          ${data.depositRequired ? `
          <p style="margin:4px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#555;">
            Hold fee &mdash; <strong>${formatPence(data.depositAmountPence)}</strong>
          </p>
          ` : ""}
          <hr style="border:none; border-top:1px solid #ddd; margin:10px 0;" />
          <p style="margin:4px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; color:#333;">
            Total: ${formatPence(data.addOns.reduce((sum, a) => sum + a.pricePence * a.quantity, 0) + data.depositAmountPence)}
          </p>
        </td>
      </tr>
    </table>
    ` : ""}

    <!-- Admin link -->
    <p style="margin:28px 0 0; text-align:center;">
      <a href="${SITE_URL}/admin/bookings" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; display:inline-block; background-color:#e8cc9c; color:#1a1a1a; text-decoration:none; font-weight:600; font-size:13px; padding:12px 32px; border-radius:6px;">
        View in Admin
      </a>
    </p>
  `;

  await send(
    adminEmail,
    `New Booking: ${data.confirmationCode} — ${escapeHtml(data.guestName)} (${data.partySize} guests)`,
    emailLayout(body, data.confirmationCode)
  );
}

// ─── ADMIN: NEW SET MENU GROUP ───

export async function sendAdminNewSetMenuGroup(data: {
  groupCode: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  date: string;
  partySize: number;
  locationSlug: string;
  guestSelectionUrl: string;
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "admin@demisrestaurant.co.uk";
  const locationName = data.locationSlug === "streatham" ? "Streatham Hill" : "Cricklewood";

  const body = `
    <h2 style="margin:0 0 20px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:18px; font-weight:700; color:#333;">
      New Set Menu Group Created
    </h2>

    <p style="margin:0 0 6px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:13px; font-weight:700; letter-spacing:2px;">
      ${escapeHtml(data.groupCode)}
    </p>

    <p style="margin:20px 0 0; text-align:center; font-family:'Georgia','Times New Roman',serif; color:#333; font-size:16px;">
      ${escapeHtml(data.organizerName)}
    </p>
    ${data.organizerEmail ? `<p style="margin:2px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:12px;">${escapeHtml(data.organizerEmail)}</p>` : ""}
    ${data.organizerPhone ? `<p style="margin:2px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:12px;">${escapeHtml(data.organizerPhone)}</p>` : ""}

    <p style="margin:20px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${formatDate(data.date)}
    </p>
    <p style="margin:4px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:15px; font-weight:700;">
      ${data.partySize} guest${data.partySize === 1 ? "" : "s"} &middot; ${locationName}
    </p>

    <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <h3 style="margin:0 0 10px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:700; color:#333; text-transform:uppercase; letter-spacing:1px;">
            Guest Selection Link
          </h3>
          <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#666; font-size:12px; word-break:break-all;">
            ${escapeHtml(data.guestSelectionUrl)}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0; text-align:center;">
      <a href="${SITE_URL}/admin/set-menu" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; display:inline-block; background-color:#e8cc9c; color:#1a1a1a; text-decoration:none; font-weight:600; font-size:13px; padding:12px 32px; border-radius:6px;">
        View in Admin
      </a>
    </p>
  `;

  await send(
    adminEmail,
    `New Set Menu Group: ${data.groupCode} — ${escapeHtml(data.organizerName)} (${data.partySize} guests)`,
    emailLayout(body)
  );
}

// ─── ORGANISER: SET MENU CONFIRMATION ───

export async function sendOrganizerSetMenuConfirmation(data: {
  organizerName: string;
  organizerEmail: string;
  groupCode: string;
  date: string;
  partySize: number;
  locationSlug: string;
  guestSelectionUrl: string;
}) {
  const locationName = data.locationSlug === "streatham" ? "Streatham Hill" : "Cricklewood";

  const body = `
    <p style="margin:0 0 24px; text-align:center; font-family:'Georgia','Times New Roman',serif; color:#666; font-size:16px;">
      ${escapeHtml(data.organizerName)}
    </p>

    <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${formatDate(data.date)}
    </p>
    <p style="margin:4px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:15px; font-weight:700;">
      ${data.partySize} guest${data.partySize === 1 ? "" : "s"} &middot; ${locationName}
    </p>

    <hr style="border:none; border-top:1px solid #eee; margin:28px 0;" />

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:24px 28px;">
          <h3 style="margin:0 0 12px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; color:#333; text-transform:uppercase; letter-spacing:1px;">
            Share This Link With Your Guests
          </h3>
          <p style="margin:0 0 16px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#777; font-size:13px; line-height:1.7;">
            Each person in your group should visit this link to select their appetiser, starter, main, protein, and dessert — plus any dietary allergies.
          </p>
          <div style="background:#fff; border:1px solid #eee; border-radius:8px; padding:14px 20px; text-align:center;">
            <a href="${data.guestSelectionUrl}" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#8b0000; font-size:13px; word-break:break-all;">${escapeHtml(data.guestSelectionUrl)}</a>
          </div>
          <p style="margin:14px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:12px;">
            Group code: <strong style="color:#333;">${data.groupCode}</strong>
          </p>
        </td>
      </tr>
    </table>

    <hr style="border:none; border-top:1px solid #eee; margin:28px 0;" />

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <h3 style="margin:0 0 10px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; color:#333;">
            Your Four Course Menu
          </h3>
          ${[
            ["Appetiser", "Puff Puff, Samosa or Spring Rolls (guest's choice)"],
            ["Starter", "Salad, Pepper Soup, Gizzdodo, Beef Suya, Lamb Suya, Moi Moi or Nil (guest's choice)"],
            ["Main", "Jollof Rice, Fried Rice, Eforiro, Egusi, Amala or White Rice & Ayamase (guest's choice)"],
            ["Protein", "Chicken, Beef, Goat Meat, Fish or Nil (guest's choice)"],
            ["Dessert", "Ice Cream Xplosion, Toffee Pudding or Nil (guest's choice)"],
          ].map(([label, value]) => `
          <p style="margin:6px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#555;">
            <strong style="color:#333;">${label}:</strong> ${value}
          </p>`).join("")}
        </td>
      </tr>
    </table>
  `;

  await send(
    data.organizerEmail,
    `Your Set Menu Group ${data.groupCode} — Demi's Restaurant`,
    emailLayout(body, data.groupCode)
  );
}

// ─── ADMIN: NEW BUFFET BOOKING ───

export async function sendAdminNewBuffetBooking(data: {
  bookingCode: string;
  name: string;
  email: string;
  phone: string;
  partySize: number;
  date: string;
  time: string;
  locationSlug: string;
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "admin@demisrestaurant.co.uk";
  const locationName = data.locationSlug === "streatham" ? "Streatham Hill" : "Cricklewood";

  const body = `
    <h2 style="margin:0 0 20px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:18px; font-weight:700; color:#333;">
      New Buffet Booking
    </h2>

    <p style="margin:0 0 6px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:13px; font-weight:700; letter-spacing:2px;">
      ${escapeHtml(data.bookingCode)}
    </p>

    <p style="margin:20px 0 0; text-align:center; font-family:'Georgia','Times New Roman',serif; color:#333; font-size:16px;">
      ${escapeHtml(data.name)}
    </p>
    ${data.email ? `<p style="margin:2px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:12px;">${escapeHtml(data.email)}</p>` : ""}
    ${data.phone ? `<p style="margin:2px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:12px;">${escapeHtml(data.phone)}</p>` : ""}

    <p style="margin:20px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${formatDate(data.date)} &middot; ${escapeHtml(data.time)}
    </p>
    <p style="margin:4px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:15px; font-weight:700;">
      ${data.partySize} guest${data.partySize === 1 ? "" : "s"} &middot; ${locationName}
    </p>

    <p style="margin:28px 0 0; text-align:center;">
      <a href="${SITE_URL}/admin/buffet" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; display:inline-block; background-color:#e8cc9c; color:#1a1a1a; text-decoration:none; font-weight:600; font-size:13px; padding:12px 32px; border-radius:6px;">
        View in Admin
      </a>
    </p>
  `;

  await send(
    adminEmail,
    `New Buffet Booking: ${data.bookingCode} — ${escapeHtml(data.name)} (${data.partySize} guests)`,
    emailLayout(body)
  );
}

// ─── GUEST: BUFFET BOOKING CONFIRMATION ───

export async function sendBuffetGuestConfirmation(data: {
  name: string;
  email: string;
  bookingCode: string;
  partySize: number;
  date: string;
  time: string;
  locationSlug: string;
}) {
  const locationName = data.locationSlug === "streatham" ? "Streatham Hill" : "Cricklewood";

  const body = `
    <h2 style="margin:0 0 20px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:18px; font-weight:700; color:#333;">
      Your Buffet Booking is Confirmed
    </h2>

    <p style="margin:0 0 24px; text-align:center; font-family:'Georgia','Times New Roman',serif; color:#666; font-size:16px;">
      ${escapeHtml(data.name)}
    </p>

    <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${formatDate(data.date)} &middot; ${escapeHtml(data.time)}
    </p>
    <p style="margin:4px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:15px; font-weight:700;">
      ${data.partySize} guest${data.partySize === 1 ? "" : "s"} &middot; ${locationName}
    </p>

    <hr style="border:none; border-top:1px solid #eee; margin:28px 0;" />

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:20px 24px; text-align:center;">
          <p style="margin:0 0 6px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:12px; text-transform:uppercase; letter-spacing:1px;">
            Booking Reference
          </p>
          <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:18px; font-weight:700; letter-spacing:2px;">
            ${escapeHtml(data.bookingCode)}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#777; font-size:13px; line-height:1.7;">
      We look forward to welcoming you. If you need to make any changes, please reply to this email or call the restaurant.
    </p>
  `;

  await send(
    data.email,
    `Your Buffet Booking ${data.bookingCode} — Demi's Restaurant`,
    emailLayout(body, data.bookingCode)
  );
}

// ─── ADMIN: NEW GUEST SELECTION ───

export async function sendAdminGuestSelection(data: {
  groupCode: string;
  guestName: string;
  appetiser: string;
  starter: string;
  main: string;
  protein: string;
  dessert: string;
  allergies: string;
  date: string;
  organizerName: string;
  selectionNumber: number;
  totalExpected: number;
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "admin@demisrestaurant.co.uk";

  const menuRows = [
    ["Appetiser", data.appetiser],
    ["Starter", data.starter],
    ["Main", data.main],
    ["Protein", data.protein],
    ["Dessert", data.dessert],
    ...(data.allergies ? [["Allergies", data.allergies]] : []),
  ].map(([label, value]) => `
    <p style="margin:4px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#555;">
      <strong style="color:#333;">${label}:</strong> ${escapeHtml(value)}
    </p>`).join("");

  const body = `
    <h2 style="margin:0 0 20px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:18px; font-weight:700; color:#333;">
      New Guest Selection
    </h2>

    <p style="margin:0 0 4px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:12px;">
      Group ${escapeHtml(data.groupCode)} &middot; ${escapeHtml(data.organizerName)}
    </p>
    <p style="margin:0 0 20px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#666; font-size:13px;">
      ${formatDate(data.date)}
    </p>

    <p style="margin:0; text-align:center; font-family:'Georgia','Times New Roman',serif; color:#333; font-size:18px;">
      ${escapeHtml(data.guestName)}
    </p>

    <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;">
          ${menuRows}
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#999; font-size:12px;">
      Selection ${data.selectionNumber} of ${data.totalExpected}
    </p>

    <p style="margin:28px 0 0; text-align:center;">
      <a href="${SITE_URL}/admin/set-menu" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; display:inline-block; background-color:#e8cc9c; color:#1a1a1a; text-decoration:none; font-weight:600; font-size:13px; padding:12px 32px; border-radius:6px;">
        View All Selections
      </a>
    </p>
  `;

  await send(
    adminEmail,
    `Set Menu ${data.groupCode}: ${escapeHtml(data.guestName)} (${data.selectionNumber}/${data.totalExpected})`,
    emailLayout(body)
  );
}

// ─── DEPOSIT PAYMENT LINK ───

export async function sendDepositPaymentLink(data: {
  guestName: string;
  guestEmail: string;
  confirmationCode: string;
  location: string;
  date: string;
  slot: string;
  partySize: number;
  depositAmountPence: number;
  paymentUrl: string;
}) {
  const body = `
    <!-- Guest name -->
    <p style="margin:0 0 24px; text-align:center; font-family:'Georgia','Times New Roman',serif; color:#666; font-size:16px;">
      ${escapeHtml(data.guestName)}
    </p>

    <!-- Date -->
    <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${formatDate(data.date)}
    </p>

    <!-- Party · Time -->
    <p style="margin:4px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#333; font-size:16px; font-weight:700;">
      ${data.partySize} guest${data.partySize === 1 ? "" : "s"} &middot; ${data.slot}
    </p>

    <!-- Location -->
    <p style="margin:8px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#666; font-size:13px;">
      Reserved at ${escapeHtml(data.location)}
    </p>

    <hr style="border:none; border-top:1px solid #eee; margin:28px 0;" />

    <!-- Deposit message -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px;">
      <tr>
        <td style="padding:24px 28px;">
          <h3 style="margin:0 0 12px; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; color:#333; text-transform:uppercase; letter-spacing:1px;">
            Deposit Required
          </h3>
          <p style="margin:0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#777; font-size:13px; line-height:1.7;">
            A hold fee of <strong style="color:#333;">${formatPence(data.depositAmountPence)}</strong> is required to confirm your reservation.
            This is a hold fee only &mdash; it will be released after your visit.
          </p>
          <p style="margin:14px 0 0; text-align:center; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#c62828; font-size:12px;">
            Your booking will be automatically cancelled if not paid within 30 minutes.
          </p>
        </td>
      </tr>
    </table>

    <!-- Pay button -->
    <p style="margin:28px 0 0; text-align:center;">
      <a href="${data.paymentUrl}" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; display:inline-block; background-color:#e8cc9c; color:#1a1a1a; text-decoration:none; font-weight:600; font-size:13px; padding:12px 32px; border-radius:6px;">
        Pay Deposit
      </a>
    </p>
  `;

  await send(
    data.guestEmail,
    `Deposit Required — ${data.confirmationCode} | Demi's Restaurant`,
    emailLayout(body, data.confirmationCode)
  );
}

// ─── ADMIN: DIRECT GUEST EMAIL ───

export async function sendDirectGuestEmail(data: {
  to: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  return send(data.to, data.subject, buildGuestEmailHtml(data.message), { type: "direct" });
}
