"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type Photo = { src: string; alt: string; caption?: string };

/** Moves on by one photo every second. */
const INTERVAL_MS = 1000;
/** After a swipe, tap or dot press, wait this long before moving on again. */
const RESUME_AFTER_TOUCH_MS = 4000;

/**
 * Sunday Feast photo slider. Moves on its own, one photo every second, and
 * loops without a jump: the photos are rendered twice, and once the second copy
 * starts, it quietly resets by one copy's width to the identical spot in the first.
 * Swipeable by hand, with dots to jump to a photo. Pauses under the mouse, on
 * touch, while the tab is hidden, and never moves for visitors who ask for
 * reduced motion.
 */
export function FeastSlider({ photos }: { photos: Photo[] }) {
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>();
  const [active, setActive] = useState(0);

  /** Distance between two slides, gap included. */
  const step = useCallback(() => {
    const s = track.current?.children;
    if (!s || s.length < 2) return 0;
    return (s[1] as HTMLElement).offsetLeft - (s[0] as HTMLElement).offsetLeft;
  }, []);

  const pauseFor = useCallback((ms: number) => {
    paused.current = true;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => (paused.current = false), ms);
  }, []);

  // Which photo is at the start of the track, for the dots.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const st = step();
      if (st) setActive(Math.round(el.scrollLeft / st) % photos.length);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [photos.length, step]);

  // The auto-advance.
  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onEnter = () => {
      paused.current = true;
      clearTimeout(resumeTimer.current);
    };
    const onLeave = () => (paused.current = false);
    const onTouchStart = () => onEnter();
    const onTouchEnd = () => pauseFor(RESUME_AFTER_TOUCH_MS);

    const tick = setInterval(() => {
      if (paused.current || document.hidden) return;
      const st = step();
      if (!st) return;
      const loop = st * photos.length;
      if (el.scrollLeft >= loop - 2) el.scrollTo({ left: el.scrollLeft - loop, behavior: "auto" });
      el.scrollBy({ left: st, behavior: "smooth" });
    }, INTERVAL_MS);

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      clearInterval(tick);
      clearTimeout(resumeTimer.current);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [photos.length, pauseFor, step]);

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    pauseFor(RESUME_AFTER_TOUCH_MS);
    el.scrollTo({ left: i * step(), behavior: "smooth" });
  };

  return (
    <section aria-label="Photos of the Sunday Feast" className="-mx-6 sm:mx-0">
      <div
        ref={track}
        // Soft fade at both edges so photos slide in and out instead of being cut off.
        className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-6 sm:scroll-px-0 px-6 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_92%,transparent)] sm:[mask-image:linear-gradient(to_right,black,black_90%,transparent)]"
      >
        {[...photos, ...photos].map((p, i) => {
          const copy = i >= photos.length; // the second set exists only to make the loop seamless
          return (
            <figure
              key={`${p.src}-${i}`}
              aria-hidden={copy || undefined}
              className="group relative m-0 w-[64%] sm:w-[38%] lg:w-[23%] shrink-0 snap-start aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-white/[0.06]"
            >
              <Image
                src={p.src}
                alt={copy ? "" : p.alt}
                fill
                sizes="(min-width: 1024px) 270px, (min-width: 640px) 38vw, 64vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                priority={i < 2}
              />
              {p.caption && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-3.5 pt-10 text-[13px] font-semibold text-white">
                  {p.caption}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>

      {/* Where you are in the set. Tap a dot to jump to that photo. */}
      <div className="mt-4 flex justify-center gap-1.5" role="group" aria-label="Choose a photo">
        {photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Show photo ${i + 1}: ${p.caption ?? p.alt}`}
            aria-current={active === i || undefined}
            className={`h-1.5 rounded-full transition-all duration-300 ${active === i ? "w-5 bg-gold-300" : "w-1.5 bg-white/20 hover:bg-white/40"}`}
          />
        ))}
      </div>
    </section>
  );
}
