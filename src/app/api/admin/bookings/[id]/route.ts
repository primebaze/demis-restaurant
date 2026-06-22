import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { captureDeposit, cancelDeposit } from "@/lib/stripe";
import { sendBookingCompleted } from "@/lib/email";
export const dynamic = "force-dynamic";


/**
 * PATCH /api/admin/bookings/[id] — Admin updates a booking
 * Body: { status?, partySize?, notes?, date?, time?, timeSlotId? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { guest: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // A booking can only be completed once its date has passed (not today or future).
  if (body.status === "completed") {
    const ukToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
    if (booking.date >= ukToday) {
      return NextResponse.json(
        { error: "A booking can only be marked completed after its date has passed." },
        { status: 400 }
      );
    }
  }

  // Build update data + audit log
  const data: Record<string, unknown> = {};
  const changes: { field: string; oldVal: string; newVal: string }[] = [];

  const fields = ["status", "partySize", "notes", "date", "time", "timeSlotId", "depositStatus"];
  for (const field of fields) {
    if (body[field] !== undefined && body[field] !== (booking as Record<string, unknown>)[field]) {
      changes.push({
        field,
        oldVal: String((booking as Record<string, unknown>)[field]),
        newVal: String(body[field]),
      });
      data[field] = body[field];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data,
    include: { location: true, guest: true },
  });

  // Write audit log
  for (const change of changes) {
    await prisma.bookingChange.create({
      data: {
        bookingId: id,
        changedBy: admin!.email,
        fieldChanged: change.field,
        oldValue: change.oldVal,
        newValue: change.newVal,
      },
    });
  }

  // If marking no-show, capture deposit
  if (data.status === "no_show" && booking.stripePaymentIntentId && booking.depositAmountPence > 0) {
    const captured = await captureDeposit(booking.stripePaymentIntentId);
    if (captured) {
      await prisma.booking.update({
        where: { id },
        data: { depositStatus: "captured" },
      });
    }
  }

  // If marking completed (and not already completed), record visit, release hold, email guest.
  if (data.status === "completed" && booking.status !== "completed") {
    await prisma.visit.create({
      data: {
        guestId: booking.guestId,
        bookingId: booking.id,
        visitDate: booking.date,
      },
    });

    // Release the deposit hold (guest showed up)
    if (booking.stripePaymentIntentId && booking.depositAmountPence > 0) {
      const released = await cancelDeposit(booking.stripePaymentIntentId);
      if (released) {
        await prisma.booking.update({
          where: { id },
          data: { depositStatus: "refunded" },
        });
      }
    }

    // Thank-you email to the guest (non-blocking)
    if (booking.guest.email) {
      sendBookingCompleted({
        guestName: booking.guest.name,
        guestEmail: booking.guest.email,
        confirmationCode: booking.confirmationCode,
        date: booking.date,
        location: updated.location.name,
      }).catch(console.error);
    }
  }

  return NextResponse.json({
    success: true,
    booking: {
      id: updated.id,
      confirmationCode: updated.confirmationCode,
      status: updated.status,
    },
  });
}
