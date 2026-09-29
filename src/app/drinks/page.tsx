"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

import { SECTIONS, type DrinkItem } from "@/data/drinksData";

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
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/drinks.mp4" type="video/mp4" />
        </video>
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
            <Link href="/menu" className="btn-outline-white text-xs">
              View Food Menu
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
