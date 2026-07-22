import crypto from "crypto";

/**
 * Marketing / email-blast helpers.
 *
 * Sends from the hello.demisrestaurant.co.uk domain so marketing mail is separate
 * from transactional booking mail. A Resend API key is account-level, so the SAME
 * key sends from any verified domain — the "from" address picks the domain.
 *
 * Requires:
 *   MARKETING_EMAIL_FROM       — e.g. "Demi's Restaurant <hello@hello.demisrestaurant.co.uk>"
 *                                (the hello. domain must be verified in your Resend account)
 *   a Resend key               — reuses RESEND_API_KEY; set RESEND_MARKETING_API_KEY only
 *                                if you want a separate/domain-scoped key
 * Optional:
 *   MARKETING_LOGO_URL         — hosted logo image for the email header
 *   UNSUBSCRIBE_SECRET         — falls back to ADMIN_JWT_SECRET
 *   NEXT_PUBLIC_SITE_URL       — used to build unsubscribe links
 */

function resendKey(): string | undefined {
  return process.env.RESEND_MARKETING_API_KEY || process.env.RESEND_API_KEY;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.demisrestaurant.co.uk").replace(/\/$/, "");
const MARKETING_FROM =
  process.env.MARKETING_EMAIL_FROM || "Demi's Restaurant <hello@hello.demisrestaurant.co.uk>";
const UNSUB_SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.ADMIN_JWT_SECRET || "demis-marketing-fallback";

export function isMarketingConfigured(): boolean {
  return !!resendKey();
}

// ── Unsubscribe tokens (HMAC of the email, no DB lookup needed to verify) ──
export function unsubToken(email: string): string {
  return crypto.createHmac("sha256", UNSUB_SECRET).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyUnsub(email: string, token: string): boolean {
  const expected = unsubToken(email);
  // constant-time compare
  const a = Buffer.from(expected);
  const b = Buffer.from(token || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function unsubscribeUrl(email: string): string {
  const e = encodeURIComponent(email.trim().toLowerCase());
  return `${SITE_URL}/api/mail/unsubscribe?e=${e}&t=${unsubToken(email)}`;
}

// ── Personalisation ──
/** First name for a friendly greeting; "there" when we have no name. */
export function firstName(name: string): string {
  const n = (name || "").trim().split(/\s+/)[0];
  return n || "there";
}

/** Replace {name} / {{name}} (any casing/spacing) with the recipient's first name. */
export function personalize(text: string, name: string): string {
  return text.replace(/\{\{?\s*name\s*\}?\}/gi, firstName(name));
}

// ── Body formatting: treat the admin's input as plain text, safely ──
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Turns the admin's plain-text message into safe HTML: paragraphs, line breaks, auto-linked URLs. */
export function formatBody(text: string): string {
  const paras = text.trim().split(/\n{2,}/);
  return paras
    .map((p) => {
      const withBreaks = escapeHtml(p).replace(/\n/g, "<br>");
      const linked = withBreaks.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color:#b8862f;text-decoration:underline;">$1</a>'
      );
      return `<p style="margin:0 0 16px;">${linked}</p>`;
    })
    .join("");
}

// ── Branded email template (matches the booking-confirmation look that lands in the inbox) ──
const SERIF = "'Georgia','Times New Roman',serif";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

export function buildMarketingEmail(opts: {
  subject: string;
  bodyHtml: string;
  unsubUrl: string;
  preheader?: string;
}): string {
  const logoUrl = process.env.MARKETING_LOGO_URL;
  const header = logoUrl
    ? `<img src="${logoUrl}" alt="Demi's Restaurant" width="150" style="display:block;margin:0 auto;border:0;">`
    : `<h1 style="margin:0;font-family:${SERIF};font-size:36px;font-weight:400;color:#e8cc9c;letter-spacing:2px;">Demi&rsquo;s</h1>
       <p style="margin:4px 0 0;font-family:${SANS};font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#999;">Restaurant</p>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(opts.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:${SERIF};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader || "")}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f0f0;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

      <!-- Logo header -->
      <tr><td align="center" style="padding:40px 40px 28px;background-color:#fff;border-radius:12px 12px 0 0;">
        ${header}
      </td></tr>

      <!-- Body -->
      <tr><td style="background-color:#fff;padding:8px 40px 4px;font-family:${SANS};font-size:15px;line-height:1.75;color:#333;">
        ${opts.bodyHtml}
      </td></tr>

      <!-- Book now button -->
      <tr><td align="center" style="background-color:#fff;padding:20px 40px 40px;border-radius:0 0 12px 12px;">
        <a href="${SITE_URL}/sunday-buffet" style="display:inline-block;background:#e3c07a;color:#141210;font-family:${SANS};font-size:14px;font-weight:700;text-decoration:none;padding:13px 36px;border-radius:6px;">Book now</a>
      </td></tr>

      <!-- Footer -->
      <tr><td align="center" style="padding:28px 40px 36px;background-color:#f0f0f0;">
        <p style="margin:0;font-family:${SANS};color:#666;font-size:12px;font-weight:700;letter-spacing:0.5px;">Demi&rsquo;s Nigerian Restaurant</p>
        <p style="margin:8px 0 0;font-family:${SANS};color:#999;font-size:11px;line-height:1.7;">
          89 Cricklewood Broadway, London NW2 3JG<br/>
          67 Streatham Hill, London SW2 4TX
        </p>
        <p style="margin:10px 0 0;font-family:${SANS};color:#999;font-size:11px;line-height:1.7;">
          <a href="tel:+442039046977" style="color:#999;text-decoration:none;">020 3904 6977</a>
          &middot;
          <a href="mailto:bookings@demisrestaurant.co.uk" style="color:#999;text-decoration:none;">bookings@demisrestaurant.co.uk</a>
        </p>
        <p style="margin:16px 0 0;font-family:${SANS};color:#bbb;font-size:10px;line-height:1.7;">
          You&rsquo;re receiving this because you joined Demi&rsquo;s mailing list.
          <a href="${opts.unsubUrl}" style="color:#bbb;text-decoration:underline;">Unsubscribe</a>.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Plain / personal template — minimal HTML, no images, no button, no logo band.
 * Reads like a normal one-to-one email, which Gmail is far more likely to place
 * in the Primary tab than a designed marketing template.
 */
export function buildPlainEmail(opts: { bodyHtml: string; unsubUrl: string }): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#ffffff;">
<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222222;max-width:560px;margin:0 auto;padding:20px;">
  ${opts.bodyHtml}
  <p style="color:#9a9a9a;font-size:12px;line-height:1.6;margin-top:28px;">
    Demi's Nigerian Restaurant &mdash; Cricklewood &amp; Streatham Hill, London.<br>
    <a href="tel:+442039046977" style="color:#9a9a9a;">020 3904 6977</a> &middot;
    <a href="${SITE_URL}" style="color:#9a9a9a;">demisrestaurant.co.uk</a> &middot;
    <a href="${opts.unsubUrl}" style="color:#9a9a9a;">Unsubscribe</a>.
  </p>
</div>
</body></html>`;
}

// ── Send via Resend batch (up to 100 per call), personalised unsubscribe headers ──
type Msg = { to: string; subject: string; html: string; unsubUrl: string };

export async function sendMarketingBatch(
  messages: Msg[]
): Promise<{ sent: number; failed: number }> {
  const key = resendKey();
  if (!key) return { sent: 0, failed: messages.length };

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((m) => ({
            from: MARKETING_FROM,
            to: m.to,
            subject: m.subject,
            html: m.html,
            headers: {
              "List-Unsubscribe": `<${m.unsubUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }))
        ),
      });
      if (res.ok) sent += chunk.length;
      else failed += chunk.length;
    } catch {
      failed += chunk.length;
    }
  }

  return { sent, failed };
}
