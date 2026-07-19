import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BuffetBooking } from "./BuffetBooking";
import { HeroVideo } from "./HeroVideo";
import { LiveChat } from "@/components/LiveChat";

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
  title: "Sunday Buffet | Demi's Restaurant Streatham Hill",
  description:
    "All-you-can-eat Afro-Caribbean Sunday buffet at Demi's Streatham Hill. Reserve your spot, the earlier you book, the lower your number and the less you pay. £20 for the first 10, then £25, then £30.",
  alternates: { canonical: "https://www.demisrestaurant.co.uk/sunday-buffet" },
  openGraph: {
    title: "Sunday Buffet at Demi's, Streatham Hill",
    description: "All-you-can-eat Nigerian & Caribbean buffet. Reserve your spot and pay less the earlier you book.",
    url: "https://www.demisrestaurant.co.uk/sunday-buffet",
    images: [{ url: "/buffet.jpg" }],
  },
};

export const dynamic = "force-dynamic";

const MENU = [
  "Jollof Rice", "Fried Rice", "Rice & Peas", "Pounded Yam",
  "Eforiro", "Moi Moi", "Pepper Soup", "Grilled Turkey",
  "Oxtail", "Beef Ribs", "Plantain", "and plenty more",
];

const TIERS = [
  { n: "First 10", p: "20", note: "Early birds", highlight: true },
  { n: "Next 12", p: "25", note: "Still a steal", highlight: false },
  { n: "After that", p: "30", note: "Latecomers", highlight: false },
];

const cardCls = "relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent";

export default async function SundayBuffetPage() {
  const reviews = await getReviews();
  return (
    <div className="min-h-screen bg-[#0b0a09] pb-24">
      {/* ── Hero video ── */}
      <section className="relative h-[62vh] min-h-[440px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <HeroVideo />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#0b0a09]" />
        </div>
        <div className="relative text-center px-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-300 font-semibold mb-5">Streatham Hill · Every Sunday</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white font-[family-name:var(--font-display)] leading-[1.02] drop-shadow-lg">
            Sunday Buffet
          </h1>
          <p className="mt-5 text-lg text-stone-200/90 max-w-md mx-auto">
            All-you-can-eat Afro-Caribbean buffet, every Sunday.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 -mt-16 relative">
        <div className="grid lg:grid-cols-[1fr_460px] gap-8 lg:gap-12 items-start">
          {/* ── Info column ── */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* Pricing */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">The deal</p>
              <h2 className="text-2xl font-bold text-white">The earlier you arrive, the less you pay</h2>
              <p className="mt-2 text-[15px] text-stone-400 leading-relaxed max-w-md">
                It&apos;s first-come on the day. Reserve to guarantee your spot, then pay your price at the door based on how early you arrive.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {TIERS.map((t) => (
                  <div
                    key={t.n}
                    className={`rounded-xl p-5 text-center border ${
                      t.highlight
                        ? "border-gold-300/40 bg-gradient-to-b from-gold-300/[0.12] to-transparent"
                        : "border-white/[0.08] bg-white/[0.02]"
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500">{t.n}</p>
                    <p className={`mt-2 text-3xl font-semibold ${t.highlight ? "text-gold-300" : "text-white"}`}>£{t.p}</p>
                    <p className="mt-1.5 text-[11px] text-stone-500">{t.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* What's on — sparkle card */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">On the table</p>
              <h2 className="text-2xl font-bold text-white mb-8">Nigerian &amp; Caribbean</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {MENU.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gold-300/[0.08] text-gold-300 text-xs font-bold shrink-0">✦</span>
                    <span className="text-[15px] text-stone-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-sm text-stone-500">Plus complimentary appetizers to start, and the menu changes every week.</p>
            </section>

            {/* Details */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { k: "When", v: ["Every Sunday", "Doors 12pm · from 12:30pm"] },
                  { k: "Where", v: ["Streatham Hill", "67 Streatham Hill, SW2 4TX"] },
                  { k: "Payment", v: ["At the door", "Cash or card"] },
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
            <BuffetBooking />
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

        {/* Bottom CTA back to the form */}
        <div className="mt-16 text-center">
          <p className="text-lg text-stone-300 mb-4 font-[family-name:var(--font-display)]">Ready for Sunday?</p>
          <a
            href="#book"
            className="inline-block px-8 py-4 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition"
          >
            Book now
          </a>
        </div>
      </div>

      <LiveChat />
    </div>
  );
}
