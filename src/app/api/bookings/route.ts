import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateConfirmationCode,
  generateManagementToken,
} from "@/lib/booking-utils";
import { sendBookingConfirmation, sendAdminNewBooking, sendDepositPaymentLink } from "@/lib/email";
import { createDepositIntent } from "@/lib/stripe";

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
    } = body;

    // ─── Validation ───
    if (!locationSlug || !timeSlotId || !date || !time || !partySize || !name || !email) {
      return NextResponse.json(
        { error: "Missing required fields: locationSlug, timeSlotId, date, time, partySize, name, email" },
        { status: 400 }
      );
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

    // ─── Duplicate check ───
    const existingForGuest = await prisma.booking.findFirst({
      where: {
        guest: { email },
        date,
        time,
        status: { in: ["confirmed", "pending_payment", "modified"] },
      },
    });
    if (existingForGuest) {
      return NextResponse.json(
        { error: "You already have a booking at this time. Please modify your existing booking." },
        { status: 400 }
      );
    }

    // ─── Deposit logic ───
    let depositAmountPence = 0;
    let depositStatus = "none";
    let bookingStatus = "confirmed";

    if (policy && partySize >= policy.depositThreshold) {
      depositAmountPence = policy.depositAmountPence;
      depositStatus = "pending";
      bookingStatus = "pending_payment";
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

    // ─── Stripe deposit (if required) ───
    let stripePaymentUrl: string | null = null;
    if (depositAmountPence > 0) {
      const result = await createDepositIntent({
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        amountPence: depositAmountPence,
        guestEmail: email,
        guestName: name,
        description: `Booking deposit — ${booking.confirmationCode} — ${partySize} guests at ${booking.location.name}`,
      });

      if (result) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { stripePaymentIntentId: result.paymentIntentId },
        });
        stripePaymentUrl = result.paymentUrl;
      }
    }

    // ─── Fetch add-on details for email ───
    const bookingAddOns = addOnIds && Array.isArray(addOnIds) && addOnIds.length > 0
      ? await prisma.bookingAddOn.findMany({
          where: { bookingId: booking.id },
          include: { addOn: true },
        })
      : [];

    // ─── Send confirmation email to guest ───
    const manageUrl = `/booking/manage?code=${booking.confirmationCode}&token=${booking.managementToken}`;

    sendBookingConfirmation({
      guestName: name,
      guestEmail: email,
      confirmationCode: booking.confirmationCode,
      location: booking.location.name,
      date: booking.date,
      time: booking.time,
      slot: formatTime24(booking.timeSlot.startTime),
      partySize,
      depositRequired: depositAmountPence > 0,
      depositAmountPence,
      addOns: bookingAddOns.map((ba) => ({ name: ba.addOn.name, pricePence: ba.addOn.pricePence })),
      manageUrl,
    });

    // ─── Send deposit payment link (if required) ───
    if (stripePaymentUrl) {
      sendDepositPaymentLink({
        guestName: name,
        guestEmail: email,
        confirmationCode: booking.confirmationCode,
        location: booking.location.name,
        date: booking.date,
        slot: formatTime24(booking.timeSlot.startTime),
        partySize,
        depositAmountPence,
        paymentUrl: stripePaymentUrl,
      });
    }

    // ─── Notify admin ───
    sendAdminNewBooking({
      confirmationCode: booking.confirmationCode,
      guestName: name,
      guestEmail: email,
      location: booking.location.name,
      date: booking.date,
      slot: formatTime24(booking.timeSlot.startTime),
      partySize,
      depositRequired: depositAmountPence > 0,
      source: source || "website",
    });

    return NextResponse.json({
      success: true,
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
