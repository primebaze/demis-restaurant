import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendDirectGuestEmail } from "@/lib/email";
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
      select: { email: true },
    });

    if (guests.length === 0)
      return NextResponse.json({ error: "No guests with email addresses found" }, { status: 400 });

    const results = await Promise.allSettled(
      guests.map((g) =>
        sendDirectGuestEmail({ to: g.email, subject: subject.trim(), message: message.trim() })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ sent });
  }

  if (guestId) {
    const guest = await prisma.guest.findUnique({ where: { id: guestId }, select: { email: true, name: true } });
    if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    if (!guest.email) return NextResponse.json({ error: "This guest has no email address on file" }, { status: 400 });

    await sendDirectGuestEmail({ to: guest.email, subject: subject.trim(), message: message.trim() });
    return NextResponse.json({ sent: 1 });
  }

  return NextResponse.json({ error: "Provide guestId or all: true" }, { status: 400 });
}
