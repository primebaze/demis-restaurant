import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BrunchBooking } from "./BrunchBooking";

type Review = { id: string; author: string; rating: number; body: string; location: string };

async function getReviews(): Promise<Review[]> {
  try {
    return await prisma.review.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 12,
      select: { id: true, author: true, rating: true, body: true, location: true },
    });
  } catch {
    return []; // table not migrated yet
  }
}

export const metadata: Metadata = {
  title: "Saturday Brunch | Demi's Restaurant Streatham Hill",
  description:
    "Bottomless Saturday brunch at Demi's Streatham Hill, 11am to 4pm. £35 for unlimited sides plus seafood and grill — scallops, mussels, prawns, beef ribs, lamb chops, suya and more.",
  alternates: { canonical: "https://www.demisrestaurant.co.uk/saturday-brunch" },
  openGraph: {
    title: "Saturday Bottomless Brunch at Demi's, Streatham Hill",
    description: "£35 bottomless brunch — unlimited sides, seafood and grill, every Saturday.",
    url: "https://www.demisrestaurant.co.uk/saturday-brunch",
  },
};

export const dynamic = "force-dynamic";

const SIDES = [
  "Potato Fries", "Sweet Potato Fries", "Roasted Potato",
  "Fried Plantain", "Mini Shawarma", "Bread",
  "Jollof Rice", "Fried Rice", "Coconut Rice",
];

const SEAFOOD = ["Scallops", "Mussels", "Prawn", "Grilled Fish", "Lobster*", "Seafood Mix Soup"];

const MEATY = ["Beef Ribs", "Striploin", "Beef Suya", "Tozo", "Lamb Chops", "Asun"];

const cardCls = "relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent";

export default async function SaturdayBrunchPage() {
  const reviews = await getReviews();
  return (
    <div className="min-h-screen bg-[#0b0a09] pb-24">
      {/* ── Hero (placeholder — swap the background for a photo or video) ── */}
      <section className="relative h-[62vh] min-h-[440px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {/* PLACEHOLDER: replace this block with <Image>/<video> when the artwork is ready */}
          <div className="absolute inset-0 bg-[#171310]" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(120% 80% at 50% -10%, #3a2814 0%, rgba(58,40,20,0) 55%), repeating-linear-gradient(135deg, rgba(227,192,122,0.06) 0 2px, transparent 2px 22px)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-[#0b0a09]" />
        </div>
        <div className="relative text-center px-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-300 font-semibold mb-5">Streatham Hill · Every Saturday</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white font-[family-name:var(--font-display)] leading-[1.02] drop-shadow-lg">
            Saturday Brunch
          </h1>
          <p className="mt-5 text-lg text-stone-200/90 max-w-md mx-auto">
            Bottomless brunch — unlimited sides, seafood and grill.
          </p>
          <p className="mt-2 text-sm text-stone-400">11am – 4pm</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 -mt-16 relative">
        <div className="grid lg:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">
          {/* ── Info column ── */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* Price */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">The deal</p>
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="text-6xl font-semibold text-gold-300 leading-none">£35</span>
                <span className="text-lg text-white font-medium">per person</span>
              </div>
              <p className="mt-4 text-[15px] text-stone-400 leading-relaxed max-w-md">
                One price, one long table. Unlimited sides alongside a spread of seafood and grilled meats.
              </p>
            </section>

            {/* Unlimited sides */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">Unlimited</p>
              <h2 className="text-2xl font-bold text-white mb-8">Sides, as much as you like</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {SIDES.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gold-300/[0.08] text-gold-300 text-xs font-bold shrink-0">✦</span>
                    <span className="text-[15px] text-stone-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Seafood + Meaty */}
            <div className="grid sm:grid-cols-2 gap-8">
              <section className={`${cardCls} p-8`}>
                <div className="absolute top-0 left-8 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">From the sea</p>
                <h2 className="text-xl font-bold text-white mb-6">Seafood</h2>
                <ul className="space-y-3">
                  {SEAFOOD.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-300/70 shrink-0" />
                      <span className="text-[15px] text-stone-300 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs text-stone-500">* Subject to availability.</p>
              </section>

              <section className={`${cardCls} p-8`}>
                <div className="absolute top-0 left-8 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">From the grill</p>
                <h2 className="text-xl font-bold text-white mb-6">Meaty</h2>
                <ul className="space-y-3">
                  {MEATY.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-300/70 shrink-0" />
                      <span className="text-[15px] text-stone-300 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Details */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { k: "When", v: ["Every Saturday", "11am – 4pm"] },
                  { k: "Where", v: ["Streatham Hill", "67 Streatham Hill, SW2 4TX"] },
                  { k: "Price", v: ["£35 per person", "Cash or card"] },
                ].map((d) => (
                  <div key={d.k}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gold-300/70 mb-2">{d.k}</p>
                    {d.v.map((line, i) => (
                      <p key={i} className={i === 0 ? "text-sm text-white" : "text-xs text-stone-500 mt-0.5"}>{line}</p>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── Booking ── */}
          <div id="book" className="order-1 lg:order-2 lg:sticky lg:top-28 scroll-mt-24">
            <BrunchBooking />
          </div>
        </div>

        {/* ── Reviews ── */}
        {reviews.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-6 text-center">What guests say</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews.map((r) => (
                <div key={r.id} className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6">
                  <div className="text-sm mb-3" aria-label={`${r.rating} out of 5`}>
                    <span className="text-gold-300">{"★".repeat(r.rating)}</span>
                    <span className="text-gray-700">{"★".repeat(5 - r.rating)}</span>
                  </div>
                  <p className="text-[15px] text-stone-300 leading-relaxed whitespace-pre-wrap break-words">{r.body}</p>
                  <p className="mt-4 text-sm font-medium text-white">
                    {r.author}
                    {r.location ? <span className="text-stone-500 font-normal"> · {r.location}</span> : null}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-stone-300 mb-4 font-[family-name:var(--font-display)]">Ready for Saturday?</p>
          <a
            href="#book"
            className="inline-block px-8 py-4 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition"
          >
            Book a table
          </a>
        </div>
      </div>
    </div>
  );
}
