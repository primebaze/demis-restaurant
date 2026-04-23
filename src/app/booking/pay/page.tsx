"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type AddOn = { name: string; pricePence: number; quantity: number };

type BookingInfo = {
  confirmationCode: string;
  status: string;
  depositAmountPence: number;
  location: string;
  date: string;
  partySize: number;
  addOns: AddOn[];
};

function formatPence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

function PayContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const cancelled = searchParams.get("cancelled") === "true";

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const fetchBooking = useCallback(async () => {
    if (!code) {
      setError("No booking code provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${code}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Booking not found.");
      } else {
        setBooking(data.booking);
      }
    } catch {
      setError("Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  async function handlePay() {
    if (!booking) return;
    setPaying(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationCode: booking.confirmationCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start payment.");
        setPaying(false);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-gold-300/30 border-t-gold-300 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-stone-500 mt-4">Loading booking...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 text-sm">{error}</p>
        <Link href="/booking" className="mt-4 inline-block text-sm text-gold-300 hover:underline">
          Make a new booking →
        </Link>
      </div>
    );
  }

  if (!booking) return null;

  const hasDeposit = booking.depositAmountPence > 0;
  const hasAddOns = booking.addOns.length > 0;
  const addOnsTotal = booking.addOns.reduce((sum, a) => sum + a.pricePence * a.quantity, 0);
  const totalPence = booking.depositAmountPence + addOnsTotal;

  const isExpired = booking.status === "cancelled_guest" || booking.status === "cancelled_admin";
  const isConfirmed = booking.status === "confirmed";
  const canPay = booking.status === "pending_payment";

  return (
    <div className="text-center">
      {cancelled && canPay && (
        <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
          <p className="text-sm text-amber-300">
            Payment was cancelled. You can try again below.
          </p>
        </div>
      )}

      {isConfirmed && (
        <div className="mb-6 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
          <p className="text-sm text-green-300">
            This booking is already confirmed. No payment needed.
          </p>
        </div>
      )}

      {isExpired && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-300">
            This booking has been cancelled. Please make a new reservation.
          </p>
        </div>
      )}

      <div className="text-5xl mb-4">💳</div>
      <h1 className="text-2xl font-bold text-white mb-2">Complete Payment</h1>
      <p className="text-stone-400 text-sm mb-6">
        Booking: <span className="text-gold-300 font-mono">{booking.confirmationCode}</span>
      </p>

      <div className="bg-[#1a1a1a] rounded-xl p-6 mb-6 text-left">
        <p className="text-white font-medium text-sm">{booking.location}</p>
        <p className="text-stone-500 text-xs mt-1 mb-5">
          {new Date(booking.date + "T12:00:00").toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })} · {booking.partySize} guests
        </p>

        {hasAddOns && (
          <div className="mb-4">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Add-ons</p>
            {booking.addOns.map((a, i) => (
              <div key={i} className="flex justify-between text-sm mb-1.5">
                <span className="text-stone-400">
                  {a.name}{a.quantity > 1 ? ` × ${a.quantity}` : ""}
                </span>
                <span className="text-white font-medium">
                  {formatPence(a.pricePence * a.quantity)}
                </span>
              </div>
            ))}
          </div>
        )}

        {hasDeposit && (
          <div className={hasAddOns ? "border-t border-white/[0.06] pt-4 mb-4" : "mb-4"}>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Refundable hold fee</span>
              <span className="text-white font-medium">
                {formatPence(booking.depositAmountPence)}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Released after your visit or if cancelled 24+ hours in advance.
            </p>
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-4 flex justify-between items-center">
          <span className="text-stone-400 text-sm font-medium">Total</span>
          <span className="text-2xl font-bold text-gold-300">{formatPence(totalPence)}</span>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      {canPay && totalPence > 0 && (
        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full rounded-full bg-gold-300 px-8 py-3.5 text-sm font-bold text-[#1a1a1a] hover:bg-gold-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying ? "Redirecting to payment..." : `Pay ${formatPence(totalPence)}`}
        </button>
      )}

      {canPay && totalPence === 0 && (
        <p className="text-stone-400 text-sm">No payment required for this booking.</p>
      )}

      {isExpired && (
        <Link
          href="/booking"
          className="inline-block w-full rounded-full bg-gold-300 px-8 py-3.5 text-sm font-bold text-[#1a1a1a] hover:bg-gold-200 transition-all"
        >
          Make a New Booking
        </Link>
      )}

      <p className="mt-4 text-xs text-stone-500">
        Your booking is held for 30 minutes while payment is pending.
      </p>

      <Link
        href="/"
        className="mt-6 inline-block text-sm text-stone-500 hover:text-white transition-colors"
      >
        ← Back to homepage
      </Link>
    </div>
  );
}

export default function BookingPayPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <div className="rounded-3xl border border-white/[0.06] bg-[#1f1f1f] p-6 sm:p-10">
            <Suspense
              fallback={
                <div className="text-center py-16">
                  <div className="w-8 h-8 border-2 border-gold-300/30 border-t-gold-300 rounded-full animate-spin mx-auto" />
                </div>
              }
            >
              <PayContent />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  );
}
