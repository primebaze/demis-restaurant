"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

type Photo = { src: string; alt: string };

/** Moves on by one photo every 2 seconds. */
const INTERVAL_MS = 2000;
/** After a swipe or tap, wait this long before moving on again. */
const RESUME_AFTER_TOUCH_MS = 4000;

/**
 * Sunday Feast photo slider. Moves on its own, one photo every 2 seconds, and
 * loops without a jump: the photos are rendered twice, and once the second copy
 * starts, it quietly resets by one copy's width to the identical spot in the first.
 * Swipeable by hand; pauses under the mouse, on touch, while the tab is hidden,
 * and not at all for visitors who ask for reduced motion.
 */
export function FeastSlider({ photos }: { photos: Photo[] }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let paused = false;
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    const pause = () => {
      paused = true;
      clearTimeout(resumeTimer);
    };
    const resume = (delay = 0) => {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => (paused = false), delay);
    };
    const onEnter = () => pause();
    const onLeave = () => resume();
    const onTouchStart = () => pause();
    const onTouchEnd = () => resume(RESUME_AFTER_TOUCH_MS);

    const tick = setInterval(() => {
      if (paused || document.hidden) return;
      const slides = el.children;
      if (slides.length < 2) return;
      // One step = the distance between two slides, so gaps are included.
      const step = (slides[1] as HTMLElement).offsetLeft - (slides[0] as HTMLElement).offsetLeft;
      const loop = step * photos.length;
      if (el.scrollLeft >= loop - 2) el.scrollTo({ left: el.scrollLeft - loop, behavior: "auto" });
      el.scrollBy({ left: step, behavior: "smooth" });
    }, INTERVAL_MS);

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      clearInterval(tick);
      clearTimeout(resumeTimer);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [photos.length]);

  return (
    <section aria-label="Photos of the Sunday Feast" className="-mx-6 sm:mx-0">
      <div
        ref={track}
        className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-6 sm:scroll-px-0 px-6 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {[...photos, ...photos].map((p, i) => {
          const copy = i >= photos.length; // the second set exists only to make the loop seamless
          return (
            <div
              key={`${p.src}-${i}`}
              aria-hidden={copy || undefined}
              className="relative w-[64%] sm:w-[38%] lg:w-[23%] shrink-0 snap-start aspect-[4/5] overflow-hidden rounded-2xl"
            >
              <Image
                src={p.src}
                alt={copy ? "" : p.alt}
                fill
                sizes="(min-width: 1024px) 270px, (min-width: 640px) 38vw, 64vw"
                className="object-cover"
                priority={i < 2}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
