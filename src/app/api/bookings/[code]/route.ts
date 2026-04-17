import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingModification, sendBookingCancellation } from "@/lib/email";
import { cancelDeposit } from "@/lib/stripe";
export const dynamic = "force-dynamic";


/**
 * PATCH /api/bookings/[code] — Modify a booking (guest or admin)
 * Body: { token, date?, time?, timeSlotId?, partySize?, notes?, status? }
 *
 * DELETE /api/bookings/[code]?token=abc — Cancel a booking (guest)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { token, ...updates } = body;

    if (!token) {
      return NextResponse.json({ error: "Missing management token" }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { confirmationCode: code },
      include: { location: true, timeSlot: true, guest: true },
    });

    if (!booking || booking.managementToken !== token) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Don't allow modification of cancelled/completed/no-show bookings
    if (["cancelled_guest", "cancelled_admin", "completed", "no_show"].includes(booking.status)) {
      return NextResponse.json({ error: `Cannot modify a ${booking.status} booking` }, { status: 400 });
    }

    // ─── If changing date/time/slot, check capacity ───
    if (updates.timeSlotId || updates.date) {
      const targetSlotId = updates.timeSlotId || booking.timeSlotId;
      const targetDate = updates.date || booking.date;
      const targetPartySize = updates.partySize || booking.partySize;

      const slot = await prisma.timeSlot.findUnique({ where: { id: targetSlotId } });
      if (!slot || !slot.isActive) {
        return NextResponse.json({ error: "Time slot not found" }, { status: 404 });
      }

      const existingBookings = await prisma.booking.findMany({
        where: {
          locationId: booking.locationId,
          timeSlotId: targetSlotId,
          date: targetDate,
          status: { in: ["confirmed", "pending_payment", "modified"] },
          id: { not: booking.id }, // exclude current booking
        },
        select: { partySize: true },
      });

      const totalBooked = existingBookings.reduce((sum, b) => sum + b.partySize, 0);
      const remaining = slot.maxCovers - totalBooked;

      if (targetPartySize > remaining) {
        return NextResponse.json(
          { error: `Not enough capacity. Only ${remaining} covers remaining.` },
          { status: 400 }
        );
      }
    }

    // ─── If party size changing, check deposit requirements ───
    if (updates.partySize) {
      const policy =
        (await prisma.bookingPolicy.findUnique({ where: { locationSlug: booking.location.slug } })) ||
        (await prisma.bookingPolicy.findUnique({ where: { locationSlug: "default" } }));

      if (policy && updates.partySize >= policy.depositThreshold && booking.depositAmountPence === 0) {
        // Crossed deposit threshold — mark as pending payment
        updates.depositAmountPence = policy.depositAmountPence;
        updates.depositStatus = "pending";
        updates.status = "pending_payment";
      }
    }

    // ─── Build audit log entries ───
    const allowedFields = ["date", "time", "timeSlotId", "partySize", "notes", "status"];
    const changes: { field: string; oldVal: string; newVal: string }[] = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined && updates[field] !== (booking as Record<string, unknown>)[field]) {
        changes.push({
          field,
          oldVal: String((booking as Record<string, unknown>)[field]),
          newVal: String(updates[field]),
        });
      }
    }

    // ─── Apply updates ───
    const data: Record<string, unknown> = {};
    if (updates.date) data.date = updates.date;
    if (updates.time) data.time = updates.time;
    if (updates.timeSlotId) data.timeSlotId = updates.timeSlotId;
    if (updates.partySize) data.partySize = updates.partySize;
    if (updates.notes !== undefined) data.notes = updates.notes;
    if (updates.depositAmountPence !== undefined) data.depositAmountPence = updates.depositAmountPence;
    if (updates.depositStatus) data.depositStatus = updates.depositStatus;

    // Set status to modified if guest is changing details, unless already overridden
    if (!updates.status && Object.keys(data).length > 0) {
      data.status = "modified";
    } else if (updates.status) {
      data.status = updates.status;
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data,
      include: { location: true, timeSlot: true, guest: true },
    });

    // Write audit log
    for (const change of changes) {
      await prisma.bookingChange.create({
        data: {
          bookingId: booking.id,
          changedBy: booking.guest.email,
          fieldChanged: change.field,
          oldValue: change.oldVal,
          newValue: change.newVal,
        },
      });
    }

    // ─── Send modification email ───
    if (changes.length > 0) {
      sendBookingModification({
        guestName: updated.guest.name,
        guestEmail: updated.guest.email,
        confirmationCode: updated.confirmationCode,
        location: updated.location.name,
        date: updated.date,
        time: updated.time,
        slot: `${updated.timeSlot.startTime} – ${updated.timeSlot.endTime}`,
        partySize: updated.partySize,
        changes,
        manageUrl: `/booking/manage?code=${updated.confirmationCode}&token=${booking.managementToken}`,
      });
    }

    return NextResponse.json({
      success: true,
      booking: {
        confirmationCode: updated.confirmationCode,
        location: updated.location.name,
        date: updated.date,
        time: updated.time,
        partySize: updated.partySize,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("Booking update error:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

/**
 * DELETE /api/bookings/[code]?token=abc — Guest cancels their booking
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing management token" }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { confirmationCode: code },
      include: { guest: true, location: true, timeSlot: true },
    });

    if (!booking || booking.managementToken !== token) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (["cancelled_guest", "cancelled_admin", "completed", "no_show"].includes(booking.status)) {
      return NextResponse.json({ error: "Booking is already cancelled or completed" }, { status: 400 });
    }

    // ─── Check cancellation window ───
    const policy =
      (await prisma.bookingPolicy.findUnique({ where: { locationSlug: booking.location.slug } })) ||
      (await prisma.bookingPolicy.findUnique({ where: { locationSlug: "default" } }));

    let depositRefunded = false;
    if (policy && booking.depositAmountPence > 0) {
      const bookingDateTime = new Date(`${booking.date}T${booking.time}:00`);
      const hoursUntil = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntil >= policy.cancellationWindowH) {
        // Can refund deposit — cancel the Stripe hold
        depositRefunded = true;
        if (booking.stripePaymentIntentId) {
          await cancelDeposit(booking.stripePaymentIntentId);
        }
      }
      // else: deposit captured (no refund for late cancellation)
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "cancelled_guest",
        depositStatus: depositRefunded ? "refunded" : booking.depositStatus === "captured" ? "captured" : booking.depositStatus,
      },
    });

    await prisma.bookingChange.create({
      data: {
        bookingId: booking.id,
        changedBy: booking.guest.email,
        fieldChanged: "status",
        oldValue: booking.status,
        newValue: "cancelled_guest",
      },
    });

    // ─── Send cancellation email ───
    sendBookingCancellation({
      guestName: booking.guest.name,
      guestEmail: booking.guest.email,
      confirmationCode: booking.confirmationCode,
      location: booking.location.name,
      date: booking.date,
      slot: `${booking.timeSlot.startTime} – ${booking.timeSlot.endTime}`,
      depositRefunded,
      depositAmountPence: booking.depositAmountPence,
    });

    return NextResponse.json({
      success: true,
      message: "Booking cancelled",
      depositRefunded,
    });
  } catch (error) {
    console.error("Booking cancellation error:", error);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}
