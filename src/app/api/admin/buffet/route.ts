import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendAdminNewBuffetBooking, sendBuffetGuestConfirmation } from "@/lib/email";
export const dynamic = "force-dynamic";

/** GET /api/admin/buffet — list buffet bookings (latest first) */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const where = status ? { status } : {};

  const [bookings, total] = await Promise.all([
    prisma.buffetBooking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.buffetBooking.count({ where }),
  ]);

  return NextResponse.json({ bookings, total, totalPages: Math.ceil(total / limit) });
}

/** POST /api/admin/buffet — staff creates a buffet booking */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name: string;
    email?: string;
    phone?: string;
    partySize: number;
    date: string;
    time: string;
    locationSlug?: string;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email = "", phone = "", partySize, date, time, locationSlug = "cricklewood", notes = "" } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!date?.match(/^\d{4}-\d{2}-\d{2}$/)) return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  if (!time?.match(/^\d{2}:\d{2}$/)) return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
  if (!partySize || partySize < 1) return NextResponse.json({ error: "Party size must be at least 1" }, { status: 400 });

  // Generate unique random code — retry on collision
  let bookingCode = "";
  for (let i = 0; i < 5; i++) {
    const candidate = `BF-${randomBytes(3).toString("hex").toUpperCase()}`; // e.g. "BF-A3KX9P"
    const existing = await prisma.buffetBooking.findUnique({ where: { bookingCode: candidate } });
    if (!existing) { bookingCode = candidate; break; }
  }
  if (!bookingCode) return NextResponse.json({ error: "Could not generate unique code" }, { status: 500 });

  const booking = await prisma.buffetBooking.create({
    data: {
      bookingCode,
      name: name.trim().slice(0, 200),
      email: email.trim().slice(0, 200),
      phone: phone.trim().slice(0, 50),
      partySize,
      date,
      time,
      locationSlug,
      notes: notes.trim().slice(0, 1000),
    },
  });

  // Notify admin (non-blocking)
  sendAdminNewBuffetBooking({
    bookingCode: booking.bookingCode,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    partySize: booking.partySize,
    date: booking.date,
    time: booking.time,
    locationSlug: booking.locationSlug,
  }).catch(console.error);

  // Confirm to the guest if an email was provided (non-blocking)
  if (booking.email) {
    sendBuffetGuestConfirmation({
      name: booking.name,
      email: booking.email,
      bookingCode: booking.bookingCode,
      partySize: booking.partySize,
      date: booking.date,
      time: booking.time,
      locationSlug: booking.locationSlug,
    }).catch(console.error);
  }

  return NextResponse.json({ booking }, { status: 201 });
}
