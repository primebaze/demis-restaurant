"use client";

import { useState, useMemo } from "react";

/* ─────────── types ─────────── */
type MenuItem = {
  name: string;
  price?: number;
  desc: string;
  v?: boolean;
  spicy?: boolean;
};

type MenuCategory = {
  title: string;
  subtitle?: string;
  items: MenuItem[];
};

/* ─────────── data ─────────── */
const ALL_CATEGORIES: MenuCategory[] = [
  {
    title: "Starters",
    items: [
      { name: "Assorted Goat Meat Peppersoup", price: 15, desc: "Tender assorted goat meat cooked in peppersoup spices and scent leaf", v: true, spicy: true },
      { name: "Iseewu", price: 30, desc: "Full goat head slow cooked in a native palm oil base sauce garnished with utazi leaves and onions" },
      { name: "Peppered Snail", price: 30, desc: "Crunchy giant snails cooked in pepper sauce and mixed pepper" },
      { name: "Moimoi", price: 5, desc: "Slow cooked peeled beans blended with peppers and crayfish" },
      { name: "Chicken Wings", price: 12, desc: "Grilled marinated full wings in sweet and spicy sauce" },
      { name: "Catfish Peppersoup", price: 20, desc: "Catfish cooked in peppersoup spice and scent leaf crayfish", spicy: true },
      { name: "Nkwobi", price: 15, desc: "Boneless cowfoot cooked in a palm oil base sauce with pepper and ugba" },
      { name: "Spicy Chopped Beef", price: 14, desc: "Diced tender beef cut in spicy sauce with mixed pepper" },
      { name: "Spicy Turkey", price: 15, desc: "Smoked turkey in spicy sauce. Garnished with mixed pepper" },
      { name: "Gizzard & Plantain", price: 12, desc: "Sweet and spicy flavour. Crispy chicken gizzard and diced plantain cooked in pepper sauce" },
    ],
  },
  {
    title: "Grills",
    items: [
      { name: "Beef Suya", price: 15, desc: "Charcoal grilled succulent beef cuts served with onions, tomatoes & yaji" },
      { name: "Lamb Suya", price: 15, desc: "Charcoal grilled lamb cut served with onions, tomatoes and yaji" },
      { name: "Chicken Suya", price: 15, desc: "Charcoal grilled boneless chicken. Served with onions, tomatoes and yaji" },
      { name: "Asun", price: 15, desc: "Wood grilled spicy goat meat", spicy: true },
      { name: "Grilled Croaker", price: 30, desc: "Grilled marinated whole fish served with mix pepper and a side of fried plantain or yam" },
      { name: "Grilled Tilapia", price: 30, desc: "Grilled marinated whole fish served with mix pepper and a side of fried plantain or yam" },
    ],
  },
  {
    title: "Rice Meals",
    subtitle: "Served with plantain and your choice of protein: Assorted meat / Asun (+10) / Beef / Chicken / Fresh Fish (+5) / Goat Meat / Turkey (+3) / Fried Fish (+3)",
    items: [
      { name: "Jollof Rice", price: 26, desc: "Smoky tasty basmati rice slow cooked in our signature pepper base", v: true },
      { name: "Fried Rice", price: 20, desc: "Stir fry green rice with crispy vegetables", v: true },
      { name: "White Rice", price: 20, desc: "Lightly salted long green rice", v: true },
      { name: "White Rice with Ayamase", price: 20, desc: "White rice served with assorted meat cooked in a spicy green pepper sauce" },
      { name: "White Rice with Designer Stew", price: 20, desc: "White rice served with beef cooked in a spicy pepper sauce" },
    ],
  },
  {
    title: "Beans Meal",
    subtitle: "Served with plantain and your choice of protein: Assorted meat / Beef / Chicken / Fresh Fish (+5) / Goat Meat / Fried Fish (+3) / Turkey (+3)",
    items: [
      { name: "Plain Beans", price: 20, desc: "Honey sweet beans slow cooked for extra juiciness served with pepper sauce", v: true },
      { name: "Porridge Beans", price: 20, desc: "African sweet beans cooked in a palm oil base with pepper, onions and crayfish" },
      { name: "Ewa Aganyin", price: 20, desc: "Mashed sweet beans served with our signature aganyin sauce made from blended oil red pepper and chilli seeds", v: true },
    ],
  },
  {
    title: "Yam Meals",
    subtitle: "Served with your choice of protein: Assorted meat / Beef / Chicken / Fresh Fish (+5) / Fried Fish (+3) / Goat Meat / Turkey (+3)",
    items: [
      { name: "Yam Porridge", price: 25, desc: "Yam chunks cooked in a pepper palm oil base with vegetable, pepper and crayfish", v: true },
      { name: "Yam Peppersoup", price: 25, desc: "Yam chunks in a spicy aromatic broth and scent leaf with assorted goat meat" },
      { name: "Yam & Fried Egg", price: 25, desc: "Boiled yam served with saucy fried egg", v: true },
      { name: "Boiled Yam & Vegetable Sauce", price: 25, desc: "Boiled yam served with vegetable sauce (spinach)", v: true },
    ],
  },
  {
    title: "Seafood Special",
    subtitle: "Served with your choice of: Amala / Eba / Oat Meal / Pounded Yam / Semolina",
    items: [
      { name: "Fisherman Soup", price: 30, desc: "Half shelled mussels, squid rings, snails, king prawns, fresh fish cooked in blended cocoa-yam base with snail curl leafy finger" },
      { name: "Seafood Okra", price: 30, desc: "Mussels, squid rings, snails, king prawns and fresh fish cooked in and big cut leafy finger" },
      { name: "Seafood Eforiro", price: 30, desc: "Mussels, squid rings, snails, king prawns and fresh fish cooked in vegetable and pepper sauce" },
      { name: "Ofe Nsala", price: 30, desc: "Velvety white soup simmered with catfish and aromatic native spices" },
    ],
  },
  {
    title: "Soup Meals",
    subtitle: "Served with your choice of swallow and protein: Amala / Eba / Oat Meal / Pounded Yam / Semolina. Assorted meat / Beef / Chicken / Fresh Fish (+5) / Fried Fish (+3) / Goat Meat / Turkey (+3)",
    items: [
      { name: "Egusi", price: 20, desc: "Slow cooked, grounded melon seed with vegetables" },
      { name: "Eforiro", price: 20, desc: "Spinach cooked in a pepper base sauce with locust beans and dried prawns", v: true },
      { name: "Ewedu", price: 20, desc: "Draw soupy texture vegetable cooked with locust beans and perfect with our signature buka stew and any swallow", v: true },
      { name: "Ogbono", price: 20, desc: "Smoothly blended bush mango seeds cooked in a palm oil base with pumpkin leaves" },
      { name: "Plain Okra", price: 20, desc: "Chopped lady fingers served with buka stew", v: true },
      { name: "Groundnut Soup", price: 20, desc: "Smoothly blended peanut slow cooked with vegetables", v: true },
      { name: "Edikankong", price: 22, desc: "Blanched vegetables (waterleaf and pumpkin leaf) cooked in a palm oil base with chunks of mangala fish" },
      { name: "Afang", price: 22, desc: "Blanched vegetables (waterleaf and okazi leaf) cooked in palm oil base with chunks of mangala fish" },
      { name: "Banga", price: 22, desc: "Palm kernel extracts cooked with beletete leaves", v: true },
      { name: "Bitterleaf", price: 22, desc: "Bitterleaf vegetable cooked with blended cocoa-yam and ogiri" },
      { name: "Abula", price: 22, desc: "Blended beans sauce and ewedu and gbegiri served with buka stew traditionally served with amala to fele" },
      { name: "Mixed Okra", price: 22, desc: "Chopped lady fingers with vegetables and uziza seeds" },
      { name: "Oha", price: 22, desc: "Oha leaves cooked with blended cocoa-yam and uziza seeds" },
      { name: "Okro Ogbono", price: 22, desc: "A refined blend of silky ogbono with okra" },
    ],
  },
  {
    title: "Street Food",
    items: [
      { name: "Noodles Peppersoup", price: 20, desc: "Noodles cooked in our aromatic broth with herbs, spices and mixed peppers", v: true },
      { name: "Spaghetti", price: 20, desc: "Stir fry spaghetti with mixed pepper", v: true },
      { name: "Plantain Porridge", price: 20, desc: "Diced plantain slow cooked in a palm oil base pepper and crayfish garnish with pumpkin leaves", v: true },
      { name: "Boli & Fish with Groundnut", price: 20, desc: "Roasted plantain with smoked mackerel fish served with vegetable sauce", v: true },
    ],
  },
  {
    title: "Platters",
    items: [
      { name: "Starter Platter", price: 40, desc: "Fried plantain, spring rolls, samosa, spicy turkey & chicken wings" },
      { name: "Suya Platter", price: 50, desc: "Chicken suya, beef suya, lamb suya with fried plantain or yam" },
      { name: "Seafood Platter", price: 80, desc: "Lobster, corn, egg, boiled plantain, prawns, mussels" },
      { name: "Vegetarian Platter", price: 50, desc: "Fried yam, fried plantain/boli, beans, vegetable sauce, jollof rice or fried rice" },
    ],
  },
];

/* ─────────── sub-components ─────────── */
function ItemRow({ item, query }: { item: MenuItem; query: string }) {
  return (
    <div className="py-3 sm:py-3.5 border-b border-white/[0.06] last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-white text-[15px] leading-snug">
          <Highlight text={item.name} query={query} />
          {item.v && <span className="ml-1.5 text-[10px] font-bold text-emerald-400 align-super">V</span>}
          {item.spicy && <span className="ml-1 text-[10px] align-super">🌶</span>}
        </h3>
        {item.price != null && (
          <span className="text-gold-300 font-semibold text-sm tabular-nums shrink-0">
            £{item.price}
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-stone-500 leading-relaxed">
        <Highlight text={item.desc} query={query} />
      </p>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-gold-300/25 text-white rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function CategoryHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white italic tracking-tight leading-none">
      {children}
    </h2>
  );
}

function SubtitleNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs text-stone-500 leading-relaxed max-w-md">{children}</p>
  );
}

/* ─────────── main component ─────────── */
export default function MenuContent() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_CATEGORIES;
    const q = query.toLowerCase();
    return ALL_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  const totalResults = filtered.reduce((sum, c) => sum + c.items.length, 0);
  const isSearching = query.trim().length > 0;

  return (
    <>
      {/* ─── Search bar ─── */}
      <section className="px-4 sm:px-6 pb-2">
        <div className="mx-auto max-w-7xl">
          <div className="relative max-w-md mx-auto">
            {/* Search icon */}
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu…"
              className="w-full rounded-full border border-white/10 bg-white/[0.04] pl-11 pr-10 py-3 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-gold-300/40 focus:bg-white/[0.06] transition-all"
            />
            {/* Clear button */}
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-stone-500 hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {/* Result count */}
          {isSearching && (
            <p className="text-center text-xs text-stone-500 mt-3">
              {totalResults === 0
                ? "No dishes found — try a different search"
                : `${totalResults} dish${totalResults === 1 ? "" : "es"} found`}
            </p>
          )}
        </div>
      </section>

      {/* ─── Search results (flat list) ─── */}
      {isSearching ? (
        <section className="py-8 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            {filtered.map((cat) => (
              <div key={cat.title} className="mb-10 last:mb-0">
                <CategoryHeader>{cat.title}</CategoryHeader>
                {cat.subtitle && <SubtitleNote>{cat.subtitle}</SubtitleNote>}
                <div className="mt-5 border-t border-white/10 pt-1 grid grid-cols-1 md:grid-cols-2 gap-x-12">
                  {cat.items.map((item) => (
                    <ItemRow key={item.name} item={item} query={query} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          {/* ═══════════ ROW 1 — STARTERS + GRILLS ═══════════ */}
          <section className="py-8 sm:py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
                <div>
                  <CategoryHeader>Starters</CategoryHeader>
                  <div className="mt-5 border-t border-white/10 pt-1">
                    {ALL_CATEGORIES[0].items.map((item) => <ItemRow key={item.name} item={item} query="" />)}
                  </div>
                </div>
                <div>
                  <CategoryHeader>Grills</CategoryHeader>
                  <div className="mt-5 border-t border-white/10 pt-1">
                    {ALL_CATEGORIES[1].items.map((item) => <ItemRow key={item.name} item={item} query="" />)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════ ROW 2 — RICE / BEANS / YAM / SEAFOOD ═══════════ */}
          <section className="py-8 sm:py-12 border-t border-white/[0.06]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-10 lg:gap-12">
                {ALL_CATEGORIES.slice(2, 6).map((cat) => (
                  <div key={cat.title}>
                    <CategoryHeader>{cat.title}</CategoryHeader>
                    {cat.subtitle && <SubtitleNote>{cat.subtitle}</SubtitleNote>}
                    <div className="mt-5 border-t border-white/10 pt-1">
                      {cat.items.map((item) => <ItemRow key={item.name} item={item} query="" />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════ ROW 3 — SOUPS + STREET FOOD ═══════════ */}
          <section className="py-8 sm:py-12 border-t border-white/[0.06]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-10 lg:gap-16">
                <div>
                  <CategoryHeader>Soup Meals</CategoryHeader>
                  <SubtitleNote>{ALL_CATEGORIES[6].subtitle}</SubtitleNote>
                  <div className="mt-5 border-t border-white/10 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                    {ALL_CATEGORIES[6].items.map((item) => <ItemRow key={item.name} item={item} query="" />)}
                  </div>
                </div>
                <div>
                  <CategoryHeader>Street Food</CategoryHeader>
                  <div className="mt-5 border-t border-white/10 pt-1">
                    {ALL_CATEGORIES[7].items.map((item) => <ItemRow key={item.name} item={item} query="" />)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════ ROW 4 — PLATTERS + SIDES ═══════════ */}
          <section className="py-8 sm:py-12 border-t border-white/[0.06]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16">
                <div>
                  <CategoryHeader>Platters</CategoryHeader>
                  <div className="mt-5 border-t border-white/10 pt-1">
                    {ALL_CATEGORIES[8].items.map((item) => <ItemRow key={item.name} item={item} query="" />)}
                  </div>
                </div>
                <div>
                  <CategoryHeader>Sides</CategoryHeader>
                  <div className="mt-5 border-t border-white/10 pt-1">
                    <div className="py-4 border-b border-white/[0.06]">
                      <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300 mb-2">Soup Only</h4>
                      <p className="text-[13px] text-stone-400 leading-relaxed">Eforiro &bull; Egusi &bull; Ogbono &bull; Groundnut Soup <span className="text-gold-300/70 ml-1">£12</span></p>
                      <p className="text-[13px] text-stone-400 leading-relaxed mt-1">Ewedu with Stew &bull; Okra with Stew <span className="text-gold-300/70 ml-1">£12</span></p>
                      <p className="text-[13px] text-stone-400 leading-relaxed mt-1">Edikankong &bull; Afang &bull; Banga &bull; Oha &bull; Bitterleaf <span className="text-gold-300/70 ml-1">£12</span></p>
                    </div>
                    <div className="py-4 border-b border-white/[0.06]">
                      <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300 mb-2">Soup with Protein / Fresh Fish</h4>
                      <p className="text-[13px] text-stone-400 leading-relaxed">Eforiro &bull; Egusi &bull; Ogbono &bull; Groundnut Soup <span className="text-gold-300/70 ml-1">£16</span></p>
                      <p className="text-[13px] text-stone-400 leading-relaxed mt-1">Ewedu with Stew &bull; Okra with Stew &bull; Abula <span className="text-gold-300/70 ml-1">£16</span></p>
                      <p className="text-[13px] text-stone-400 leading-relaxed mt-1">Edikankong &bull; Afang &bull; Banga &bull; Oha &bull; Bitterleaf <span className="text-gold-300/70 ml-1">£16</span></p>
                    </div>
                    <div className="py-4 border-b border-white/[0.06]">
                      <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300 mb-2">Rice Only</h4>
                      <p className="text-[13px] text-stone-400 leading-relaxed">White Rice <span className="text-gold-300/70">£9</span> &bull; Jollof Rice <span className="text-gold-300/70">£10</span> &bull; Fried Rice <span className="text-gold-300/70">£12</span></p>
                    </div>
                    <div className="py-4 border-b border-white/[0.06]">
                      <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300 mb-2">Beans Only</h4>
                      <p className="text-[13px] text-stone-400 leading-relaxed">Plain Beans &bull; Ewa Aganyin &bull; Porridge Beans <span className="text-gold-300/70 ml-1">£12</span></p>
                    </div>
                    <div className="py-4 border-b border-white/[0.06]">
                      <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300 mb-2">Sauce &amp; Meat</h4>
                      <p className="text-[13px] text-stone-400 leading-relaxed mb-1">Assorted Meat &bull; Chicken &bull; Beef &bull; Goat Meat</p>
                      <p className="text-[13px] text-stone-400 leading-relaxed">Stew/Meat &bull; Spicy Sauce &bull; Mild Sauce &bull; Pot Sauce &bull; Ayamase Sauce &bull; Designer Stew <span className="text-gold-300/70 ml-1">£14</span></p>
                    </div>
                    <div className="py-4">
                      <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300 mb-2">Extras</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[13px] text-stone-400">
                        <p>Fried Yam <span className="text-emerald-400 text-[10px] font-bold">V</span> <span className="text-gold-300/70">£10</span></p>
                        <p>Fried Plantain <span className="text-emerald-400 text-[10px] font-bold">V</span> <span className="text-gold-300/70">£8</span></p>
                        <p>Extra Swallow <span className="text-emerald-400 text-[10px] font-bold">V</span> <span className="text-gold-300/70">£5</span></p>
                        <p>Boli <span className="text-emerald-400 text-[10px] font-bold">V</span> <span className="text-gold-300/70">£10</span></p>
                        <p>Potato Fries <span className="text-emerald-400 text-[10px] font-bold">V</span> <span className="text-gold-300/70">£8</span></p>
                        <p>Sweet Potato Fries <span className="text-emerald-400 text-[10px] font-bold">V</span> <span className="text-gold-300/70">£7</span></p>
                        <p>Chicken <span className="text-gold-300/70">£10</span></p>
                        <p>1 Piece of Meat <span className="text-gold-300/70">£5</span></p>
                        <p>Salad <span className="text-emerald-400 text-[10px] font-bold">V</span> <span className="text-gold-300/70">£10</span></p>
                        <p>Yam Porridge <span className="text-emerald-400 text-[10px] font-bold">V</span> <span className="text-gold-300/70">£15</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Allergy note ─── */}
          <section className="py-6 sm:py-8 border-t border-white/[0.06]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 sm:p-8 text-center">
                <p className="text-xs text-stone-500 leading-relaxed max-w-2xl mx-auto">
                  <span className="font-semibold text-stone-400">Psst…</span> We don&apos;t list everything on the menu so please let us know if you&apos;re allergic, intolerant or sensitive to anything, or concerned about cross-contamination. All dishes may contain traces of nuts.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ─── CTA ─── */}
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="heading-lg">Ready to eat?</h2>
          <p className="mt-3 body-text">
            Dine in, book a table, or order in bulk for delivery across London.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <a href="/booking" className="btn-gold text-xs">
              Book a Table
            </a>
            <a href="https://dropoff.demisrestaurant.co.uk" target="_blank" rel="noopener noreferrer" className="btn-outline-white text-xs">
              Bulk Order
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
