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
    "Bottomless Saturday brunch at Demi's Streatham Hill, 11am to 4pm. £35 food only or £50 with 90 minutes of bottomless drinks — choose Team Seafood or Team Meaty, then a starter, a main and three sides.",
  alternates: { canonical: "https://www.demisrestaurant.co.uk/saturday-brunch" },
  openGraph: {
    title: "Saturday Bottomless Brunch at Demi's, Streatham Hill",
    description: "Saturday brunch — £35 food only, or £50 with 90 minutes of bottomless drinks. Team Seafood or Team Meaty.",
    url: "https://www.demisrestaurant.co.uk/saturday-brunch",
  },
};

export const dynamic = "force-dynamic";

const PACKAGES = [
  {
    name: "Food Only",
    price: 35,
    blurb: "Pick your team, then one starter, one main and three sides from that menu.",
  },
  {
    name: "Food & Drinks",
    price: 50,
    blurb: "Everything above, plus 90 minutes of free-flowing drinks.",
  },
];

const SIDES = [
  "Potato Fries", "Sweet Potato Fries", "Fried Plantain",
  "Jollof Rice", "Fried Rice", "Poundo Yam",
];

type Dish = { name: string; note: string };

const TEAMS: { key: string; eyebrow: string; title: string; starters: Dish[]; mains: Dish[] }[] = [
  {
    key: "seafood",
    eyebrow: "From the sea",
    title: "Team Seafood",
    starters: [
      { name: "Scallops", note: "Pan-seared and finished with garlic butter." },
      { name: "Fish Peppersoup", note: "A rich, spicy fish broth with traditional Nigerian spices." },
      { name: "Prawns", note: "Juicy grilled king prawns in our house special sauce." },
    ],
    mains: [
      { name: "Seafood Boil", note: "A hearty mix of seafood, corn and potatoes in our signature seasoning." },
      { name: "Grilled Fish", note: "Grilled tilapia finished with house spices." },
      { name: "Fisherman Soup", note: "A rich seafood soup packed with fish, prawns, mussels and snails." },
    ],
  },
  {
    key: "meaty",
    eyebrow: "From the grill",
    title: "Team Meaty",
    starters: [
      { name: "Beef Ribs", note: "Slow-cooked and glazed with a smoky barbecue sauce." },
      { name: "Spicy Chopped Beef", note: "Tender beef tossed with peppers and bold house spices." },
      { name: "Asun", note: "Spicy grilled goat meat sautéed with peppers and onions." },
    ],
    mains: [
      { name: "Striploin Steak", note: "Premium striploin cooked to perfection." },
      { name: "Lamb Chops", note: "Marinated and flame grilled." },
      { name: "Suya Platter", note: "Chicken, beef and lamb suya served with onions and suya spice." },
    ],
  },
];

const DRINKS = [
  { label: "Wine & fizz", items: ["Prosecco", "White Wine", "Rosé"] },
  { label: "Cocktails", items: ["Chapman", "Marley Punch", "Mojito", "Long Island Iced Tea"] },
  { label: "Mocktails", items: ["Chapman", "Mojito", "Tropical Twist"] },
];

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
            Choose Team Seafood or Team Meaty — a starter, a main and three sides. Add 90 minutes of bottomless drinks.
          </p>
          <p className="mt-2 text-sm text-stone-400">11am – 4pm</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 -mt-16 relative">
        <div className="grid lg:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">
          {/* ── Info column ── */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* Packages */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-6">The deal</p>
              <div className="grid sm:grid-cols-2 gap-6">
                {PACKAGES.map((p) => (
                  <div key={p.name} className="rounded-2xl border border-white/[0.07] bg-black/20 p-6">
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-semibold text-gold-300 leading-none">£{p.price}</span>
                      <span className="text-sm text-stone-500">per person</span>
                    </div>
                    <p className="mt-3 text-base font-semibold text-white">{p.name}</p>
                    <p className="mt-2 text-[14px] text-stone-400 leading-relaxed">{p.blurb}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[13px] text-stone-500">
                Both menus start the same way: choose a team, then build your plate from it.
              </p>
            </section>

            {/* How it works */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">How it works</p>
              <h2 className="text-2xl font-bold text-white mb-8">Pick a team, build your plate</h2>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { n: "1", t: "Choose your team", d: "Seafood or Meaty. Everything else comes from that menu." },
                  { n: "2", t: "One starter, one main", d: "Pick one of each from your team's list." },
                  { n: "3", t: "Three sides", d: "Any three from the shared sides list." },
                ].map((s) => (
                  <div key={s.n}>
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-300/[0.08] text-gold-300 text-sm font-bold mb-3">{s.n}</span>
                    <p className="text-[15px] font-semibold text-white">{s.t}</p>
                    <p className="mt-1.5 text-[13px] text-stone-400 leading-relaxed">{s.d}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Sides */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">Choose any three</p>
              <h2 className="text-2xl font-bold text-white mb-8">Sides</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {SIDES.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gold-300/[0.08] text-gold-300 text-xs font-bold shrink-0">✦</span>
                    <span className="text-[15px] text-stone-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-stone-500">Poundo Yam is compulsory if your main is the Fisherman Soup.</p>
            </section>

            {/* Team Seafood + Team Meaty */}
            <div className="grid sm:grid-cols-2 gap-8">
              {TEAMS.map((team) => (
                <section key={team.key} className={`${cardCls} p-8`}>
                  <div className="absolute top-0 left-8 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">{team.eyebrow}</p>
                  <h2 className="text-xl font-bold text-white mb-7">{team.title}</h2>
                  {[
                    { label: "Starter · choose one", dishes: team.starters },
                    { label: "Main · choose one", dishes: team.mains },
                  ].map((course) => (
                    <div key={course.label} className="mb-7 last:mb-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300/70 mb-4">{course.label}</p>
                      <ul className="space-y-4">
                        {course.dishes.map((dish) => (
                          <li key={dish.name} className="flex gap-3">
                            <span className="w-1.5 h-1.5 mt-2 rounded-full bg-gold-300/70 shrink-0" />
                            <div>
                              <p className="text-[15px] text-white font-medium">{dish.name}</p>
                              <p className="text-[13px] text-stone-400 leading-relaxed mt-0.5">{dish.note}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ))}
            </div>

            {/* Bottomless drinks */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-3">With the £50 package</p>
              <h2 className="text-2xl font-bold text-white mb-2">Bottomless drinks</h2>
              <p className="text-[14px] text-stone-400 mb-8">90 minutes of free-flowing drinks from the moment you sit down.</p>
              <div className="grid sm:grid-cols-3 gap-6">
                {DRINKS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300/70 mb-3">{group.label}</p>
                    <ul className="space-y-2.5">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-300/70 shrink-0" />
                          <span className="text-[15px] text-stone-300 font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Details */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { k: "When", v: ["Every Saturday", "11am – 4pm"] },
                  { k: "Where", v: ["Streatham Hill", "67 Streatham Hill, SW2 4TX"] },
                  { k: "Price", v: ["£35 food only · £50 with drinks", "Cash or card"] },
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
