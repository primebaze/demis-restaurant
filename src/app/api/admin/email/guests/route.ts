import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendDirectGuestEmail, buildGuestEmailHtml, sendResendBatch, isResendConfigured } from "@/lib/email";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { guestId?: string; all?: boolean; subject: string; message: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { guestId, all, subject, message } = body;
  // Resend only if explicitly chosen AND configured; otherwise SMTP.
  const provider = body.provider === "resend" && isResendConfigured() ? "resend" : "smtp";

  if (!subject?.trim() || subject.trim().length > 200)
    return NextResponse.json({ error: "Subject is required (max 200 chars)" }, { status: 400 });
  if (!message?.trim() || message.trim().length > 5000)
    return NextResponse.json({ error: "Message is required (max 5000 chars)" }, { status: 400 });

  if (all) {
    const guests = await prisma.guest.findMany({
      where: { email: { not: "" } },
      select: { email: true, name: true },
    });

    if (guests.length === 0)
      return NextResponse.json({ error: "No guests with email addresses found" }, { status: 400 });

    const html = buildGuestEmailHtml(message.trim());
    const subj = subject.trim();
    const campaign = `${subj} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

    if (provider === "resend") {
      // Resend has high limits — send now in batches of 100.
      let sent = 0;
      let failed = 0;
      for (let i = 0; i < guests.length; i += 100) {
        const chunk = guests.slice(i, i + 100);
        const ok = await sendResendBatch(chunk.map((g) => ({ to: g.email, subject: subj, html })));
        await prisma.emailLog.createMany({
          data: chunk.map((g) => ({
            recipient: g.email,
            subject: subj,
            type: "bulk",
            provider: "resend",
            status: ok ? "sent" : "failed",
            error: ok ? "" : "resend batch failed",
            bodyHtml: html,
            campaign,
            sentAt: ok ? new Date() : null,
          })),
        });
        if (ok) sent += chunk.length;
        else failed += chunk.length;
      }
      return NextResponse.json({ sent, failed, provider: "resend" });
    }

    // SMTP: queue — the keep-alive drain sends at max 15/hour.
    await prisma.emailLog.createMany({
      data: guests.map((g) => ({
        recipient: g.email,
        subject: subj,
        type: "bulk",
        provider: "smtp",
        status: "queued",
        bodyHtml: html,
        campaign,
      })),
    });

    return NextResponse.json({ queued: guests.length, provider: "smtp" });
  }

  if (guestId) {
    const guest = await prisma.guest.findUnique({ where: { id: guestId }, select: { email: true, name: true } });
    if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    if (!guest.email) return NextResponse.json({ error: "This guest has no email address on file" }, { status: 400 });

    try {
      await sendDirectGuestEmail({ to: guest.email, subject: subject.trim(), message: message.trim() });
      return NextResponse.json({ sent: 1, failed: 0, failures: [] });
    } catch {
      return NextResponse.json({ sent: 0, failed: 1, failures: [{ name: guest.name, email: guest.email }] });
    }
  }

  return NextResponse.json({ error: "Provide guestId or all: true" }, { status: 400 });
}
