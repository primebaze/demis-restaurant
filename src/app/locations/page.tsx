import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Locations | Demi's Restaurant",
  description:
    "Find Demi's Nigerian Restaurant in London. Two locations — Cricklewood Broadway (NW2) and Streatham Hill (SW2). Dine in, book a table, or order takeaway.",
  alternates: {
    canonical: "https://www.demisrestaurant.co.uk/locations",
  },
};

const LOCATIONS = [
  {
    name: "Cricklewood Broadway",
    area: "North West London",
    address: "89 Cricklewood Broadway",
    city: "London, NW2 3JG",
    href: "/locations/cricklewood",
    badge: "Flagship",
  },
  {
    name: "Streatham Hill",
    area: "South London",
    address: "345 Streatham High Road",
    city: "London, SW16 3NJ",
    href: "/locations/streatham",
    badge: null,
  },
];

export default function LocationsPage() {
  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24">
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
          <p className="section-label">Find Us</p>
          <h1 className="mt-4 heading-display">Our Locations</h1>
          <p className="mt-4 body-text max-w-xl mx-auto">
            Two restaurants across London — both serving the same bold Nigerian flavours,
            fresh from our kitchen.
          </p>
        </div>
      </section>

      {/* ─── Location cards ─── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
          {LOCATIONS.map((loc) => (
            <Link
              key={loc.href}
              href={loc.href}
              className="group relative rounded-[1.75rem] border border-white/[0.08] bg-white/[0.03] p-8 flex flex-col gap-5 hover:border-gold-300/30 hover:bg-white/[0.05] transition-all duration-300"
            >
              {loc.badge && (
                <span className="self-start text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-300 border border-gold-300/30 rounded-full px-3 py-1">
                  {loc.badge}
                </span>
              )}
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white italic tracking-tight">
                  {loc.name}
                </h2>
                <p className="mt-1 text-sm text-stone-500">{loc.area}</p>
              </div>
              <div className="mt-auto text-[14px] text-stone-400 leading-relaxed">
                <p>{loc.address}</p>
                <p>{loc.city}</p>
              </div>
              <span className="flex items-center gap-2 text-sm font-semibold text-gold-300 group-hover:gap-3 transition-all duration-200">
                View location
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-6 py-16 sm:py-24 border-t border-white/[0.06]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="heading-lg">Ready to visit?</h2>
          <p className="mt-3 body-text">Book a table at either location in advance.</p>
          <div className="mt-8">
            <Link href="/booking" className="btn-gold text-sm">
              Book a Table
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
