import { prisma } from "@/lib/prisma";
import { verifyUnsub } from "@/lib/marketing";
export const dynamic = "force-dynamic";

function page(message: string, sub: string): Response {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Unsubscribe · Demi's Restaurant</title></head>
<body style="margin:0;background:#0f0f0f;color:#f4efe4;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:440px;text-align:center;padding:40px 24px;">
    <div style="font-family:Georgia,serif;font-size:26px;letter-spacing:5px;color:#e3c07a;font-weight:bold;">DEMI'S</div>
    <div style="font-size:10px;letter-spacing:4px;color:#b79a5f;text-transform:uppercase;margin-top:6px;margin-bottom:28px;">Nigerian Restaurant</div>
    <h1 style="font-size:20px;margin:0 0 10px;">${message}</h1>
    <p style="color:#a49c88;font-size:14px;line-height:1.6;margin:0 0 24px;">${sub}</p>
    <a href="https://www.demisrestaurant.co.uk" style="display:inline-block;background:#e3c07a;color:#141210;font-weight:bold;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:14px;">Back to our website</a>
  </div>
</body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function unsubscribe(email: string, token: string): Promise<Response> {
  const e = (email || "").trim().toLowerCase();
  if (!e || !verifyUnsub(e, token)) {
    return page("Invalid unsubscribe link", "This link is invalid or has expired. Please contact us if you'd like to be removed.");
  }
  await prisma.mailingContact.updateMany({ where: { email: e }, data: { unsubscribed: true } }).catch(() => {});
  return page("You've been unsubscribed", `${e} will no longer receive marketing emails from Demi's Restaurant. We're sorry to see you go.`);
}

/** GET — link click from the email footer. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return unsubscribe(searchParams.get("e") || "", searchParams.get("t") || "");
}

/** POST — Gmail/Apple one-click (List-Unsubscribe-Post). */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  return unsubscribe(searchParams.get("e") || "", searchParams.get("t") || "");
}
