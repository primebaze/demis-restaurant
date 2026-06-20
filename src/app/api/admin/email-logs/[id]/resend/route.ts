import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendByProvider } from "@/lib/email";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/email-logs/[id]/resend — re-send one logged email now.
 * Optional body { provider } to override (e.g. retry a failed SMTP send via Resend).
 * Used to reach guests who missed a send because of the hourly cap.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let override: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.provider === "string") override = body.provider;
  } catch {
    // no body is fine
  }

  const row = await prisma.emailLog.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Log entry not found" }, { status: 404 });
  if (!row.bodyHtml)
    return NextResponse.json({ error: "No stored content to resend (only bulk emails can be resent)" }, { status: 400 });

  const provider = override === "resend" || override === "smtp" ? override : row.provider;
  const ok = await sendByProvider(row.recipient, row.subject, row.bodyHtml, provider);

  await prisma.emailLog.update({
    where: { id },
    data: {
      provider,
      status: ok ? "sent" : "failed",
      sentAt: ok ? new Date() : row.sentAt,
      error: ok ? "" : "resend failed",
    },
  });

  return NextResponse.json({ ok, provider });
}
