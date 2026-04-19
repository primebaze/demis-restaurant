import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Buffet | Demi's Restaurant — Nigerian Buffet Catering London",
  description:
    "Book a Nigerian buffet for your event at Demi's Restaurant. Jollof rice, chicken, suya, pounded yam, small chops and more. From £40 per person. Cricklewood, London.",
  keywords: [
    "Nigerian buffet London",
    "buffet catering London",
    "Nigerian party food",
    "jollof rice buffet",
    "African buffet London",
    "Demi's buffet",
    "event catering NW2",
  ],
  openGraph: {
    title: "Buffet Booking | Demi's Restaurant",
    description:
      "Nigerian buffet for events — jollof rice, chicken, suya, pounded yam, small chops and more. From £40pp.",
  },
  alternates: {
    canonical: "https://demisrestaurant.co.uk/buffet",
  },
};

/* ─── Data ─── */
const SMALL_CHOPS = ["Puff Puff", "Samosa", "Spring Rolls"];

const MAINS = [
  "Jollof Rice",
  "Chicken",
  "Fried Fish",
  "Plantain",
  "Fried Rice",
  "Beef",
  "Salad",
  "Pounded Yam + Eforiro / Egusi",
];

const LIMITED_ITEMS = [
  { name: "White Rice + Ayamase", price: "£100 half tray" },
  { name: "Moimoi", price: "£50 / 20" },
  { name: "Yam Porridge", price: "£70 half tray" },
  { name: "Goat Assorted Meat Peppersoup", price: "£50 half tray" },
  { name: "Gizdodo", price: "£50 half tray" },
  { name: "Grilled Tilapia", price: "£100 / 10" },
];

export default function BuffetPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden px-6 pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-[#1a1a1a] to-[#111]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(232,204,156,0.4) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p className="section-label">Demi&apos;s Nigerian Restaurant</p>
          <h1 className="mt-4 heading-display">
            Buffet Booking
          </h1>
          <p className="mt-4 body-text max-w-xl mx-auto">
            Celebrate with bold Nigerian flavours. Our buffet is perfect for parties,
            private events and gatherings — all prepared fresh by our kitchen.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:02039046977"
              className="btn-gold px-8 py-3 text-sm"
            >
              Call to Book: 020 3904 6977
            </a>
            <a
              href="mailto:bookings@demisrestaurant.co.uk"
              className="btn-outline-white px-8 py-3 text-sm"
            >
              Email Bookings
            </a>
          </div>
        </div>
      </section>

      {/* ─── BUFFET MENU ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Small Chops */}
            <div className="card-dark">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gold-300/10">
                  <span className="text-xl">🍢</span>
                </span>
                <h2 className="text-xl font-bold text-white">Small Chops</h2>
              </div>
              <ul className="space-y-3">
                {SMALL_CHOPS.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-stone-300 text-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-300/60 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mains */}
            <div className="card-dark">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gold-300/10">
                  <span className="text-xl">🍛</span>
                </span>
                <h2 className="text-xl font-bold text-white">Mains</h2>
              </div>
              <ul className="space-y-3">
                {MAINS.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-stone-300 text-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-300/60 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Limited Buffet Items */}
          <div className="mt-6 card-dark">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gold-300/10">
                <span className="text-xl">⭐</span>
              </span>
              <h2 className="text-xl font-bold text-white">Limited Buffet Items</h2>
            </div>
            <p className="text-xs text-gold-300 font-semibold tracking-wide uppercase mb-6">
              Please choose one from the limited buffet items
            </p>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {LIMITED_ITEMS.map((item) => (
                <div
                  key={item.name}
                  className="flex items-baseline justify-between gap-3 py-2.5 border-b border-white/[0.06] last:border-0"
                >
                  <span className="text-sm text-stone-300 font-medium">{item.name}</span>
                  <span className="text-gold-300 font-semibold text-sm tabular-nums shrink-0">
                    {item.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── IMPORTANT NOTICES ─── */}
      <section className="py-16 sm:py-24 bg-[#111]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="section-label">Important Info</p>
            <h2 className="mt-3 heading-lg">Booking Details</h2>
          </div>

          <div className="space-y-6">
            {/* Price */}
            <div className="rounded-2xl border border-gold-300/20 bg-gold-300/[0.04] p-6 sm:p-8 text-center">
              <p className="text-3xl sm:text-4xl font-bold text-gold-300">£40</p>
              <p className="mt-1 text-sm text-stone-400">per person</p>
              <p className="mt-2 text-sm text-stone-500">
                + £5 for Drinks <span className="text-stone-600">(Still water, Coke, Fanta &amp; Malt)</span>
              </p>
            </div>

            {/* No takeaway */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center">
              <p className="text-lg font-bold text-red-400">⚠️ Please NOTE — NO TAKEAWAY!</p>
              <p className="mt-2 text-sm text-stone-500">
                Food will be out for 2 hours from when you are ready to eat.
              </p>
            </div>

            {/* Deposit & Payment */}
            <div className="card-dark space-y-5">
              <h3 className="text-lg font-bold text-white">Deposit &amp; Payment</h3>

              <div className="space-y-3 text-sm text-stone-400 leading-relaxed">
                <p>
                  A <span className="text-gold-300 font-semibold">£100 deposit</span> is required
                  for booking, which will be refunded after the event.
                </p>
                <p>
                  If cancelled, the deposit must be spent at the restaurant and will not be refunded.
                </p>
                <p>
                  We expect the <span className="text-white font-medium">full payment</span> for the event
                  to be made <span className="text-white font-medium">latest 3 days before</span> the event.
                </p>
              </div>

              {/* Bank details */}
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-5">
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-gold-300/70 mb-3">
                  Bank Details
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Account Name</span>
                    <span className="text-white font-medium">DEMI&apos;S Restaurant and Bar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Sort Code</span>
                    <span className="text-white font-medium font-mono">04-00-04</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Account No.</span>
                    <span className="text-white font-medium font-mono">96687466</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Deposit</span>
                    <span className="text-gold-300 font-semibold">£100</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-500 leading-relaxed">
                Please call us or email when payment has been made, using your <strong className="text-stone-400">name</strong> and{" "}
                <strong className="text-stone-400">date of booking</strong> as reference.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTACT CTA ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <p className="section-label">Get in Touch</p>
          <h2 className="mt-3 heading-lg">Ready to Book?</h2>
          <p className="mt-4 body-text max-w-md mx-auto">
            Contact us to arrange your buffet. We&apos;ll help you plan the perfect event.
          </p>
          <p className="mt-2 text-sm text-stone-500 italic">Regards, Demi</p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:02039046977"
              className="btn-gold px-8 py-3 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              020 3904 6977
            </a>
            <a
              href="mailto:bookings@demisrestaurant.co.uk"
              className="btn-outline-white px-8 py-3 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              bookings@demisrestaurant.co.uk
            </a>
          </div>

          <div className="mt-10">
            <Link
              href="/contact"
              className="text-sm text-gold-300 hover:text-gold-200 font-medium transition-colors"
            >
              Visit Contact Page &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
