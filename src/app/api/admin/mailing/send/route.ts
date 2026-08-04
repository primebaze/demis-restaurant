import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  isMarketingConfigured,
  buildMarketingEmail,
  buildPlainEmail,
  formatBody,
  personalize,
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

  const { subject, body, test, style, ids, limit, ctaUrl, ctaLabel } = await req.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }
  const selectedIds = Array.isArray(ids) && ids.length > 0 ? (ids as string[]) : null;
  const batchLimit = typeof limit === "number" && limit > 0 ? Math.floor(limit) : null;

  const preheader = body.trim().replace(/\s+/g, " ").slice(0, 110);
  const plain = style === "plain";

  // Renders a personalised email for one recipient ({name} → their first name).
  const render = (to: string, name: string) => {
    const bodyHtml = formatBody(personalize(body, name));
    const unsubUrl = unsubscribeUrl(to);
    const subj = personalize(subject, name);
    const html = plain
      ? buildPlainEmail({ bodyHtml, unsubUrl })
      : buildMarketingEmail({
          subject: subj,
          bodyHtml,
          unsubUrl,
          preheader: personalize(preheader, name),
          ctaUrl: typeof ctaUrl === "string" ? ctaUrl : undefined,
          ctaLabel: typeof ctaLabel === "string" ? ctaLabel : undefined,
        });
    return { subject: subj, html, unsubUrl };
  };

  // Test send — one email, no logging, no contact list.
  if (test) {
    const to = String(test).trim().toLowerCase();
    const r0 = render(to, "");
    const r = await sendMarketingBatch([{ to, subject: r0.subject, html: r0.html, unsubUrl: r0.unsubUrl }]);
    return NextResponse.json(r.sent > 0 ? { test: true, sent: 1 } : { error: "Test send failed" }, { status: r.sent > 0 ? 200 : 502 });
  }

  // Who already received THIS email (matched by subject)? Skip them so warm-up
  // batches over several days never double-send to the same person.
  const sentRows = await prisma.emailLog.findMany({
    where: { subject, type: "marketing", status: "sent" },
    select: { recipient: true },
  });
  const alreadySent = new Set(sentRows.map((r) => r.recipient.toLowerCase()));

  const pool = await prisma.mailingContact.findMany({
    where: { unsubscribed: false, ...(selectedIds ? { id: { in: selectedIds } } : {}) },
    select: { email: true, name: true },
    orderBy: { createdAt: "asc" }, // stable order so "next N" always continues where it left off
  });
  const notYetSent = pool.filter((c) => !alreadySent.has(c.email.toLowerCase()));
  const skipped = pool.length - notYetSent.length;
  const contacts = batchLimit ? notYetSent.slice(0, batchLimit) : notYetSent;

  if (contacts.length === 0) {
    return NextResponse.json(
      { error: skipped > 0 ? "Everyone here has already received this email." : "No subscribed contacts to send to." },
      { status: 400 }
    );
  }

  const messages = contacts.map((c) => {
    const r = render(c.email, c.name);
    return { to: c.email, subject: r.subject, html: r.html, unsubUrl: r.unsubUrl };
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

  const remaining = notYetSent.length - contacts.length;
  return NextResponse.json({ sent: result.sent, failed: result.failed, total: messages.length, skipped, remaining });
}
