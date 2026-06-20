import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

/** GET /api/admin/email-logs — paginated email log + summary counts */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 30;

  const where = status ? { status } : {};
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const [logs, total, sentLastHour, queued, failed] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          recipient: true,
          subject: true,
          type: true,
          status: true,
          error: true,
          campaign: true,
          createdAt: true,
          sentAt: true,
        },
      }),
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({ where: { status: "sent", sentAt: { gte: oneHourAgo } } }),
      prisma.emailLog.count({ where: { status: "queued" } }),
      prisma.emailLog.count({ where: { status: "failed" } }),
    ]);

    return NextResponse.json({
      logs,
      total,
      totalPages: Math.ceil(total / limit),
      summary: { sentLastHour, queued, failed },
    });
  } catch {
    // EmailLog table not migrated yet — return an empty, non-breaking shape
    return NextResponse.json({
      logs: [],
      total: 0,
      totalPages: 1,
      summary: { sentLastHour: 0, queued: 0, failed: 0 },
      notMigrated: true,
    });
  }
}
