import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/email-logs — delete logs to free space.
 * Body: { ids: string[] } to delete specific rows, or { all: true } to clear everything.
 */
export async function DELETE(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: string[]; all?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.all === true) {
    const { count } = await prisma.emailLog.deleteMany({});
    return NextResponse.json({ deleted: count });
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const { count } = await prisma.emailLog.deleteMany({ where: { id: { in: body.ids } } });
    return NextResponse.json({ deleted: count });
  }

  return NextResponse.json({ error: "Provide ids or all: true" }, { status: 400 });
}

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
          provider: true,
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
