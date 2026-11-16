"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

/**
 * Sunday Feast pop-up: a small card that slides up at the bottom of the screen.
 *
 * Never on page load. It waits until the visitor has been browsing for 8 seconds
 * or has scrolled a third of the page, so it doesn't cover anything they came for.
 * Shown at most once every 3 days; closing it hides it for 2 days.
 * Only while Sunday Feast bookings are open and the coming Sunday isn't sold out.
 * The button adds ?src=popup, which the booking form stores so admin can count it.
 */

const STORAGE_KEY = "demis_feast_promo_next"; // timestamp before which we stay hidden
const DAY = 24 * 60 * 60 * 1000;
const SHOW_EVERY = 3 * DAY;
const AFTER_CLOSE = 2 * DAY;
const DELAY_MS = 8000;
const SCROLL_SHARE = 1 / 3;

// Pages where it would get in the way: the feast page itself, booking, staff screens.
const HIDDEN_ON = ["/sunday-feast", "/booking", "/admin", "/blog/admin", "/door", "/checkin", "/brunch-checkin", "/shoot-plans", "/vote", "/meet"];

type Avail = { bookingsOpen?: boolean; allSoldOut?: boolean; date?: string };

function readNext(): number {
  try {
    return Number(window.localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}
function hideFor(ms: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now() + ms));
  } catch {
    /* private mode or blocked storage: it just shows again next visit */
  }
}

/** "Today", "Tomorrow" or "This Sunday", counted in London days. */
function whenLabel(date: string): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const days = Math.round((Date.parse(date) - Date.parse(today)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return "This Sunday";
}

export function FeastPromo() {
  const pathname = usePathname() || "/";
  const [when, setWhen] = useState<string | null>(null);
  const [open, setOpen] = useState(false); // drives the slide-in
  const fired = useRef(false);

  const hiddenHere = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (hiddenHere || fired.current || Date.now() < readNext()) return;

    const trigger = async () => {
      if (fired.current) return;
      fired.current = true;
      cleanup();
      try {
        const d: Avail = await fetch("/api/saturday-brunch").then((r) => r.json());
        if (!d.bookingsOpen || d.allSoldOut || !d.date) return;
        hideFor(SHOW_EVERY);
        setWhen(whenLabel(d.date));
        requestAnimationFrame(() => setOpen(true));
      } catch {
        /* no pop-up if availability can't be checked */
      }
    };

    const onScroll = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (room > 0 && window.scrollY / room >= SCROLL_SHARE) trigger();
    };
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };

    const timer = setTimeout(trigger, DELAY_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    return cleanup;
  }, [hiddenHere]);

  // Moving to a page where it doesn't belong takes it away.
  useEffect(() => {
    if (hiddenHere) setOpen(false);
  }, [hiddenHere]);

  if (!when || hiddenHere) return null;

  const close = () => {
    hideFor(AFTER_CLOSE);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Sunday Feast"
      // Phones: above the floating MENU button. Desktop: bottom right corner.
      className={`fixed z-[9990] left-4 right-4 bottom-[92px] sm:left-auto sm:right-6 sm:bottom-[104px] lg:bottom-6 sm:w-[380px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
      }`}
    >
      <div className="relative flex overflow-hidden rounded-2xl border border-white/10 bg-ink-950 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
        <div className="relative w-[112px] shrink-0">
          <Image src="/feast/oct-51.webp" alt="" fill sizes="112px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1 p-4 pr-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300/80">Sunday Feast · Cricklewood</p>
          <p className="mt-1.5 text-[17px] font-semibold leading-snug text-white">{when} from 1:30pm</p>
          <p className="mt-1 text-[13px] leading-snug text-stone-400">
            Three courses to share, with a whole chicken and a whole fish. <span className="text-stone-200">£30 per person.</span>
          </p>
          <Link
            href="/sunday-feast?src=popup#book"
            onClick={() => {
              hideFor(SHOW_EVERY);
              setOpen(false);
            }}
            className="mt-3 inline-flex items-center rounded-lg bg-gold-300 px-4 py-2 text-[13px] font-semibold text-ink-900 transition hover:bg-gold-400"
          >
            Reserve a table
          </Link>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
