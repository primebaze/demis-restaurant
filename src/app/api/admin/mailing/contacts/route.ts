import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

/** GET /api/admin/mailing/contacts — paginated list + counts */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 50;

  const where = search
    ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }] }
    : {};

  try {
    const [contacts, total, subscribed, unsubscribed] = await Promise.all([
      prisma.mailingContact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, email: true, name: true, source: true, unsubscribed: true, createdAt: true },
      }),
      prisma.mailingContact.count({ where }),
      prisma.mailingContact.count({ where: { unsubscribed: false } }),
      prisma.mailingContact.count({ where: { unsubscribed: true } }),
    ]);

    return NextResponse.json({
      contacts,
      total,
      totalPages: Math.ceil(total / limit),
      summary: { subscribed, unsubscribed, all: subscribed + unsubscribed },
    });
  } catch {
    // Table not migrated yet — return an empty, non-breaking shape.
    return NextResponse.json({
      contacts: [],
      total: 0,
      totalPages: 1,
      summary: { subscribed: 0, unsubscribed: 0, all: 0 },
      notMigrated: true,
    });
  }
}

/** DELETE /api/admin/mailing/contacts — { ids } or { all: true } */
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
    const { count } = await prisma.mailingContact.deleteMany({});
    return NextResponse.json({ deleted: count });
  }
  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const { count } = await prisma.mailingContact.deleteMany({ where: { id: { in: body.ids } } });
    return NextResponse.json({ deleted: count });
  }
  return NextResponse.json({ error: "Provide ids or all: true" }, { status: 400 });
}
