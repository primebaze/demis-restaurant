import type { Metadata } from "next";
import BookingWidget from "@/components/BookingWidget";

export const metadata: Metadata = {
  title: "Book a Table | Demi's Restaurant",
  description:
    "Reserve your table at Demi's Nigerian Restaurant. Choose from our Cricklewood or Streatham Hill locations, pick your date and time, and confirm your booking in seconds.",
};

export default function BookingPage() {
  return (
    <>
      {/* ─── Hero ─── */}
      <section className="pt-20 pb-10 sm:pt-28 sm:pb-14">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gold-300">
            Reservations
          </p>
          <h1 className="mt-3 text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Book a Table
          </h1>
          <p className="mt-4 text-sm text-stone-400 max-w-md mx-auto">
            Reserve your spot at Demi&apos;s. Choose your location, pick a date, and
            we&apos;ll take care of the rest.
          </p>
        </div>
      </section>

      {/* ─── Booking Widget ─── */}
      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="rounded-3xl border border-white/[0.06] bg-[#1f1f1f] p-6 sm:p-10">
            <BookingWidget />
          </div>

          {/* Policies */}
          <div className="mt-8 text-center">
            <p className="text-xs text-stone-500 leading-relaxed max-w-md mx-auto">
              Parties of 15 or more require a £20 hold fee, refundable if
              cancelled 24+ hours before your booking. For large events or
              private hire, please{" "}
              <a href="/contact" className="text-gold-300 hover:underline">
                contact us directly
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
