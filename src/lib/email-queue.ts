import { prisma } from "@/lib/prisma";
import { sendRawEmail } from "@/lib/email";

const MAX_BULK_PER_HOUR = 15;

/**
 * Drain queued bulk emails. Sends at most (15 − bulk sent in the last hour),
 * so the bulk rate never exceeds 15/hour no matter how often this is called.
 * Safe to call from a cron, the keep-alive ping, or an external trigger.
 */
export async function drainEmailQueue(): Promise<{ sent: number; failed: number; remaining: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const bulkSentLastHour = await prisma.emailLog.count({
    where: { type: "bulk", status: "sent", sentAt: { gte: oneHourAgo } },
  });

  const budget = Math.max(0, MAX_BULK_PER_HOUR - bulkSentLastHour);
  if (budget === 0) {
    const remaining = await prisma.emailLog.count({ where: { type: "bulk", status: "queued" } });
    return { sent: 0, failed: 0, remaining };
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
  return { sent, failed, remaining };
}
