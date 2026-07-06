"use client";

import { useEffect, useState } from "react";

type Ad = { id: string; title: string; imageUrl: string; linkUrl: string };

/**
 * Rotating ad banner. Fetches active ads from the public API and cross-fades
 * between them every few seconds. Renders nothing if there are no ads.
 */
export function AdCarousel({ className = "" }: { className?: string }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/blog/ads")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setAds(Array.isArray(d.ads) ? d.ads : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % ads.length), 6000);
    return () => clearInterval(t);
  }, [ads.length]);

  if (ads.length === 0) return null;

  return (
    <section className={`mt-16 ${className}`}>
      <div className="relative w-full aspect-[16/5] sm:aspect-[16/4] rounded-2xl overflow-hidden border border-white/10 bg-[#141414]">
        {ads.map((ad, idx) => {
          const inner = (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={ad.imageUrl}
              alt={ad.title || "Advertisement"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          );
          return (
            <div
              key={ad.id}
              className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
                idx === i ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {ad.linkUrl ? (
                <a
                  href={`/api/blog/ads/${ad.id}/click`}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="block w-full h-full"
                >
                  {inner}
                </a>
              ) : (
                inner
              )}
            </div>
          );
        })}

        {/* Sponsored label */}
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[10px] uppercase tracking-widest text-white/80">
          Sponsored
        </span>

        {/* Dots */}
        {ads.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
            {ads.map((ad, idx) => (
              <button
                key={ad.id}
                onClick={() => setI(idx)}
                aria-label={`Show ad ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-5 bg-gold-300" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
