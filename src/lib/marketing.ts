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

// ── Branded email template ──
export function buildMarketingEmail(opts: {
  subject: string;
  bodyHtml: string;
  unsubUrl: string;
  preheader?: string;
}): string {
  const logoUrl = process.env.MARKETING_LOGO_URL;
  const header = logoUrl
    ? `<img src="${logoUrl}" alt="Demi's Restaurant" width="150" style="display:block;margin:0 auto;border:0;">`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1;letter-spacing:6px;color:#e3c07a;font-weight:bold;">DEMI'S</div>
       <div style="font-size:10px;letter-spacing:4px;color:#b79a5f;text-transform:uppercase;margin-top:6px;">Nigerian Restaurant</div>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(opts.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1ede4;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader || "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1ede4;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <!-- Header -->
      <tr><td align="center" style="background:#141210;padding:34px 24px;">
        ${header}
      </td></tr>
      <!-- Gold rule -->
      <tr><td style="height:3px;background:linear-gradient(90deg,#e3c07a,#b8862f);font-size:0;line-height:0;">&nbsp;</td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 40px 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#2b2620;">
        ${opts.bodyHtml}
      </td></tr>
      <!-- CTA to book -->
      <tr><td align="center" style="padding:4px 40px 40px;">
        <a href="${SITE_URL}/booking" style="display:inline-block;background:#e3c07a;color:#141210;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:13px 30px;border-radius:8px;">Book a Table</a>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#faf7f0;padding:24px 40px;border-top:1px solid #eadfce;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a8172;text-align:center;">
        <strong style="color:#6b6355;">Demi's Nigerian Restaurant</strong><br>
        89 Cricklewood Broadway, London NW2 3JG &middot; 67 Streatham Hill, London SW2 4TX<br>
        <a href="tel:+442039046977" style="color:#8a8172;text-decoration:none;">020 3904 6977</a>
        &middot;
        <a href="${SITE_URL}" style="color:#8a8172;text-decoration:none;">demisrestaurant.co.uk</a>
        <br><br>
        You're receiving this because you joined our list.
        <a href="${opts.unsubUrl}" style="color:#b8862f;text-decoration:underline;">Unsubscribe</a>.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
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
