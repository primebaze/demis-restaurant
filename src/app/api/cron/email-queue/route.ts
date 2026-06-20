import { NextResponse } from "next/server";
import { drainEmailQueue } from "@/lib/email-queue";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/email-queue — drains queued bulk emails at max 15/hour.
 * Protected by CRON_SECRET. Can be hit by an external hourly trigger
 * (e.g. cron-job.org) for true 15/hour throughput on the Hobby plan.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await drainEmailQueue();
  return NextResponse.json(result);
}
