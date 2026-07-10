"use client";

import { useEffect, useRef } from "react";

/**
 * Autoplaying hero video. React doesn't reliably emit the `muted` attribute into
 * the initial HTML, which makes browsers block autoplay, so we force muted + play
 * on mount here. Falls back to the poster image if autoplay is still refused.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {
      /* autoplay refused (e.g. data saver) — poster stays, no error */
    });
  }, []);

  return (
    <video
      ref={ref}
      className="w-full h-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/buffet.jpg"
    >
      <source src="/buffet.mp4" type="video/mp4" />
    </video>
  );
}
