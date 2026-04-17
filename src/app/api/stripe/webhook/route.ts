import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { sendBookingConfirmation, sendAdminNewBooking } from "@/lib/email";

export const dynamic = "force-dynamic";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" })
  : null;

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

/** Convert 24h "13:30" → "1:30 PM" */
function formatTime24(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

/**
 * POST /api/stripe/webhook — Stripe webhook handler.
 * Listens for checkout.session.completed to confirm bookings.
 */
export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  // ─── Handle checkout.session.completed ───
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      console.error("[Stripe Webhook] No bookingId in session metadata");
      return NextResponse.json({ received: true });
    }

    console.log(`[Stripe Webhook] Payment completed for booking ${bookingId}`);

    try {
      // Update booking status
      const booking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "confirmed",
          depositStatus: "captured",
          stripePaymentIntentId: session.payment_intent as string || session.id,
        },
        include: {
          location: true,
          timeSlot: true,
          guest: true,
          addOns: { include: { addOn: true } },
        },
      });

      // Audit log
      await prisma.bookingChange.create({
        data: {
          bookingId: booking.id,
          changedBy: "stripe_webhook",
          fieldChanged: "status",
          oldValue: "pending_payment",
          newValue: "confirmed",
        },
      });

      // ─── Send confirmation email ───
      const manageUrl = `/booking/manage?code=${booking.confirmationCode}&token=${booking.managementToken}`;

      await Promise.allSettled([
        sendBookingConfirmation({
          guestName: booking.guest.name,
          guestEmail: booking.guest.email,
          confirmationCode: booking.confirmationCode,
          location: booking.location.name,
          date: booking.date,
          time: booking.time,
          slot: formatTime24(booking.timeSlot.startTime),
          partySize: booking.partySize,
          depositRequired: booking.depositAmountPence > 0,
          depositAmountPence: booking.depositAmountPence,
          addOns: booking.addOns.map((ba) => ({
            name: ba.addOn.name,
            pricePence: ba.addOn.pricePence,
          })),
          manageUrl,
        }),
        sendAdminNewBooking({
          confirmationCode: booking.confirmationCode,
          guestName: booking.guest.name,
          guestEmail: booking.guest.email,
          location: booking.location.name,
          date: booking.date,
          slot: formatTime24(booking.timeSlot.startTime),
          partySize: booking.partySize,
          depositRequired: booking.depositAmountPence > 0,
          source: booking.source,
        }),
      ]);

      console.log(`[Stripe Webhook] Booking ${booking.confirmationCode} confirmed & emails sent`);
    } catch (error) {
      console.error("[Stripe Webhook] Failed to process booking:", error);
    }
  }

  // ─── Handle checkout.session.expired (user didn't pay in time) ───
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      console.log(`[Stripe Webhook] Checkout expired for booking ${bookingId}`);

      try {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "cancelled_guest",
            depositStatus: "none",
          },
        });

        await prisma.bookingChange.create({
          data: {
            bookingId,
            changedBy: "stripe_webhook",
            fieldChanged: "status",
            oldValue: "pending_payment",
            newValue: "cancelled_guest",
          },
        });

        console.log(`[Stripe Webhook] Booking ${bookingId} auto-cancelled (payment expired)`);
      } catch (error) {
        console.error("[Stripe Webhook] Failed to cancel expired booking:", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
