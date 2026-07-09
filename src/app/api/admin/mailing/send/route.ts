import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  isMarketingConfigured,
  buildMarketingEmail,
  buildPlainEmail,
  formatBody,
  unsubscribeUrl,
  sendMarketingBatch,
} from "@/lib/marketing";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/mailing/send
 * Body: { subject, body, test? }
 *  - test (an email): sends a single preview to that address only.
 *  - otherwise: sends to every subscribed contact.
 */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isMarketingConfigured()) {
    return NextResponse.json(
      { error: "Marketing email isn't set up yet. Verify hello.demisrestaurant.co.uk in Resend and set MARKETING_EMAIL_FROM (your existing Resend key is reused)." },
      { status: 400 }
    );
  }

  const { subject, body, test, style } = await req.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const bodyHtml = formatBody(body);
  const preheader = body.trim().replace(/\s+/g, " ").slice(0, 110);
  const plain = style === "plain";
  const render = (to: string) =>
    plain
      ? buildPlainEmail({ bodyHtml, unsubUrl: unsubscribeUrl(to) })
      : buildMarketingEmail({ subject, bodyHtml, unsubUrl: unsubscribeUrl(to), preheader });

  // Test send — one email, no logging, no contact list.
  if (test) {
    const to = String(test).trim().toLowerCase();
    const html = render(to);
    const r = await sendMarketingBatch([{ to, subject, html, unsubUrl: unsubscribeUrl(to) }]);
    return NextResponse.json(r.sent > 0 ? { test: true, sent: 1 } : { error: "Test send failed" }, { status: r.sent > 0 ? 200 : 502 });
  }

  const contacts = await prisma.mailingContact.findMany({
    where: { unsubscribed: false },
    select: { email: true },
  });
  if (contacts.length === 0) {
    return NextResponse.json({ error: "No subscribed contacts to send to." }, { status: 400 });
  }

  const messages = contacts.map((c) => {
    const unsubUrl = unsubscribeUrl(c.email);
    return { to: c.email, subject, html: render(c.email), unsubUrl };
  });

  const result = await sendMarketingBatch(messages);

  // Log per recipient so the Email Logs page shows who received it.
  const now = new Date();
  const campaign = `${subject.slice(0, 40)} · ${now.toISOString().slice(0, 10)}`;
  await prisma.emailLog.createMany({
    data: messages.map((m, idx) => ({
      recipient: m.to,
      subject,
      type: "marketing",
      provider: "resend",
      status: idx < result.sent ? "sent" : "failed",
      campaign,
      sentAt: idx < result.sent ? now : null,
    })),
  });

  return NextResponse.json({ sent: result.sent, failed: result.failed, total: messages.length });
}
