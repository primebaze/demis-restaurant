"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PayContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#222] border border-white/[0.06] rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">💳</div>
        <h1 className="text-xl font-bold text-white mb-2">Deposit Payment</h1>
        <p className="text-stone-400 text-sm mb-6">
          Booking: <span className="text-gold-300 font-mono">{code || "—"}</span>
        </p>

        <div className="bg-[#1a1a1a] rounded-xl p-6 mb-6">
          <p className="text-stone-400 text-sm mb-2">Deposit amount</p>
          <p className="text-3xl font-bold text-gold-300">£20.00</p>
          <p className="text-xs text-stone-500 mt-2">
            This is a hold fee only — it will be released after your visit.
          </p>
        </div>

        <p className="text-stone-500 text-xs">
          Stripe payment integration coming soon. Your booking is held for 30 minutes
          while the deposit is pending.
        </p>

        {/* TODO: Mount Stripe Elements here when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set */}
      </div>
    </div>
  );
}

export default function BookingPayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1a1a1a]" />}>
      <PayContent />
    </Suspense>
  );
}
