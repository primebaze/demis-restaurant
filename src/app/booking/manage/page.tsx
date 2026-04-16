"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type BookingData = {
  confirmationCode: string;
  location: string;
  locationSlug: string;
  date: string;
  time: string;
  slot: string;
  partySize: number;
  status: string;
  notes: string;
  guest: { name: string; email: string; phone: string | null };
  depositAmountPence: number;
  depositStatus: string;
  addOns: { name: string; pricePence: number; quantity: number }[];
  createdAt: string;
};

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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  pending_payment: { label: "Awaiting Payment", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  modified: { label: "Modified", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  cancelled_guest: { label: "Cancelled", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  cancelled_admin: { label: "Cancelled by Restaurant", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  no_show: { label: "No Show", color: "text-stone-400 bg-stone-400/10 border-stone-400/20" },
  completed: { label: "Completed", color: "text-stone-400 bg-stone-400/10 border-stone-400/20" },
};

function ManageContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const token = searchParams.get("token");

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBooking = useCallback(async () => {
    if (!code || !token) {
      setError("Invalid link. Please use the link from your confirmation email.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/bookings?code=${code}&token=${token}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Booking not found");
        setLoading(false);
        return;
      }

      setBooking(data.booking);
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
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-gold-300/30 border-t-gold-300 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-stone-500 mt-4">Loading your booking...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-sm">{error}</p>
        <Link href="/booking" className="mt-4 inline-block text-sm text-gold-300 hover:underline">
          Make a new booking →
        </Link>
      </div>
    );
  }

  if (!booking) return null;

  const status = STATUS_LABELS[booking.status] || { label: booking.status, color: "text-stone-400" };
  const isActive = ["confirmed", "pending_payment", "modified"].includes(booking.status);

  return (
    <div>
      {/* Status badge */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider">Confirmation Code</p>
          <p className="text-2xl font-bold text-gold-300">{booking.confirmationCode}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Booking details */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#222] divide-y divide-white/[0.04]">
        <div className="p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Location</p>
          <p className="text-sm font-semibold text-white">{booking.location}</p>
        </div>
        <div className="p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Date &amp; Time</p>
          <p className="text-sm font-semibold text-white">{formatDateLong(booking.date)}</p>
          <p className="text-xs text-stone-400">{booking.slot}</p>
        </div>
        <div className="p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Party Size</p>
          <p className="text-sm font-semibold text-white">
            {booking.partySize} {booking.partySize === 1 ? "guest" : "guests"}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Booked By</p>
          <p className="text-sm font-semibold text-white">{booking.guest.name}</p>
          <p className="text-xs text-stone-400">{booking.guest.email}</p>
          {booking.guest.phone && <p className="text-xs text-stone-400">{booking.guest.phone}</p>}
        </div>
        {booking.notes && (
          <div className="p-5">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-stone-300">{booking.notes}</p>
          </div>
        )}
        {booking.addOns.length > 0 && (
          <div className="p-5">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Add-ons</p>
            {booking.addOns.map((a, i) => (
              <div key={i} className="flex items-center justify-between mb-1">
                <span className="text-sm text-stone-300">{a.name}</span>
                <span className="text-sm font-semibold text-gold-300">{formatPence(a.pricePence)}</span>
              </div>
            ))}
          </div>
        )}
        {booking.depositAmountPence > 0 && (
          <div className="p-5 bg-gold-300/5">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Hold Fee</p>
            <p className="text-sm font-bold text-gold-300">{formatPence(booking.depositAmountPence)}</p>
            <p className="text-xs text-stone-400 capitalize">Status: {booking.depositStatus}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {isActive && (
        <p className="mt-6 text-center text-xs text-stone-500">
          Need to cancel?{" "}
          <Link href="/contact" className="text-gold-300 hover:underline">Contact us</Link> or call{" "}
          <a href="tel:02039046977" className="text-gold-300 hover:underline">020 3904 6977</a>
        </p>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-900/20 border border-red-800/30 text-sm text-red-300">
          {error}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-stone-500">
        Need help? <Link href="/contact" className="text-gold-300 hover:underline">Contact us</Link> or call{" "}
        <a href="tel:02039046977" className="text-gold-300 hover:underline">020 3904 6977</a>
      </p>
    </div>
  );
}

import { Suspense } from "react";

export default function ManageBookingPage() {
  return (
    <>
      <section className="pt-20 pb-10 sm:pt-28 sm:pb-14">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gold-300">
            Your Booking
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Manage Reservation
          </h1>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <div className="rounded-3xl border border-white/[0.06] bg-[#1f1f1f] p-6 sm:p-8">
            <Suspense fallback={<div className="text-center py-12"><div className="w-8 h-8 border-2 border-gold-300/30 border-t-gold-300 rounded-full animate-spin mx-auto" /></div>}>
              <ManageContent />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
