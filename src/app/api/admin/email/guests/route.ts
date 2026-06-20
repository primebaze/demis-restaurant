import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendDirectGuestEmail, buildGuestEmailHtml } from "@/lib/email";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { guestId?: string; all?: boolean; subject: string; message: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { guestId, all, subject, message } = body;

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

    // Queue the blast — the hourly cron drains it at max 15/hour so we never
    // exceed the SMTP per-hour cap. Render the HTML once and store per recipient.
    const html = buildGuestEmailHtml(message.trim());
    const campaign = `${subject.trim()} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

    await prisma.emailLog.createMany({
      data: guests.map((g) => ({
        recipient: g.email,
        subject: subject.trim(),
        type: "bulk",
        status: "queued",
        bodyHtml: html,
        campaign,
      })),
    });

    return NextResponse.json({ queued: guests.length });
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
