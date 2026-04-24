import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateConfirmationCode,
  generateManagementToken,
} from "@/lib/booking-utils";
import { sendBookingConfirmation, sendAdminNewBooking } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

// 10 booking requests per IP per minute
const BOOKING_RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };


/** Convert 24h "13:30" → "1:30 PM" */
function formatTime24(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

/**
 * POST /api/bookings — Create a new booking
 *
 * Body: { locationSlug, timeSlotId, date, time, partySize, name, email, phone?, notes?, addOnIds?, source? }
 */
export async function POST(req: Request) {
  try {
    // Rate limit check
    const ip = getClientIp(req);
    const limiter = rateLimit(`booking:${ip}`, BOOKING_RATE_LIMIT);
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limiter.resetMs / 1000)),
          },
        }
      );
    }

    const body = await req.json();
    const {
      locationSlug,
      timeSlotId,
      date,
      time,
      partySize,
      name,
      email,
      phone,
      notes,
      addOnIds,
      source,
      website,
    } = body;

    // ─── Honeypot check (bots fill this hidden field) ───
    if (website) {
      // Silently return a fake success so bots think it worked
      return NextResponse.json({ booking: { confirmationCode: "FAKE" } });
    }

    // ─── Validation ───
    if (!locationSlug || !timeSlotId || !date || !time || !partySize || !name || !email) {
      return NextResponse.json(
        { error: "Missing required fields: locationSlug, timeSlotId, date, time, partySize, name, email" },
        { status: 400 }
      );
    }

    // ─── Type & format validation ───
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const parsedPartySize = Number(partySize);
    if (!Number.isInteger(parsedPartySize) || parsedPartySize < 1 || parsedPartySize > 100) {
      return NextResponse.json({ error: "Party size must be between 1 and 100" }, { status: 400 });
    }

    if (typeof name !== "string" || name.length > 200) {
      return NextResponse.json({ error: "Name must be under 200 characters" }, { status: 400 });
    }

    if (notes && typeof notes === "string" && notes.length > 1000) {
      return NextResponse.json({ error: "Notes must be under 1000 characters" }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
    }

    // Get location
    const location = await prisma.location.findUnique({ where: { slug: locationSlug } });
    if (!location || !location.isActive) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Get time slot
    const timeSlot = await prisma.timeSlot.findUnique({ where: { id: timeSlotId } });
    if (!timeSlot || !timeSlot.isActive) {
      return NextResponse.json({ error: "Time slot not found" }, { status: 404 });
    }

    // ─── Policy checks ───
    const policy =
      (await prisma.bookingPolicy.findUnique({ where: { locationSlug } })) ||
      (await prisma.bookingPolicy.findUnique({ where: { locationSlug: "default" } }));

    if (policy) {
      if (partySize < policy.minPartySize || partySize > policy.maxPartySize) {
        return NextResponse.json(
          { error: `Party size must be between ${policy.minPartySize} and ${policy.maxPartySize}` },
          { status: 400 }
        );
      }

      // Check advance booking limit
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + policy.maxAdvanceDays);
      if (date > maxDate.toISOString().split("T")[0]) {
        return NextResponse.json({ error: "Date too far in advance" }, { status: 400 });
      }
    }

    // Check blackout
    const blackout = await prisma.blackoutDate.findFirst({
      where: {
        date,
        OR: [{ locationId: null }, { locationId: location.id }],
      },
    });
    if (blackout) {
      return NextResponse.json({ error: `Unavailable: ${blackout.reason}` }, { status: 400 });
    }

    // ─── Capacity check ───
    const existingBookings = await prisma.booking.findMany({
      where: {
        locationId: location.id,
        timeSlotId,
        date,
        status: { in: ["confirmed", "pending_payment", "modified"] },
      },
      select: { partySize: true },
    });

    const totalBooked = existingBookings.reduce((sum, b) => sum + b.partySize, 0);
    const remaining = timeSlot.maxCovers - totalBooked;

    if (partySize > remaining) {
      return NextResponse.json(
        { error: `Not enough capacity. Only ${remaining} covers remaining for this slot.` },
        { status: 400 }
      );
    }

    // ─── Duplicate check (auto-cancel stale pending_payment bookings) ───
    const existingForGuest = await prisma.booking.findFirst({
      where: {
        guest: { email },
        date,
        time,
        status: { in: ["confirmed", "pending_payment", "modified"] },
      },
    });

    if (existingForGuest) {
      // If the existing booking is stuck in pending_payment, auto-cancel it so they can rebook
      if (existingForGuest.status === "pending_payment") {
        await prisma.booking.update({
          where: { id: existingForGuest.id },
          data: { status: "cancelled_guest", depositStatus: "none" },
        });
        await prisma.bookingChange.create({
          data: {
            bookingId: existingForGuest.id,
            changedBy: "system",
            fieldChanged: "status",
            oldValue: "pending_payment",
            newValue: "cancelled_guest",
          },
        });
      } else {
        return NextResponse.json(
          { error: "You already have a booking at this time. Please modify your existing booking." },
          { status: 400 }
        );
      }
    }

    // ─── Deposit logic ───
    let depositAmountPence = 0;
    let depositStatus = "none";

    if (policy && partySize >= policy.depositThreshold) {
      depositAmountPence = policy.depositAmountPence;
      depositStatus = "pending";
    }

    // ─── Create or find guest ───
    let guest = await prisma.guest.findUnique({ where: { email } });
    if (!guest) {
      guest = await prisma.guest.create({
        data: { name, email, phone: phone || null },
      });
    } else {
      // Update name/phone if provided
      await prisma.guest.update({
        where: { id: guest.id },
        data: {
          name,
          ...(phone ? { phone } : {}),
        },
      });
    }

    // ─── Calculate total payable ───
    let addOnsTotalPence = 0;
    if (addOnIds && Array.isArray(addOnIds) && addOnIds.length > 0) {
      const addOnRecords = await prisma.addOn.findMany({
        where: { id: { in: addOnIds } },
        select: { pricePence: true },
      });
      addOnsTotalPence = addOnRecords.reduce((sum, a) => sum + a.pricePence, 0);
    }

    const totalPayable = addOnsTotalPence + depositAmountPence;
    const bookingStatus = totalPayable > 0 ? "pending_payment" : "confirmed";

    // ─── Create booking ───
    const confirmationCode = generateConfirmationCode();
    const managementToken = generateManagementToken();

    const booking = await prisma.booking.create({
      data: {
        confirmationCode,
        guestId: guest.id,
        locationId: location.id,
        timeSlotId,
        date,
        time,
        partySize,
        status: bookingStatus,
        source: source || "website",
        notes: notes || "",
        depositAmountPence,
        depositStatus,
        managementToken,
        acceptedTermsAt: new Date(),
      },
      include: {
        location: true,
        timeSlot: true,
        guest: true,
      },
    });

    // ─── Add-ons ───
    if (addOnIds && Array.isArray(addOnIds) && addOnIds.length > 0) {
      for (const addOnId of addOnIds) {
        await prisma.bookingAddOn.create({
          data: { bookingId: booking.id, addOnId },
        });
      }
    }

    // ─── Audit log ───
    await prisma.bookingChange.create({
      data: {
        bookingId: booking.id,
        changedBy: email,
        fieldChanged: "status",
        oldValue: "",
        newValue: bookingStatus,
      },
    });

    // ─── Payment required → return bookingId so frontend can redirect to Stripe ───
    if (bookingStatus === "pending_payment") {
      return NextResponse.json({
        success: true,
        paymentRequired: true,
        bookingId: booking.id,
        booking: {
          id: booking.id,
          confirmationCode: booking.confirmationCode,
          location: booking.location.name,
          date: booking.date,
          time: booking.time,
          partySize: booking.partySize,
          status: booking.status,
          depositRequired: depositAmountPence > 0,
          depositAmountPence,
          addOnsTotalPence,
        },
      });
    }

    // ─── No payment needed — send emails immediately ───
    const bookingAddOns = addOnIds && Array.isArray(addOnIds) && addOnIds.length > 0
      ? await prisma.bookingAddOn.findMany({
          where: { bookingId: booking.id },
          include: { addOn: true },
        })
      : [];

    const manageUrl = `/booking/manage?code=${booking.confirmationCode}&token=${booking.managementToken}`;

    await Promise.allSettled([
      sendBookingConfirmation({
        guestName: name,
        guestEmail: email,
        confirmationCode: booking.confirmationCode,
        location: booking.location.name,
        locationAddress: booking.location.address,
        date: booking.date,
        time: booking.time,
        slot: formatTime24(booking.timeSlot.startTime),
        partySize,
        depositRequired: false,
        depositAmountPence: 0,
        addOns: bookingAddOns.map((ba) => ({ name: ba.addOn.name, pricePence: ba.addOn.pricePence })),
        manageUrl,
      }),
      sendAdminNewBooking({
        confirmationCode: booking.confirmationCode,
        guestName: name,
        guestEmail: email,
        location: booking.location.name,
        date: booking.date,
        slot: formatTime24(booking.timeSlot.startTime),
        partySize,
        depositRequired: false,
        depositAmountPence: 0,
        addOns: bookingAddOns.map((ba) => ({
          name: ba.addOn.name,
          pricePence: ba.addOn.pricePence,
          quantity: ba.quantity,
        })),
        source: source || "website",
      }),
    ]);

    return NextResponse.json({
      success: true,
      paymentRequired: false,
      booking: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        location: booking.location.name,
        date: booking.date,
        time: booking.time,
        partySize: booking.partySize,
        status: booking.status,
        depositRequired: false,
        depositAmountPence: 0,
        managementUrl: `/booking/manage?code=${booking.confirmationCode}&token=${booking.managementToken}`,
      },
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

/**
 * GET /api/bookings?code=DEM-4K7X&token=abc123 — Guest views their booking
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const token = searchParams.get("token");

  if (!code || !token) {
    return NextResponse.json({ error: "Missing code or token" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { confirmationCode: code },
    include: {
      location: true,
      timeSlot: true,
      guest: true,
      addOns: { include: { addOn: true } },
    },
  });

  if (!booking || booking.managementToken !== token) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({
    booking: {
      confirmationCode: booking.confirmationCode,
      location: booking.location.name,
      locationSlug: booking.location.slug,
      date: booking.date,
      time: booking.time,
      slot: formatTime24(booking.timeSlot.startTime),
      partySize: booking.partySize,
      status: booking.status,
      notes: booking.notes,
      guest: { name: booking.guest.name, email: booking.guest.email, phone: booking.guest.phone },
      depositAmountPence: booking.depositAmountPence,
      depositStatus: booking.depositStatus,
      addOns: booking.addOns.map((ba) => ({
        name: ba.addOn.name,
        pricePence: ba.addOn.pricePence,
        quantity: ba.quantity,
      })),
      createdAt: booking.createdAt,
    },
  });
}
