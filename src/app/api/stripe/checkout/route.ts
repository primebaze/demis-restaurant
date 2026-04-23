import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" })
  : null;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * POST /api/stripe/checkout — Create a Stripe Checkout Session for a pending booking.
 * Body: { bookingId }
 */
export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment system is not configured" },
        { status: 500 }
      );
    }

    const { bookingId, confirmationCode } = await req.json();

    if (!bookingId && !confirmationCode) {
      return NextResponse.json({ error: "Missing booking identifier" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: confirmationCode
        ? { confirmationCode }
        : { id: bookingId },
      include: {
        location: true,
        guest: true,
        addOns: { include: { addOn: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "pending_payment") {
      return NextResponse.json(
        { error: "Booking is not pending payment" },
        { status: 400 }
      );
    }

    // ─── Build line items ───
    const lineItems: {
      price_data: { currency: string; unit_amount: number; product_data: { name: string; description?: string } };
      quantity: number;
    }[] = [];

    // Add-ons
    for (const ba of booking.addOns) {
      lineItems.push({
        price_data: {
          currency: "gbp",
          unit_amount: ba.addOn.pricePence,
          product_data: {
            name: ba.addOn.name,
            description: ba.addOn.description || undefined,
          },
        },
        quantity: ba.quantity,
      });
    }

    // Deposit (if applicable)
    if (booking.depositAmountPence > 0) {
      lineItems.push({
        price_data: {
          currency: "gbp",
          unit_amount: booking.depositAmountPence,
          product_data: {
            name: "Booking Hold Fee",
            description: `Refundable deposit for ${booking.partySize} guests. Released after your visit or if cancelled ${24}+ hours in advance.`,
          },
        },
        quantity: 1,
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: "No payable items on this booking" },
        { status: 400 }
      );
    }

    // ─── Create Checkout Session ───
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.guest.email,
      line_items: lineItems,
      metadata: {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        type: "booking_payment",
      },
      success_url: `${SITE_URL}/booking/success?code=${booking.confirmationCode}&token=${booking.managementToken}`,
      cancel_url: `${SITE_URL}/booking/pay?code=${booking.confirmationCode}&cancelled=true`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    // Store payment intent ID (or session ID as fallback) for later capture/refund
    await prisma.booking.update({
      where: { id: booking.id },
      data: { stripePaymentIntentId: (session.payment_intent as string) || session.id },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    );
  }
}
