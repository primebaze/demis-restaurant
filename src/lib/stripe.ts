import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" })
  : null;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Create a PaymentIntent for a booking deposit (hold/capture pattern).
 * Uses manual capture so the deposit can be released (cancelled) or captured (no-show).
 */
export async function createDepositIntent(data: {
  bookingId: string;
  confirmationCode: string;
  amountPence: number;
  guestEmail: string;
  guestName: string;
  description: string;
}): Promise<{
  paymentIntentId: string;
  clientSecret: string;
  paymentUrl: string;
} | null> {
  if (!stripe) {
    console.log(
      `[Stripe] Skipped (no STRIPE_SECRET_KEY): Deposit for ${data.confirmationCode} — ${data.amountPence}p`
    );
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amountPence,
      currency: "gbp",
      capture_method: "manual", // hold — capture later on no-show
      receipt_email: data.guestEmail,
      description: data.description,
      metadata: {
        bookingId: data.bookingId,
        confirmationCode: data.confirmationCode,
        guestName: data.guestName,
        type: "booking_deposit",
      },
    });

    console.log(
      `[Stripe] Created PaymentIntent ${paymentIntent.id} for ${data.confirmationCode} — ${data.amountPence}p`
    );

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      paymentUrl: `${SITE_URL}/booking/pay?code=${data.confirmationCode}&pi=${paymentIntent.id}`,
    };
  } catch (error) {
    console.error(`[Stripe] Failed to create PaymentIntent for ${data.confirmationCode}:`, error);
    return null;
  }
}

/**
 * Capture a held deposit (e.g., on no-show).
 */
export async function captureDeposit(paymentIntentId: string): Promise<boolean> {
  if (!stripe) {
    console.log(`[Stripe] Skipped capture (no STRIPE_SECRET_KEY): ${paymentIntentId}`);
    return false;
  }

  try {
    await stripe.paymentIntents.capture(paymentIntentId);
    console.log(`[Stripe] Captured: ${paymentIntentId}`);
    return true;
  } catch (error) {
    console.error(`[Stripe] Failed to capture ${paymentIntentId}:`, error);
    return false;
  }
}

/**
 * Cancel (release) a held deposit (e.g., guest cancels within window, or booking completed).
 */
export async function cancelDeposit(paymentIntentId: string): Promise<boolean> {
  if (!stripe) {
    console.log(`[Stripe] Skipped cancel (no STRIPE_SECRET_KEY): ${paymentIntentId}`);
    return false;
  }

  try {
    await stripe.paymentIntents.cancel(paymentIntentId);
    console.log(`[Stripe] Cancelled (released hold): ${paymentIntentId}`);
    return true;
  } catch (error) {
    console.error(`[Stripe] Failed to cancel ${paymentIntentId}:`, error);
    return false;
  }
}

/**
 * Refund a captured deposit.
 */
export async function refundDeposit(paymentIntentId: string): Promise<boolean> {
  if (!stripe) {
    console.log(`[Stripe] Skipped refund (no STRIPE_SECRET_KEY): ${paymentIntentId}`);
    return false;
  }

  try {
    await stripe.refunds.create({ payment_intent: paymentIntentId });
    console.log(`[Stripe] Refunded: ${paymentIntentId}`);
    return true;
  } catch (error) {
    console.error(`[Stripe] Failed to refund ${paymentIntentId}:`, error);
    return false;
  }
}
