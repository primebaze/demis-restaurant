import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendDirectGuestEmail } from "@/lib/email";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000; // 1 second between batches = max 10/second

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    const failures: { name: string; email: string }[] = [];
    let sent = 0;

    // Send in batches of BATCH_SIZE with a delay between batches
    for (let i = 0; i < guests.length; i += BATCH_SIZE) {
      const batch = guests.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((g) =>
          sendDirectGuestEmail({ to: g.email, subject: subject.trim(), message: message.trim() })
        )
      );

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          sent++;
        } else {
          failures.push({ name: batch[idx].name, email: batch[idx].email });
        }
      });

      // Delay between batches (skip after the last batch)
      if (i + BATCH_SIZE < guests.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    return NextResponse.json({ sent, failed: failures.length, failures });
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
