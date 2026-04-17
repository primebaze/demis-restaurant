import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";


/**
 * GET /api/admin/bookings — List all bookings (filterable)
 * Query: ?date=2026-04-20&location=cricklewood&status=confirmed&page=1
 */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const locationSlug = searchParams.get("location");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (date) where.date = date;
  if (locationSlug) where.location = { slug: locationSlug };
  if (status) where.status = status;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        guest: true,
        location: true,
        timeSlot: true,
        addOns: { include: { addOn: true } },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      confirmationCode: b.confirmationCode,
      guest: { name: b.guest.name, email: b.guest.email, phone: b.guest.phone },
      location: b.location.name,
      locationSlug: b.location.slug,
      date: b.date,
      time: b.time,
      slot: `${b.timeSlot.startTime} – ${b.timeSlot.endTime}`,
      partySize: b.partySize,
      status: b.status,
      source: b.source,
      notes: b.notes,
      depositAmountPence: b.depositAmountPence,
      depositStatus: b.depositStatus,
      addOns: b.addOns.map((a) => ({ name: a.addOn.name, pricePence: a.addOn.pricePence })),
      createdAt: b.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

/**
 * POST /api/admin/bookings — Create booking on behalf of guest (phone/walk-in)
 */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Reuse the public booking API logic but with admin source
  const body = await req.json();

  const res = await fetch(new URL("/api/bookings", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, source: body.source || "admin" }),
  });

  return res;
}
