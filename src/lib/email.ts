import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.demisrestaurant.co.uk",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (Number(process.env.SMTP_PORT) || 465) === 465, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const FROM_EMAIL =
  process.env.EMAIL_FROM || "Demi's Restaurant <bookings@demisrestaurant.co.uk>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// ─── Helpers ───

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
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

// ─── Shared email layout ───

function emailLayout(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#1a1a1a; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#222; border-radius:16px; overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px; border-bottom:1px solid #333;">
              <h1 style="margin:0; color:#e8cc9c; font-size:24px; font-weight:700;">Demi's Restaurant</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px; border-top:1px solid #333;">
              <p style="margin:0; color:#666; font-size:12px;">
                Demi's Restaurant · 141 Cricklewood Broadway, London NW2 3ED · 67 Streatham Hill, London SW2 4TX
              </p>
              <p style="margin:8px 0 0; color:#555; font-size:11px;">
                This is an automated message. Please do not reply directly to this email.
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

// ─── Detail row helper ───

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 0; color:#999; font-size:14px; width:140px; vertical-align:top;">${label}</td>
      <td style="padding:8px 0; color:#fff; font-size:14px;">${value}</td>
    </tr>`;
}

// ─── Gold button helper ───

function goldButton(text: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background-color:#e8cc9c; border-radius:8px; padding:12px 28px;">
          <a href="${url}" style="color:#1a1a1a; text-decoration:none; font-weight:600; font-size:14px;">${text}</a>
        </td>
      </tr>
    </table>`;
}

// ─── Send wrapper (gracefully skips if no API key) ───

async function send(to: string, subject: string, html: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent: "${subject}" → ${to}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed: "${subject}" → ${to}`, error);
    return false;
  }
}

// ─── BOOKING CONFIRMATION ───

export async function sendBookingConfirmation(data: {
  guestName: string;
  guestEmail: string;
  confirmationCode: string;
  location: string;
  date: string;
  time: string;
  slot: string;
  partySize: number;
  depositRequired: boolean;
  depositAmountPence: number;
  addOns: { name: string; pricePence: number }[];
  manageUrl: string;
}) {
  const body = `
    <h2 style="margin:0 0 8px; color:#e8cc9c; font-size:20px;">Booking Confirmed!</h2>
    <p style="margin:0 0 24px; color:#ccc; font-size:14px;">
      Thank you, ${data.guestName}. Your table is booked.
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:24px;">
      ${detailRow("Confirmation", `<strong style="color:#e8cc9c;">${data.confirmationCode}</strong>`)}
      ${detailRow("Location", data.location)}
      ${detailRow("Date", formatDate(data.date))}
      ${detailRow("Time", data.slot)}
      ${detailRow("Party Size", `${data.partySize} guests`)}
      ${data.addOns.length > 0 ? detailRow("Add-ons", data.addOns.map((a) => `${a.name} (${formatPence(a.pricePence)})`).join(", ")) : ""}
      ${data.depositRequired ? detailRow("Deposit", `${formatPence(data.depositAmountPence)} (hold fee)`) : ""}
    </table>

    ${goldButton("Manage Your Booking", `${SITE_URL}${data.manageUrl}`)}

    <p style="margin:0; color:#666; font-size:12px;">
      Need to change or cancel? Use the button above, or visit your booking page with code <strong>${data.confirmationCode}</strong>.
    </p>`;

  await send(
    data.guestEmail,
    `Booking Confirmed — ${data.confirmationCode} | Demi's Restaurant`,
    emailLayout("Booking Confirmed", body)
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
        `<li style="color:#ccc; font-size:14px; margin-bottom:4px;">
          <strong>${c.field}</strong>: ${c.oldVal} → <span style="color:#e8cc9c;">${c.newVal}</span>
        </li>`
    )
    .join("");

  const body = `
    <h2 style="margin:0 0 8px; color:#e8cc9c; font-size:20px;">Booking Updated</h2>
    <p style="margin:0 0 24px; color:#ccc; font-size:14px;">
      Hi ${data.guestName}, your booking has been modified.
    </p>

    <div style="background:#1a1a1a; border-radius:8px; padding:16px; margin-bottom:24px;">
      <p style="margin:0 0 8px; color:#999; font-size:12px; text-transform:uppercase;">Changes</p>
      <ul style="margin:0; padding-left:20px;">${changesHtml}</ul>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:24px;">
      ${detailRow("Confirmation", `<strong style="color:#e8cc9c;">${data.confirmationCode}</strong>`)}
      ${detailRow("Location", data.location)}
      ${detailRow("Date", formatDate(data.date))}
      ${detailRow("Time", data.slot)}
      ${detailRow("Party Size", `${data.partySize} guests`)}
    </table>

    ${goldButton("View Your Booking", `${SITE_URL}${data.manageUrl}`)}`;

  await send(
    data.guestEmail,
    `Booking Updated — ${data.confirmationCode} | Demi's Restaurant`,
    emailLayout("Booking Updated", body)
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
      ? `<p style="color:#4ade80; font-size:14px; margin:16px 0;">
          Your deposit of ${formatPence(data.depositAmountPence)} will be refunded to your original payment method.
        </p>`
      : `<p style="color:#f87171; font-size:14px; margin:16px 0;">
          Your deposit of ${formatPence(data.depositAmountPence)} has been retained as the cancellation was within the cancellation window.
        </p>`
    : "";

  const body = `
    <h2 style="margin:0 0 8px; color:#f87171; font-size:20px;">Booking Cancelled</h2>
    <p style="margin:0 0 24px; color:#ccc; font-size:14px;">
      Hi ${data.guestName}, your booking has been cancelled.
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:16px;">
      ${detailRow("Confirmation", data.confirmationCode)}
      ${detailRow("Location", data.location)}
      ${detailRow("Date", formatDate(data.date))}
      ${detailRow("Time", data.slot)}
    </table>

    ${depositMsg}

    <p style="margin:24px 0 0; color:#999; font-size:14px;">
      We're sorry to see you go. You can always book again at:
    </p>
    ${goldButton("Book Again", `${SITE_URL}/booking`)}`;

  await send(
    data.guestEmail,
    `Booking Cancelled — ${data.confirmationCode} | Demi's Restaurant`,
    emailLayout("Booking Cancelled", body)
  );
}

// ─── ADMIN NOTIFICATION (new booking) ───

export async function sendAdminNewBooking(data: {
  confirmationCode: string;
  guestName: string;
  guestEmail: string;
  location: string;
  date: string;
  slot: string;
  partySize: number;
  depositRequired: boolean;
  source: string;
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "admin@demisrestaurant.co.uk";

  const body = `
    <h2 style="margin:0 0 8px; color:#e8cc9c; font-size:20px;">New Booking</h2>
    <p style="margin:0 0 24px; color:#ccc; font-size:14px;">
      A new booking has been made via ${data.source}.
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%;">
      ${detailRow("Code", `<strong style="color:#e8cc9c;">${data.confirmationCode}</strong>`)}
      ${detailRow("Guest", `${data.guestName} (${data.guestEmail})`)}
      ${detailRow("Location", data.location)}
      ${detailRow("Date", formatDate(data.date))}
      ${detailRow("Time", data.slot)}
      ${detailRow("Party Size", `${data.partySize} guests`)}
      ${data.depositRequired ? detailRow("Deposit", "Required (£20 hold)") : ""}
    </table>

    ${goldButton("View in Admin", `${SITE_URL}/admin/bookings`)}`;

  await send(
    adminEmail,
    `New Booking: ${data.confirmationCode} — ${data.guestName} (${data.partySize} guests)`,
    emailLayout("New Booking", body)
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
    <h2 style="margin:0 0 8px; color:#e8cc9c; font-size:20px;">Deposit Required</h2>
    <p style="margin:0 0 24px; color:#ccc; font-size:14px;">
      Hi ${data.guestName}, a deposit of <strong style="color:#e8cc9c;">${formatPence(data.depositAmountPence)}</strong> is required to confirm your booking for ${data.partySize} guests.
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:24px;">
      ${detailRow("Confirmation", data.confirmationCode)}
      ${detailRow("Location", data.location)}
      ${detailRow("Date", formatDate(data.date))}
      ${detailRow("Time", data.slot)}
      ${detailRow("Deposit", formatPence(data.depositAmountPence))}
    </table>

    <p style="margin:0 0 8px; color:#999; font-size:13px;">
      This is a hold fee only — it will be released after your visit unless you no-show.
    </p>

    ${goldButton("Pay Deposit", data.paymentUrl)}

    <p style="margin:16px 0 0; color:#666; font-size:12px;">
      Your booking will be automatically cancelled if the deposit is not paid within 30 minutes.
    </p>`;

  await send(
    data.guestEmail,
    `Deposit Required — ${data.confirmationCode} | Demi's Restaurant`,
    emailLayout("Deposit Required", body)
  );
}
