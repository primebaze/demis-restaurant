import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

/** GET /api/admin/email-logs/[id] — full record incl. the email body for viewing. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const log = await prisma.emailLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    recipient: log.recipient,
    subject: log.subject,
    type: log.type,
    provider: log.provider,
    status: log.status,
    createdAt: log.createdAt,
    bodyHtml: log.bodyHtml,
  });
}
