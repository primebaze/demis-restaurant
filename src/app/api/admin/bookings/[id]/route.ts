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

  // Side effects run in parallel (was sequential, which made completion slow).
  const tasks: Promise<unknown>[] = [];

  // Audit log — one createMany instead of a loop of awaits
  if (changes.length > 0) {
    tasks.push(
      prisma.bookingChange.createMany({
        data: changes.map((c) => ({
          bookingId: id,
          changedBy: admin!.email,
          fieldChanged: c.field,
          oldValue: c.oldVal,
          newValue: c.newVal,
        })),
      })
    );
  }

  // No-show: capture deposit
  if (data.status === "no_show" && booking.stripePaymentIntentId && booking.depositAmountPence > 0) {
    tasks.push(
      captureDeposit(booking.stripePaymentIntentId).then((captured) =>
        captured ? prisma.booking.update({ where: { id }, data: { depositStatus: "captured" } }) : null
      )
    );
  }

  // Completed (and not already): record visit, release hold, email guest.
  if (data.status === "completed" && booking.status !== "completed") {
    tasks.push(
      prisma.visit.create({
        data: { guestId: booking.guestId, bookingId: booking.id, visitDate: booking.date },
      })
    );

    if (booking.stripePaymentIntentId && booking.depositAmountPence > 0) {
      tasks.push(
        cancelDeposit(booking.stripePaymentIntentId).then((released) =>
          released ? prisma.booking.update({ where: { id }, data: { depositStatus: "refunded" } }) : null
        )
      );
    }

    // Thank-you email (non-blocking, fires in the background)
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

  await Promise.all(tasks);

  return NextResponse.json({
    success: true,
    booking: {
      id: updated.id,
      confirmationCode: updated.confirmationCode,
      status: updated.status,
    },
  });
}
