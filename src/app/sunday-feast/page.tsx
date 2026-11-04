import type { Metadata } from "next";
import Image from "next/image";
import { FeastBooking } from "./FeastBooking";

export const metadata: Metadata = {
  title: "Sunday Feast | Demi's Restaurant Cricklewood",
  description:
    "Sunday Feast at Demi's Cricklewood. Two or more people? Get all five dishes on the menu to share at your table for £30 per person, with one winter warmer drink each.",
  alternates: { canonical: "https://www.demisrestaurant.co.uk/sunday-feast" },
  openGraph: {
    title: "Sunday Feast at Demi's, Cricklewood",
    description: "A three course feast to share. £30 per person for two or more.",
    url: "https://www.demisrestaurant.co.uk/sunday-feast",
    images: [{ url: "https://www.demisrestaurant.co.uk/feast/oct-2.webp" }],
  },
};

export const dynamic = "force-dynamic";

// The menu, as printed on the Sunday Feast card.
const APPETISERS = ["Puff Puff", "Meat Pie", "Fish Roll"];

const STARTERS = [
  { name: "Pepper Soup", note: "A fiery, aromatic spiced broth with goat meat or fish." },
  { name: "Moi Moi (V)", note: "Silky steamed bean pudding with sweet peppers and onion." },
  { name: "House Salad", note: "Crisp, fresh garden leaves with our house dressing." },
];

const FEAST = [
  { name: "Whole Rotisserie Chicken", note: "Rubbed in our house spice blend and slow-roasted until golden." },
  { name: "Whole Grilled Fish", note: "Peppered, spiced and grilled until the skin crackles and the flesh falls off the bone." },
];

const WARMERS = [
  { name: "Mulled Wine", price: "3.25" },
  { name: "Ginger Tea", price: "2.50" },
  { name: "Mint Tea", price: "2.50" },
];

const GALLERY = [
  { src: "/feast/oct-51.webp", alt: "Sauce being poured over a whole rotisserie chicken", tall: true },
  { src: "/feast/oct-10.webp", alt: "Puff puff, moi moi and pepper sauce on the table" },
  { src: "/feast/oct-12.webp", alt: "Jollof rice, plantain, pepper soup and salad" },
  { src: "/feast/oct-20.webp", alt: "Whole rotisserie chicken on a bed of salad", tall: true },
  { src: "/feast/oct-49.webp", alt: "Rotisserie chicken with jollof rice and fried plantain" },
  { src: "/feast/oct-13.webp", alt: "House salad, jollof rice and fried plantain" },
];

const card = "rounded-2xl border border-white/[0.07] bg-[#161412]";
const label = "text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/70";

function Course({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <div className="py-7 first:pt-0 last:pb-0 border-b border-white/[0.06] last:border-0">
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-xs font-semibold text-gold-300 tabular-nums">{no}</span>
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SundayFeastPage() {
  return (
    <div className="min-h-screen bg-[#0e0d0c] pb-24">
      {/* ── Hero ── */}
      <section className="relative h-[72vh] min-h-[540px] flex items-end overflow-hidden">
        <Image src="/feast/oct-2.webp" alt="The Sunday Feast spread at Demi's" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-[#0e0d0c]" />
        <div className="relative w-full mx-auto max-w-6xl px-6 pb-24 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-300 font-semibold mb-5">Cricklewood · Every Sunday</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white font-[family-name:var(--font-display)] leading-[1.02]">
            Sunday Feast
          </h1>
          <p className="mt-4 text-base text-stone-300">A three course feast to share</p>
          <div className="mt-7 flex items-center justify-center gap-2.5 flex-wrap">
            <span className="rounded-full bg-gold-300 px-4 py-2 text-[13px] font-semibold text-[#1a1a1a]">£30 per person</span>
            <span className="rounded-full border border-white/25 bg-black/40 px-4 py-2 text-[13px] font-medium text-white backdrop-blur-sm">
              For two or more
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 -mt-12 relative">
        {/* No items-start: the booking column must stretch to the row height, or the sticky card inside it has no travel. */}
        <div className="grid lg:grid-cols-[1fr_400px] gap-8 lg:gap-12">
          {/* ── Info column ── */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* The deal */}
            <section className={`${card} p-8 sm:p-10`}>
              <p className={`${label} mb-2`}>The deal</p>
              <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-end">
                <div>
                  <h2 className="text-2xl font-bold text-white">Two or more people?</h2>
                  <p className="mt-3 text-[15px] text-stone-300 leading-relaxed">
                    Get all 5 dishes on the menu to share at your table for £30pp. The menu includes one cup of any
                    winter warmer drink.
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-5xl font-semibold text-gold-300 leading-none">£30</p>
                  <p className="mt-1.5 text-sm text-stone-500">per person</p>
                </div>
              </div>
            </section>

            {/* The menu */}
            <section className={`${card} p-8 sm:p-10`}>
              <p className={`${label} mb-2`}>The menu</p>
              <h2 className="text-2xl font-bold text-white mb-8">Three courses, all to share</h2>

              <Course no="01" title="Appetisers">
                <div className="flex flex-wrap gap-2.5">
                  {APPETISERS.map((a) => (
                    <span key={a} className="rounded-full border border-white/[0.09] px-4 py-2 text-[14px] font-medium text-stone-200">
                      {a}
                    </span>
                  ))}
                </div>
              </Course>

              <Course no="02" title="Starters">
                <ul className="space-y-5">
                  {STARTERS.map((d) => (
                    <li key={d.name}>
                      <p className="text-[15px] font-semibold text-white">{d.name}</p>
                      <p className="mt-0.5 text-[14px] text-stone-400 leading-relaxed">{d.note}</p>
                    </li>
                  ))}
                </ul>
              </Course>

              <Course no="03" title="The Feast">
                <ul className="space-y-5">
                  {FEAST.map((d) => (
                    <li key={d.name}>
                      <p className="text-[15px] font-semibold text-white">{d.name}</p>
                      <p className="mt-0.5 text-[14px] text-stone-400 leading-relaxed">{d.note}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 pt-5 border-t border-white/[0.06] text-[14px] font-semibold text-gold-300">
                  Both served with smoky party jollof rice &amp; sweet fried plantain
                </p>
              </Course>
            </section>

            {/* Photos */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4">
              {GALLERY.map((g) => (
                <div key={g.src} className={`relative overflow-hidden rounded-2xl ${g.tall ? "row-span-2 aspect-[2/3]" : "aspect-[4/3]"}`}>
                  <Image src={g.src} alt={g.alt} fill sizes="(min-width: 1024px) 340px, 50vw" className="object-cover" />
                </div>
              ))}
            </section>

            {/* Winter warmers */}
            <section className={`${card} p-8 sm:p-10`}>
              <p className={`${label} mb-2`}>One cup included</p>
              <h2 className="text-2xl font-bold text-white mb-6">Winter warmers</h2>
              <ul className="divide-y divide-white/[0.06]">
                {WARMERS.map((w) => (
                  <li key={w.name} className="flex items-baseline justify-between py-3 first:pt-0 last:pb-0">
                    <span className="text-[15px] text-stone-200">{w.name}</span>
                    <span className="text-[15px] text-stone-400 tabular-nums">£{w.price}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-stone-500">The feast includes one cup of any winter warmer drink.</p>
            </section>

            {/* Details */}
            <section className={`${card} p-8 sm:p-10`}>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { k: "When", v: ["Every Sunday", "Reserve your table below"] },
                  { k: "Where", v: ["Cricklewood", "89 Cricklewood Broadway, NW2 3JG"] },
                  { k: "Price", v: ["£30 per person", "For two or more"] },
                ].map((d) => (
                  <div key={d.k}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gold-300/70 mb-2">{d.k}</p>
                    {d.v.map((line, i) => (
                      <p key={i} className={i === 0 ? "text-sm text-white" : "text-xs text-stone-500 mt-0.5"}>{line}</p>
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-8 pt-6 border-t border-white/[0.06] text-xs text-stone-500 leading-relaxed">
                Please be aware that food may contain or come into contact with allergens. Please inform a member of
                staff of any allergies or dietary requirements before ordering.
              </p>
            </section>
          </div>

          {/* ── Booking ── */}
          <div id="book" className="order-1 lg:order-2 scroll-mt-24">
            {/* Sticky on desktop, capped so a tall form can never outgrow the viewport and scroll away. */}
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              <FeastBooking />
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-stone-300 mb-4 font-[family-name:var(--font-display)]">Ready for Sunday?</p>
          <a href="#book" className="inline-block px-8 py-4 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition">
            Book a table
          </a>
        </div>
      </div>
    </div>
  );
}
