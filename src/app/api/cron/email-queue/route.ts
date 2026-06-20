import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRawEmail } from "@/lib/email";
export const dynamic = "force-dynamic";

const MAX_BULK_PER_HOUR = 15;

/**
 * GET /api/cron/email-queue — drains queued bulk emails.
 * Sends at most (15 − bulk emails already sent in the last hour), so the bulk
 * rate never exceeds 15/hour no matter how often this runs. Triggered by the
 * Vercel cron; protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const bulkSentLastHour = await prisma.emailLog.count({
    where: { type: "bulk", status: "sent", sentAt: { gte: oneHourAgo } },
  });

  const budget = Math.max(0, MAX_BULK_PER_HOUR - bulkSentLastHour);
  if (budget === 0) {
    const queued = await prisma.emailLog.count({ where: { type: "bulk", status: "queued" } });
    return NextResponse.json({ sent: 0, failed: 0, remaining: queued, note: "hourly budget reached" });
  }

  const batch = await prisma.emailLog.findMany({
    where: { type: "bulk", status: "queued" },
    orderBy: { createdAt: "asc" },
    take: budget,
  });

  let sent = 0;
  let failed = 0;

  for (const row of batch) {
    const ok = await sendRawEmail(row.recipient, row.subject, row.bodyHtml);
    await prisma.emailLog.update({
      where: { id: row.id },
      data: {
        status: ok ? "sent" : "failed",
        sentAt: ok ? new Date() : null,
        error: ok ? "" : "send failed",
        bodyHtml: "", // free the stored HTML once processed
      },
    });
    if (ok) sent++;
    else failed++;
  }

  const remaining = await prisma.emailLog.count({ where: { type: "bulk", status: "queued" } });
  return NextResponse.json({ sent, failed, remaining });
}
