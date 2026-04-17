"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function formatDateLong(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

type BookingData = {
  confirmationCode: string;
  location: string;
  date: string;
  time: string;
  slot: string;
  partySize: number;
  status: string;
  depositAmountPence: number;
  addOns: { name: string; pricePence: number; quantity: number }[];
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const token = searchParams.get("token");

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBooking = useCallback(async () => {
    if (!code || !token) {
      setError("Invalid link.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/bookings?code=${code}&token=${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Booking not found");
      } else {
        setBooking(data.booking);
      }
    } catch {
      setError("Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [code, token]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-gold-300/30 border-t-gold-300 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-stone-500 mt-4">Loading your booking...</p>
      </div>
    );
  }

  if (error) {
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

  const totalPence =
    booking.addOns.reduce((sum, a) => sum + a.pricePence * a.quantity, 0) +
    booking.depositAmountPence;

  return (
    <div className="text-center">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">✓</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Payment Successful!</h2>
      <p className="text-sm text-stone-400 mb-2">
        Your booking is confirmed. A confirmation email is on its way.
      </p>
      <p className="text-xs text-stone-500 mb-8">
        {totalPence > 0 && (
          <span className="text-gold-300 font-semibold">{formatPence(totalPence)} paid</span>
        )}
      </p>

      {/* Booking summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#222] p-6 text-left max-w-sm mx-auto">
        <div className="mb-4">
          <p className="text-xs text-stone-500 uppercase tracking-wider">Confirmation Code</p>
          <p className="text-xl font-bold text-gold-300 mt-1">{booking.confirmationCode}</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-400">Location</span>
            <span className="text-white font-medium">{booking.location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Date</span>
            <span className="text-white font-medium">{formatDateLong(booking.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Time</span>
            <span className="text-white font-medium">{booking.slot}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Guests</span>
            <span className="text-white font-medium">{booking.partySize}</span>
          </div>
          {booking.addOns.length > 0 && (
            <>
              <div className="border-t border-white/[0.06] mt-3 pt-3">
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Add-ons</p>
                {booking.addOns.map((a, i) => (
                  <div key={i} className="flex justify-between mb-1">
                    <span className="text-stone-400">{a.name}</span>
                    <span className="text-gold-300 font-medium">{formatPence(a.pricePence)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {booking.depositAmountPence > 0 && (
            <div className="flex justify-between border-t border-white/[0.06] pt-3 mt-3">
              <span className="text-stone-400">Hold Fee</span>
              <span className="text-gold-300 font-medium">
                {formatPence(booking.depositAmountPence)}
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-stone-500">
        Need to change something?{" "}
        <Link
          href={`/booking/manage?code=${code}&token=${token}`}
          className="text-gold-300 hover:underline"
        >
          Manage your booking
        </Link>
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

export default function BookingSuccessPage() {
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
              <SuccessContent />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  );
}
