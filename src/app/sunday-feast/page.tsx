import type { Metadata } from "next";
import Image from "next/image";
import { Check } from "lucide-react";
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

const DEAL_POINTS = ["Three courses to share", "Whole chicken and whole fish", "One winter warmer each", "For two or more"];

// The table, shot by shot: a staggered strip that leads into the closing "Book a table".
const STRIP = [
  { src: "/feast/oct-20.webp", alt: "Whole rotisserie chicken on a bed of salad" },
  { src: "/feast/oct-49.webp", alt: "Rotisserie chicken with jollof rice and fried plantain" },
  { src: "/feast/oct-11.webp", alt: "Rotisserie chicken in pepper sauce with moi moi on the side" },
  { src: "/feast/oct-13.webp", alt: "House salad, jollof rice and fried plantain" },
];

// Near-black cards with a hairline edge: crisp on the page colour, where the grey looked muddy.
const card = "rounded-2xl border border-white/[0.06] bg-ink-950";
const label = "text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/70";

/** One course of the menu, with its photo beside it (above it on phones), alternating sides. */
function Course({
  no, title, img, alt, flip = false, children,
}: { no: string; title: string; img: string; alt: string; flip?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`py-8 first:pt-0 last:pb-0 border-b border-white/[0.06] last:border-0 sm:grid sm:items-center sm:gap-8 ${
        flip ? "sm:grid-cols-[180px_1fr]" : "sm:grid-cols-[1fr_180px]"
      }`}
    >
      <div className={`relative mb-6 sm:mb-0 aspect-[16/10] sm:aspect-[4/5] overflow-hidden rounded-xl ${flip ? "" : "sm:order-last"}`}>
        <Image src={img} alt={alt} fill sizes="(min-width: 640px) 180px, 100vw" className="object-cover" />
      </div>
      <div>
        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-xs font-semibold text-gold-300 tabular-nums">{no}</span>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SundayFeastPage() {
  return (
    <div className="min-h-screen bg-ink-900 pb-24">
      {/* ── Hero ── */}
      <section className="relative h-[72vh] min-h-[540px] flex items-end overflow-hidden">
        <Image src="/feast/oct-2.webp" alt="The Sunday Feast spread at Demi's" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-ink-900" />
        <div className="relative w-full mx-auto max-w-6xl px-6 pb-24 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-300 font-semibold mb-5">Cricklewood · Every Sunday</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white font-[family-name:var(--font-display)] leading-[1.02]">
            Sunday Feast
          </h1>
          <p className="mt-4 text-base text-stone-300">A three course feast to share</p>
          <p className="mt-1.5 text-sm text-stone-400">1:30pm to 6pm</p>
          <div className="mt-7 flex items-center justify-center gap-2.5 flex-wrap">
            <span className="rounded-full bg-gold-300 px-4 py-2 text-[13px] font-semibold text-ink-900">£30 per person</span>
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
            <section className={`${card} overflow-hidden sm:grid sm:grid-cols-[0.95fr_1.05fr]`}>
              <div className="relative aspect-[16/10] sm:aspect-auto sm:min-h-[340px]">
                <Image
                  src="/feast/oct-14.webp"
                  alt="The whole Sunday Feast laid out on one table"
                  fill
                  sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-7 sm:p-9">
                <p className={label}>Sunday Feast · for two or more</p>
                <p className="mt-4 flex items-baseline gap-2.5">
                  <span className="text-6xl leading-none text-gold-300 font-[family-name:var(--font-display)]">£30</span>
                  <span className="text-sm text-stone-400">per person</span>
                </p>
                <p className="mt-4 text-[15px] text-stone-300 leading-relaxed">
                  Three courses brought to your table to share, with a winter warmer each.
                </p>
                <ul className="mt-6 space-y-2.5 border-t border-white/[0.06] pt-6">
                  {DEAL_POINTS.map((v) => (
                    <li key={v} className="flex items-center gap-3 text-[14px] text-stone-200">
                      <Check className="h-4 w-4 shrink-0 text-gold-300" strokeWidth={1.75} aria-hidden />
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* The menu */}
            <section className={`${card} p-8 sm:p-10`}>
              <p className={`${label} mb-2`}>The menu</p>
              <h2 className="text-2xl font-bold text-white">Three courses, all to share</h2>

              <Course no="01" title="Appetisers" img="/feast/oct-10.webp" alt="Puff puff, moi moi and pepper sauce on the table">
                <div className="flex flex-wrap gap-2.5">
                  {APPETISERS.map((a) => (
                    <span key={a} className="rounded-full border border-white/[0.09] px-4 py-2 text-[14px] font-medium text-stone-200">
                      {a}
                    </span>
                  ))}
                </div>
              </Course>

              <Course no="02" title="Starters" img="/feast/oct-12.webp" alt="Pepper soup, house salad, jollof rice and plantain" flip>
                <ul className="space-y-5">
                  {STARTERS.map((d) => (
                    <li key={d.name}>
                      <p className="text-[15px] font-semibold text-white">{d.name}</p>
                      <p className="mt-0.5 text-[14px] text-stone-400 leading-relaxed">{d.note}</p>
                    </li>
                  ))}
                </ul>
              </Course>

              <Course no="03" title="The Feast" img="/feast/oct-51.webp" alt="Sauce being poured over a whole rotisserie chicken">
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
                  { k: "When", v: ["Every Sunday", "1:30pm to 6pm"] },
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

        {/* The table, shot by shot. Swipes on phones; a staggered row on wider screens. */}
        <section aria-label="Photos of the Sunday Feast" className="mt-20 -mx-6 sm:mx-0">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-8">
            {STRIP.map((g, i) => (
              <div
                key={g.src}
                className={`relative w-[64%] shrink-0 snap-center aspect-[3/4] overflow-hidden rounded-2xl sm:w-auto ${i % 2 ? "sm:translate-y-8" : ""}`}
              >
                <Image src={g.src} alt={g.alt} fill sizes="(min-width: 640px) 25vw, 64vw" className="object-cover" />
              </div>
            ))}
          </div>
        </section>

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
