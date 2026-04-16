import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDayOfWeek } from "@/lib/booking-utils";

/**
 * GET /api/availability?location=cricklewood&date=2026-04-20
 *
 * Returns available time slots for a given location + date, with remaining covers.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationSlug = searchParams.get("location");
  const date = searchParams.get("date");

  if (!locationSlug || !date) {
    return NextResponse.json(
      { error: "Missing location or date parameter" },
      { status: 400 }
    );
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format (YYYY-MM-DD)" }, { status: 400 });
  }

  // Check for blackout date
  const blackout = await prisma.blackoutDate.findFirst({
    where: {
      date,
      OR: [
        { locationId: null }, // applies to all locations
        { location: { slug: locationSlug } },
      ],
    },
  });

  if (blackout) {
    return NextResponse.json({
      available: false,
      reason: blackout.reason,
      slots: [],
    });
  }

  // Get location
  const location = await prisma.location.findUnique({
    where: { slug: locationSlug },
  });

  if (!location || !location.isActive) {
    return NextResponse.json({ error: "Location not found or inactive" }, { status: 404 });
  }

  // Get booking policy
  const policy =
    (await prisma.bookingPolicy.findUnique({ where: { locationSlug } })) ||
    (await prisma.bookingPolicy.findUnique({ where: { locationSlug: "default" } }));

  // Check advance booking limit
  if (policy) {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + policy.maxAdvanceDays);
    const maxDateStr = maxDate.toISOString().split("T")[0];
    if (date > maxDateStr) {
      return NextResponse.json({
        available: false,
        reason: `Bookings available up to ${policy.maxAdvanceDays} days in advance`,
        slots: [],
      });
    }
  }

  // Check date is not in the past
  const today = new Date().toISOString().split("T")[0];
  if (date < today) {
    return NextResponse.json({ available: false, reason: "Date is in the past", slots: [] });
  }

  const dayOfWeek = getDayOfWeek(date);

  // Get time slots for this location + day
  // Prefer specific date overrides, fall back to day-of-week
  const specificSlots = await prisma.timeSlot.findMany({
    where: {
      locationId: location.id,
      specificDate: date,
      isActive: true,
    },
  });

  const regularSlots = await prisma.timeSlot.findMany({
    where: {
      locationId: location.id,
      dayOfWeek,
      specificDate: null,
      isActive: true,
    },
  });

  const slots = specificSlots.length > 0 ? specificSlots : regularSlots;

  // Get existing bookings for this date + location
  const existingBookings = await prisma.booking.findMany({
    where: {
      locationId: location.id,
      date,
      status: { in: ["confirmed", "pending_payment", "modified"] },
    },
    select: { timeSlotId: true, partySize: true },
  });

  // Calculate remaining covers per slot
  const bookedPerSlot: Record<string, number> = {};
  for (const b of existingBookings) {
    bookedPerSlot[b.timeSlotId] = (bookedPerSlot[b.timeSlotId] || 0) + b.partySize;
  }

  const availableSlots = slots.map((slot) => {
    const booked = bookedPerSlot[slot.id] || 0;
    const remaining = slot.maxCovers - booked;
    return {
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxCovers: slot.maxCovers,
      booked,
      remaining: Math.max(0, remaining),
      available: remaining > 0,
    };
  });

  return NextResponse.json({
    available: true,
    location: { id: location.id, name: location.name, slug: location.slug },
    date,
    dayOfWeek,
    policy: policy
      ? {
          minPartySize: policy.minPartySize,
          maxPartySize: policy.maxPartySize,
          depositThreshold: policy.depositThreshold,
          depositAmountPence: policy.depositAmountPence,
          cancellationWindowH: policy.cancellationWindowH,
        }
      : null,
    slots: availableSlots,
  });
}
