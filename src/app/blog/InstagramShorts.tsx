"use client";

import { useRef } from "react";
import type { InstaItem } from "@/lib/instagram";

export function InstagramShorts({ items }: { items: InstaItem[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section className="mt-16 pt-10 border-t border-white/5">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-display)]">
          Shorts
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll(-1)}
            aria-label="Previous"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white hover:bg-white/10 transition"
          >
            ‹
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Next"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white hover:bg-white/10 transition"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it) => (
          <a
            key={it.id}
            href={it.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group shrink-0 w-[44%] sm:w-[31%] lg:w-[23%] snap-start"
          >
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.thumb}
                alt={it.caption || "Instagram post"}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              {it.isVideo && (
                <span className="absolute top-3 left-3 flex items-center gap-1 text-white text-xs font-medium drop-shadow">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-xs text-white leading-snug line-clamp-2">{it.caption}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
