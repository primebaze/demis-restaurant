import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";


/**
 * GET /api/admin/guests — List guests with stats
 * Query: ?search=tunde&page=1
 */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const [guests, total] = await Promise.all([
    prisma.guest.findMany({
      where,
      include: {
        _count: { select: { bookings: true, visits: true } },
        bookings: { orderBy: { date: "desc" }, take: 1, select: { date: true, status: true } },
        visits: { select: { spendPence: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.guest.count({ where }),
  ]);

  return NextResponse.json({
    guests: guests.map((g) => ({
      id: g.id,
      name: g.name,
      email: g.email,
      phone: g.phone,
      tags: g.tags,
      notes: g.notes,
      totalBookings: g._count.bookings,
      totalVisits: g._count.visits,
      totalSpendPence: g.visits.reduce((sum, v) => sum + v.spendPence, 0),
      lastBooking: g.bookings[0] || null,
      createdAt: g.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

/**
 * PATCH /api/admin/guests — Update guest tags/notes
 */
export async function PATCH(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, tags, notes } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Guest ID required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (tags !== undefined) data.tags = tags;
  if (notes !== undefined) data.notes = notes;

  const updated = await prisma.guest.update({ where: { id }, data });

  return NextResponse.json({ success: true, guest: updated });
}
