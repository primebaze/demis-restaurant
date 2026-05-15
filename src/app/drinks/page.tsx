"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ─── Types ─── */
type DrinkItem = { name: string; price?: string; abv?: string; desc?: string };
type DrinkSection = {
  id: string;
  label: string;
  icon: string;
  accent: string;
  note?: string;
  items?: DrinkItem[];
  subsections?: { title: string; note?: string; items: DrinkItem[] }[];
};

/* ─── Data ─── */
const SECTIONS: DrinkSection[] = [
  {
    id: "cocktails",
    label: "Cocktails",
    icon: "🍹",
    accent: "from-teal-500/20 to-cyan-500/10",
    note: "£15 each",
    items: [
      { name: "Chapman", desc: "Cucumber, lime, lemon, orange and blackcurrant" },
      { name: "Classic Mojito", desc: "Muddled fresh lime and mint topped with lemonade" },
      { name: "Piña Colada", desc: "Chilled glass of coconut cream and pineapple juice" },
      { name: "Blue Lemonade", desc: "Blue Curaçao, lemon, lemonade" },
      { name: "Ginger Cooler", desc: "Fresh mint, lime juice and ginger" },
      { name: "Apple Mojito", desc: "Apple, lime juice, mint" },
      { name: "Strawberry", desc: "Strawberry, lime, lemonade, mint" },
    ],
  },
  {
    id: "mocktails",
    label: "Mocktails",
    icon: "🥤",
    accent: "from-lime-500/20 to-green-500/10",
    note: "£10 each",
    items: [
      { name: "Chapman", desc: "Cucumber, lime, lemon, orange and blackcurrant" },
      { name: "Classic Mojito", desc: "Muddled fresh lime and mint topped with lemonade" },
      { name: "Piña Colada", desc: "Chilled glass of coconut cream and pineapple juice" },
      { name: "Blue Lemonade", desc: "Blue Curaçao, lemon, lemonade" },
      { name: "Ginger Cooler", desc: "Fresh mint, lime juice and ginger" },
      { name: "Apple Mojito", desc: "Apple, lime juice, mint" },
      { name: "Strawberry", desc: "Strawberry, lime, lemonade, mint" },
    ],
  },
  {
    id: "ginger-gordons",
    label: "Gin-ger",
    icon: "🫙",
    accent: "from-pink-500/20 to-rose-500/10",
    note: "Gordon's Gin — Lagos meets London",
    items: [
      {
        name: "Pinkish",
        desc: "Premium pink Gordon's poured over ice with crushed strawberry and chaps extracts",
      },
      {
        name: "Ballers",
        desc: "Tropical passion fruit Gordon's poured over ice with ginger and lemon garnish",
      },
    ],
  },
  {
    id: "beer",
    label: "Beer & Cider",
    icon: "🍺",
    accent: "from-amber-500/20 to-yellow-500/10",
    subsections: [
      {
        title: "Bottles — £12",
        items: [
          { name: "Trophy", abv: "5%", desc: "Malted barley, hops, maize grits & water" },
          { name: "Star", abv: "5.1%", desc: "Cold filtered with a crisp, refreshing taste" },
          { name: "Big Guinness", abv: "7.5%", desc: "More hops for a bold, intense and rich flavour" },
          { name: "Origin", abv: "5.5%", desc: "Spirit mixed drink with African herbs and fruit extracts" },
          { name: "Heineken", abv: "5%", desc: "Brewed with water, malted barley and hops" },
          { name: "Guilder", abv: "5.2%", desc: "Golden beer slow brewed with rich malted barley and aromatic hops" },
          { name: "Stella Artois", abv: "4.6%", desc: "Brewed with water, barley malt, maize and hops" },
        ],
      },
      {
        title: "Cider — £12",
        items: [
          { name: "Kopparberg Mixed Fruits", abv: "4%", desc: "Apple cider infused with raspberry & blackcurrant" },
        ],
      },
      {
        title: "Small Bottles",
        items: [
          { name: "Small Guinness", abv: "7.5%", price: "£10" },
          { name: "Smirnoff Ice", abv: "4%", price: "£10" },
          { name: "Prosecco", abv: "10.5%", price: "£10" },
        ],
      },
    ],
  },
  {
    id: "wines",
    label: "Wines",
    icon: "🍷",
    accent: "from-purple-500/20 to-pink-500/10",
    subsections: [
      {
        title: "White Wine",
        note: "Bottle £30",
        items: [
          { name: "Languore Trebbiano Chardonnay Rubicone" },
          { name: "Gufetto Pinot Grigio" },
          { name: "Mozzafiato Falanghina" },
          { name: "Valle Berta Gavi" },
        ],
      },
      {
        title: "Red Wine",
        note: "Bottle £30",
        items: [
          { name: "Crescendo Merlot" },
          { name: "Languore Sangiovese" },
        ],
      },
      {
        title: "Rosé Wine",
        note: "Bottle £30 · 250ml glass £10",
        items: [
          { name: "Pinot Grigio Rosé Delle Venezie" },
          { name: "Crescendo White Zinfandel Rosé" },
          { name: "Bardolino Chiaretto Rosé" },
        ],
      },
    ],
  },
  {
    id: "champagne",
    label: "Champagne",
    icon: "🥂",
    accent: "from-gold-300/20 to-yellow-400/10",
    subsections: [
      {
        title: "Champagne",
        items: [
          { name: "Laurent Perrier", price: "£120" },
          { name: "Moët & Chandon", price: "£120" },
          { name: "Belaire Rosé", price: "£120" },
          { name: "Martini Prosecco", price: "£50" },
        ],
      },
      {
        title: "Single Malt Whisky",
        items: [
          { name: "Glen 12", price: "£120" },
          { name: "Glen 15", price: "£150" },
          { name: "Glen 18", price: "£200" },
          { name: "Glen 21", price: "£300" },
          { name: "Glenmorangie", price: "£100" },
        ],
      },
    ],
  },
  {
    id: "spirits",
    label: "Spirits",
    icon: "🥃",
    accent: "from-indigo-500/20 to-blue-500/10",
    note: "25ml £8 · 50ml £13",
    subsections: [
      {
        title: "Cognac",
        items: [
          { name: "Courvoisier" },
          { name: "Hennessy" },
          { name: "Rémy Martin" },
          { name: "Martell" },
        ],
      },
      {
        title: "Vodka",
        items: [
          { name: "Absolut" },
          { name: "Cîroc" },
          { name: "Smirnoff" },
          { name: "Belvedere" },
        ],
      },
      {
        title: "Whiskey",
        items: [
          { name: "Jack Daniel's" },
          { name: "Jameson Irish Whiskey" },
          { name: "Johnnie Walker" },
          { name: "Southern Comfort" },
        ],
      },
      {
        title: "Rum",
        items: [
          { name: "Bacardi" },
          { name: "Captain Morgan" },
          { name: "Captain Morgan Spiced" },
          { name: "Mount Gay Rum" },
          { name: "Wray and Nephew" },
        ],
      },
      {
        title: "Gin",
        items: [
          { name: "Bombay Sapphire" },
          { name: "Gordon's" },
          { name: "Hendrick's" },
          { name: "Tanqueray" },
        ],
      },
    ],
  },
  {
    id: "liqueurs",
    label: "Liqueurs",
    icon: "🍸",
    accent: "from-orange-500/20 to-red-500/10",
    note: "25ml £8 · 50ml £13",
    items: [
      { name: "Bailey's Irish Cream" },
      { name: "Disaronno" },
      { name: "Jägermeister" },
      { name: "Malibu" },
      { name: "Tequila" },
    ],
  },
  {
    id: "locals",
    label: "Locals",
    icon: "🌴",
    accent: "from-emerald-500/20 to-teal-500/10",
    items: [
      { name: "Palm Wine", abv: "4%", price: "£12", desc: "Fermented palm tree sap" },
      { name: "Origin Bitters", abv: "30%", price: "£10", desc: "Spirit drink with African herb extracts" },
      { name: "Kopparberg 0%", price: "£10", desc: "Non-alcoholic fruit cider" },
      { name: "Nozeco", price: "£20", desc: "Non-alcoholic sparkling wine — natural grape profile with fine bubbles" },
    ],
  },
  {
    id: "soft",
    label: "Soft Drinks",
    icon: "🧃",
    accent: "from-sky-500/20 to-blue-400/10",
    subsections: [
      {
        title: "Juice — £5",
        items: [
          { name: "Orange" },
          { name: "Apple" },
          { name: "Pineapple" },
          { name: "Cranberry" },
        ],
      },
      {
        title: "Minerals",
        items: [
          { name: "Coke / Diet Coke / Coke Zero", price: "£4" },
          { name: "Fanta", price: "£6" },
          { name: "Sprite / Red Bull / Chaps (Chapman)", price: "£5" },
          { name: "Lemonade / Ginger Ale / Appetiser", price: "£5" },
          { name: "Malt / Bitter Lemon", price: "£5" },
          { name: "Soda Water / J20", price: "£3" },
        ],
      },
      {
        title: "Water",
        items: [
          { name: "Still / Sparkling 330ml", price: "£5" },
          { name: "Still / Sparkling 750ml", price: "£7" },
          { name: "Tome Still Water", price: "£5" },
        ],
      },
    ],
  },
  {
    id: "hot",
    label: "Hot Drinks",
    icon: "☕",
    accent: "from-orange-400/20 to-amber-300/10",
    items: [
      { name: "Hot Chocolate", price: "£5", desc: "Chocolate malt beverage with minerals and vitamins" },
      { name: "Lipton Yellow Label Tea", price: "£8" },
      { name: "Ginger Tea", price: "£8", desc: "Honey infused ginger tea" },
    ],
  },
];

/* ─── Sub-components ─── */

function CocktailCard({ item, price }: { item: DrinkItem; price?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 flex flex-col gap-2 hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white text-base leading-snug">{item.name}</h3>
        {(item.price || price) && (
          <span className="shrink-0 text-gold-300 font-semibold text-sm tabular-nums">
            {item.price ?? price}
          </span>
        )}
      </div>
      {item.desc && <p className="text-[13px] text-stone-500 leading-relaxed">{item.desc}</p>}
      {item.abv && (
        <span className="inline-block self-start text-[10px] font-semibold tracking-[0.15em] uppercase text-stone-600 border border-stone-700 rounded-full px-2 py-0.5">
          {item.abv}
        </span>
      )}
    </div>
  );
}

function BeerCard({ item }: { item: DrinkItem }) {
  return (
    <div className="py-3.5 border-b border-white/[0.06] last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-white text-[15px]">{item.name}</span>
          {item.abv && (
            <span className="text-[10px] font-semibold text-stone-600 tracking-wide">{item.abv}</span>
          )}
        </div>
        {item.price && (
          <span className="text-gold-300 font-semibold text-sm tabular-nums shrink-0">{item.price}</span>
        )}
      </div>
      {item.desc && <p className="mt-0.5 text-[13px] text-stone-500 leading-relaxed">{item.desc}</p>}
    </div>
  );
}

function SpiritPill({ item }: { item: DrinkItem }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
      <span className="text-[14px] font-medium text-white">{item.name}</span>
      {item.price && <span className="text-gold-300 font-semibold text-sm tabular-nums shrink-0">{item.price}</span>}
    </div>
  );
}

/* ─── Main Page ─── */
export default function DrinksPage() {
  const [activeId, setActiveId] = useState("cocktails");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);

  /* Observe which section is in view */
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(s.id);
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  function scrollTo(id: string) {
    const el = sectionRefs.current[id];
    if (el) {
      const offset = 160;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    /* Scroll the nav pill into view */
    const btn = navRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
    btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative h-[60vh] sm:h-[70vh] overflow-hidden">
        <img
          src="/reel-1.jpg"
          alt="Demi's Restaurant bar and drinks"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <p className="section-label">Demi&apos;s Restaurant &amp; Bar</p>
          <h1 className="mt-3 text-4xl sm:text-6xl font-bold text-white tracking-tight">
            Drinks Menu
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/60 max-w-md">
            Cocktails, fine wines, Nigerian palm wine and everything in between.
          </p>
          <div className="mt-8">
            <Link href="/booking" className="btn-gold text-sm">
              Reserve a Table
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Sticky category nav ─── */}
      <div className="sticky top-[72px] z-50 bg-[#1a1a1a]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div
          ref={navRef}
          className="flex items-center gap-2 overflow-x-auto px-4 sm:px-6 py-3 max-w-7xl mx-auto scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              data-id={s.id}
              onClick={() => scrollTo(s.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium tracking-[0.02em] transition-all duration-200 cursor-pointer ${
                activeId === s.id
                  ? "bg-gold-300 text-stone-900"
                  : "bg-white/[0.05] text-stone-400 hover:bg-white/[0.1] hover:text-white border border-white/[0.07]"
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Sections ─── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-24 space-y-0">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            ref={(el) => { sectionRefs.current[section.id] = el; }}
            className="py-14 sm:py-16 border-b border-white/[0.06] last:border-0"
          >
            {/* Section header */}
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br ${section.accent} border border-white/[0.08] shrink-0`}>
                {section.icon}
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-white italic tracking-tight">
                  {section.label}
                </h2>
                {section.note && (
                  <p className="mt-1 text-[13px] text-gold-300/80 font-medium">{section.note}</p>
                )}
              </div>
            </div>

            {/* Cocktails / Mocktails / Gin-ger — card grid */}
            {(section.id === "cocktails" || section.id === "mocktails" || section.id === "ginger-gordons") && section.items && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {section.items.map((item) => (
                  <CocktailCard key={item.name} item={item} price={section.id === "cocktails" ? "£15" : section.id === "mocktails" ? "£10" : undefined} />
                ))}
              </div>
            )}

            {/* Locals / Hot Drinks / Liqueurs — simple cards */}
            {(section.id === "locals" || section.id === "hot" || section.id === "liqueurs") && section.items && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item) => (
                  <CocktailCard key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* Beer & Cider — subsections with BeerCard rows */}
            {section.id === "beer" && section.subsections && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {section.subsections.map((sub) => (
                  <div key={sub.title}>
                    <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300 mb-3">{sub.title}</h3>
                    <div className="border-t border-white/10 pt-1">
                      {sub.items.map((item) => (
                        <BeerCard key={item.name} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Wines — subsections */}
            {section.id === "wines" && section.subsections && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {section.subsections.map((sub) => (
                  <div key={sub.title}>
                    <div className="flex items-baseline justify-between gap-2 mb-3">
                      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300">{sub.title}</h3>
                      {sub.note && <span className="text-[11px] text-stone-500">{sub.note}</span>}
                    </div>
                    <div className="border-t border-white/10 pt-1 space-y-2.5">
                      {sub.items.map((item) => (
                        <p key={item.name} className="text-[14px] text-stone-300 leading-snug">{item.name}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Champagne & Malt — subsections side by side */}
            {section.id === "champagne" && section.subsections && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {section.subsections.map((sub) => (
                  <div key={sub.title}>
                    <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300 mb-3">{sub.title}</h3>
                    <div className="border-t border-white/10 pt-1">
                      {sub.items.map((item) => (
                        <BeerCard key={item.name} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Spirits — subsections as pill grids */}
            {section.id === "spirits" && section.subsections && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {section.subsections.map((sub) => (
                  <div key={sub.title}>
                    <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300 mb-3">{sub.title}</h3>
                    <div className="space-y-2">
                      {sub.items.map((item) => (
                        <SpiritPill key={item.name} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Soft Drinks — subsections */}
            {section.id === "soft" && section.subsections && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {section.subsections.map((sub) => (
                  <div key={sub.title}>
                    <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300 mb-3">{sub.title}</h3>
                    <div className="border-t border-white/10 pt-1">
                      {sub.items.map((item) => (
                        <BeerCard key={item.name} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* ─── CTA ─── */}
      <section className="px-6 py-16 sm:py-24 border-t border-white/[0.06]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="heading-lg">Ready for a drink?</h2>
          <p className="mt-3 body-text">
            Visit us at Cricklewood or Streatham Hill — walk in or book a table in advance.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/booking" className="btn-gold text-xs">
              Book a Table
            </Link>
            <Link href="/locations/cricklewood" className="btn-outline-white text-xs">
              Find Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
