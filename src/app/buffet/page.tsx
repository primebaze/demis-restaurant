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
    canonical: "https://www.demisrestaurant.co.uk/buffet",
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
            private events and gatherings — all prepared fresh by our kitchen. Choose
            your date, party size and location, and our team will tailor the spread to
            suit your occasion.
          </p>
          <p className="mt-4 text-sm text-stone-400 max-w-xl mx-auto">
            Please note: this is a <span className="text-gold-300">private buffet booking</span> for
            your own event — it&apos;s separate from our weekly all-you-can-eat
            <span className="text-gold-300"> Sunday Buffet</span> at the Streatham Hill branch.
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
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Section header */}
          <div className="text-center mb-14">
            <p className="section-label">What&apos;s Included</p>
            <h2 className="mt-3 heading-lg">Your Buffet Spread</h2>
            <p className="mt-3 body-text max-w-lg mx-auto text-sm">
              Every booking includes a generous selection of small chops and mains,
              freshly prepared by our kitchen.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Small Chops */}
            <div className="group relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-8 sm:p-10 transition-all duration-300 hover:border-gold-300/20">
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">
                Starters
              </p>
              <h3 className="text-2xl font-bold text-white mb-8">Small Chops</h3>
              <ul className="space-y-4">
                {SMALL_CHOPS.map((item) => (
                  <li key={item} className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gold-300/[0.08] text-gold-300 text-xs font-bold shrink-0">
                      ✦
                    </span>
                    <span className="text-[15px] text-stone-300 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mains */}
            <div className="group relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-8 sm:p-10 transition-all duration-300 hover:border-gold-300/20">
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">
                Main Courses
              </p>
              <h3 className="text-2xl font-bold text-white mb-8">Mains</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {MAINS.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gold-300/[0.08] text-gold-300 text-xs font-bold shrink-0">
                      ✦
                    </span>
                    <span className="text-[15px] text-stone-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Limited Buffet Items */}
          <div className="mt-12 relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-300/30 to-transparent" />

            <div className="p-8 sm:p-10 pb-0 sm:pb-0">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-2">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">
                    Add-Ons
                  </p>
                  <h3 className="text-2xl font-bold text-white">Limited Buffet Items</h3>
                </div>
              </div>
              <p className="inline-block mt-3 text-xs font-semibold tracking-wide uppercase text-gold-300/80 bg-gold-300/[0.08] rounded-full px-4 py-1.5">
                Choose one from the items below
              </p>
            </div>

            <div className="px-8 sm:px-10 pt-8 pb-8 sm:pb-10">
              <div className="grid sm:grid-cols-2 gap-x-10">
                {LIMITED_ITEMS.map((item, i) => (
                  <div
                    key={item.name}
                    className={`flex items-baseline justify-between gap-4 py-4 ${
                      i < LIMITED_ITEMS.length - (LIMITED_ITEMS.length % 2 === 0 ? 2 : 1)
                        ? "border-b border-white/[0.06]"
                        : ""
                    }`}
                  >
                    <span className="text-[15px] text-stone-300">{item.name}</span>
                    <span className="text-sm text-gold-300 font-semibold tabular-nums whitespace-nowrap shrink-0">
                      {item.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── IMPORTANT NOTICES ─── */}
      <section className="py-20 sm:py-28 bg-[#111]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="section-label">Important Info</p>
            <h2 className="mt-3 heading-lg">Booking Details</h2>
          </div>

          {/* Pricing strip */}
          <div className="grid sm:grid-cols-2 gap-5 mb-8">
            <div className="relative rounded-2xl border border-gold-300/15 bg-gradient-to-br from-gold-300/[0.06] to-transparent p-8 text-center overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-300/40 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-4">Per Person</p>
              <p className="text-5xl font-bold text-gold-300 leading-none">£40</p>
              <p className="mt-3 text-sm text-stone-500">All food included</p>
            </div>
            <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-8 text-center overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-stone-500 mb-4">Drinks Package</p>
              <p className="text-5xl font-bold text-white leading-none">+£5</p>
              <p className="mt-3 text-sm text-stone-500">Still water, Coke, Fanta &amp; Malt</p>
            </div>
          </div>

          {/* No takeaway */}
          <div className="relative rounded-2xl border border-red-500/15 bg-red-500/[0.03] p-5 sm:p-6 mb-8 flex items-start gap-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 text-red-400 text-lg shrink-0 mt-0.5">!</span>
            <div>
              <p className="text-[15px] font-bold text-red-400">No Takeaway Allowed</p>
              <p className="mt-1 text-sm text-stone-500 leading-relaxed">
                Food will be out for 2 hours from when you are ready to eat. All food must be consumed on-site.
              </p>
            </div>
          </div>

          {/* Deposit & Payment */}
          <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-300/30 to-transparent" />

            <div className="p-8 sm:p-10">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">Payment Information</p>
              <h3 className="text-2xl font-bold text-white mb-8">Deposit &amp; Payment</h3>

              {/* Steps */}
              <div className="space-y-6 mb-10">
                {[
                  {
                    step: "01",
                    title: "Secure your booking",
                    desc: (
                      <>
                        A <span className="text-gold-300 font-semibold">£100 deposit</span> is required to confirm your booking. This will be refunded after the event.
                      </>
                    ),
                  },
                  {
                    step: "02",
                    title: "Cancellation policy",
                    desc: "If cancelled, the deposit must be spent at the restaurant and will not be refunded.",
                  },
                  {
                    step: "03",
                    title: "Final payment",
                    desc: (
                      <>
                        We expect <span className="text-white font-semibold">full payment</span> to be made{" "}
                        <span className="text-white font-semibold">at least 3 days before</span> the event.
                      </>
                    ),
                  },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-5">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-300/[0.08] text-gold-300 text-xs font-bold tracking-wider shrink-0">
                      {step}
                    </span>
                    <div className="pt-0.5">
                      <p className="text-[15px] font-semibold text-white">{title}</p>
                      <p className="mt-1 text-sm text-stone-400 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bank details */}
              <div className="rounded-xl bg-[#1a1a1a] border border-white/[0.06] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/70">
                    Bank Details
                  </p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {[
                    { label: "Account Name", value: "DEMI'S Restaurant and Bar", mono: false },
                    { label: "Sort Code", value: "04-00-04", mono: true },
                    { label: "Account No.", value: "96687466", mono: true },
                    { label: "Deposit", value: "£100", mono: false, highlight: true },
                  ].map(({ label, value, mono, highlight }) => (
                    <div key={label} className="flex items-center justify-between px-6 py-3.5">
                      <span className="text-sm text-stone-500">{label}</span>
                      <span
                        className={`text-sm font-semibold ${
                          highlight
                            ? "text-gold-300"
                            : "text-white"
                        } ${mono ? "font-mono tracking-wide" : ""}`}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-6 text-sm text-stone-500 leading-relaxed">
                Please call us or email when payment has been made, using your{" "}
                <span className="text-stone-300 font-medium">name</span> and{" "}
                <span className="text-stone-300 font-medium">date of booking</span> as reference.
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
