import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import { BrunchBooking } from "./BrunchBooking";

/**
 * Photos live in /public/brunch. Each slot falls back to the dark house
 * treatment until the file is dropped in, so the page never ships broken
 * images while the shoot is still being edited.
 */
function hasPhoto(src: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", src));
  } catch {
    return false;
  }
}

const HERO_PHOTO = "/brunch/hero.jpg";

export const metadata: Metadata = {
  title: "Saturday Brunch | Demi's Restaurant Streatham Hill",
  description:
    "Bottomless Saturday brunch at Demi's Streatham Hill, 1pm to 4:30pm. £35 food only or £50 with 90 minutes of bottomless drinks — choose Team Seafood or Team Meaty, then a starter, a main and three sides.",
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
    featured: false,
    includes: ["One starter", "One main", "Any three sides"],
  },
  {
    name: "Food & Drinks",
    price: 50,
    featured: true,
    includes: ["One starter", "One main", "Any three sides", "90 minutes of bottomless drinks"],
  },
];

const SIDES = [
  "Potato Fries", "Sweet Potato Fries", "Fried Plantain",
  "Jollof Rice", "Fried Rice", "Poundo Yam",
];

type Dish = { name: string; note: string };

const TEAMS: { key: string; eyebrow: string; title: string; photo: string; starters: Dish[]; mains: Dish[] }[] = [
  {
    key: "seafood",
    eyebrow: "From the sea",
    title: "Team Seafood",
    photo: "/brunch/seafood.jpg",
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
    photo: "/brunch/meaty.jpg",
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
const hairline = "absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent";

export default async function SaturdayBrunchPage() {
  const heroPhoto = hasPhoto(HERO_PHOTO);

  return (
    <div className="min-h-screen bg-[#0b0a09] pb-24">
      {/* ── Hero ── */}
      <section className="relative h-[68vh] min-h-[520px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {heroPhoto ? (
            <Image src={HERO_PHOTO} alt="" fill priority sizes="100vw" className="object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 bg-[#171310]" />
              <div
                className="absolute inset-0 opacity-[0.35]"
                style={{
                  backgroundImage:
                    "radial-gradient(120% 80% at 50% -10%, #3a2814 0%, rgba(58,40,20,0) 55%), repeating-linear-gradient(135deg, rgba(227,192,122,0.06) 0 2px, transparent 2px 22px)",
                }}
              />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#0b0a09]" />
        </div>

        <div className="relative text-center px-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-300 font-semibold mb-5">Streatham Hill · Every Saturday</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white font-[family-name:var(--font-display)] leading-[1.02] drop-shadow-lg">
            Saturday Brunch
          </h1>
          <p className="mt-4 text-sm text-stone-300">1pm – 4:30pm</p>

          <div className="mt-7 flex items-center justify-center gap-2.5 flex-wrap">
            <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-[13px] font-medium text-white backdrop-blur-sm">
              £35 food only
            </span>
            <span className="rounded-full bg-brunch-500 px-4 py-2 text-[13px] font-semibold text-white">
              £50 with bottomless drinks
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 -mt-16 relative">
        {/* No items-start: the booking column must stretch to the row height, or the sticky card inside it has no travel. */}
        <div className="grid lg:grid-cols-[1fr_400px] gap-8 lg:gap-12">
          {/* ── Info column ── */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* Packages — the centrepiece */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className={hairline} />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-2">The deal</p>
              <h2 className="text-2xl font-bold text-white mb-8">Choose a team, then a package</h2>

              <div className="grid sm:grid-cols-2 gap-5">
                {PACKAGES.map((p) => (
                  <div
                    key={p.name}
                    className={`rounded-2xl p-6 ${
                      p.featured
                        ? "border border-brunch-500/50 bg-brunch-500/[0.08]"
                        : "border border-white/[0.07] bg-black/20"
                    }`}
                  >
                    {p.featured && (
                      <span className="inline-block mb-4 rounded-full bg-brunch-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                        Bottomless
                      </span>
                    )}
                    <div className="flex items-baseline gap-3">
                      <span className={`text-4xl font-semibold leading-none ${p.featured ? "text-brunch-300" : "text-gold-300"}`}>
                        £{p.price}
                      </span>
                      <span className="text-sm text-stone-500">per person</span>
                    </div>
                    <p className="mt-3 text-base font-semibold text-white">{p.name}</p>
                    <ul className="mt-4 space-y-2">
                      {p.includes.map((line) => (
                        <li key={line} className="flex items-start gap-2.5">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${p.featured ? "bg-brunch-400" : "bg-gold-300/70"}`} />
                          <span className="text-[14px] text-stone-300 leading-snug">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Team Seafood + Team Meaty */}
            <div className="grid sm:grid-cols-2 gap-8">
              {TEAMS.map((team) => {
                const photo = hasPhoto(team.photo);
                return (
                  <section key={team.key} className={`${cardCls} overflow-hidden`}>
                    {photo && (
                      <div className="relative h-44 w-full">
                        <Image src={team.photo} alt="" fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0a09] via-transparent to-transparent" />
                      </div>
                    )}
                    <div className="p-8">
                      <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-2">{team.eyebrow}</p>
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
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Sides */}
            <section className={`${cardCls} p-8 sm:p-10`}>
              <div className={hairline} />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-2">Choose any three</p>
              <h2 className="text-2xl font-bold text-white mb-6">Sides</h2>
              <div className="flex flex-wrap gap-2.5">
                {SIDES.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/[0.09] bg-black/25 px-4 py-2 text-[14px] font-medium text-stone-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-xs text-stone-500">Poundo Yam is compulsory if your main is the Fisherman Soup.</p>
            </section>

            {/* Bottomless drinks */}
            <section className="relative rounded-2xl border border-brunch-500/25 bg-gradient-to-b from-brunch-500/[0.07] to-transparent p-8 sm:p-10">
              <div className="absolute top-0 left-8 sm:left-10 h-px w-12 bg-gradient-to-r from-brunch-400/70 to-transparent" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-brunch-300/80 mb-2">Included with the £50 package</p>
              <h2 className="text-2xl font-bold text-white mb-1">Bottomless drinks</h2>
              <p className="text-[14px] text-stone-400 mb-8">90 minutes of free-flowing drinks from the moment you sit down.</p>
              <div className="grid sm:grid-cols-3 gap-6">
                {DRINKS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-brunch-300/70 mb-3">{group.label}</p>
                    <ul className="space-y-2.5">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-brunch-400/80 shrink-0" />
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
              <div className={hairline} />
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { k: "When", v: ["Every Saturday", "1pm – 4:30pm"] },
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
          <div id="book" className="order-1 lg:order-2 scroll-mt-24">
            {/* Sticky on desktop, capped so a tall form can never outgrow the viewport and scroll away. */}
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              <BrunchBooking />
            </div>
          </div>
        </div>

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
