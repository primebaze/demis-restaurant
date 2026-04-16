"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const menuLinks = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Bulk Order", href: "/bulk-orders" },
  { label: "Cricklewood", href: "/locations/cricklewood" },
  { label: "Streatham Hill", href: "/locations/streatham" },
  { label: "Events", href: "/events" },
  { label: "Buffet Booking", href: "/booking", external: false },
  { label: "Make a Reservation", href: "/booking", external: false },
  { label: "Contact Us", href: "/contact" },
  { label: "Sustainability", href: "/sustainability" },
  { label: "Privacy Policy", href: "/privacy" },
];

export function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Show on scroll up, hide on scroll down
  useEffect(() => {
    function handleScroll() {
      const y = window.scrollY;
      if (y < 100) {
        setVisible(true);
      } else if (y < lastScrollY.current) {
        setVisible(true);
      } else if (y > lastScrollY.current + 10) {
        setVisible(false);
        setIsOpen(false);
      }
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div
      ref={menuRef}
      className={`fixed bottom-6 left-4 right-4 z-[9999] sm:left-6 sm:right-6 md:left-auto md:right-8 md:bottom-8 md:w-[400px] pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
      }`}
    >
      {/* Expanded menu */}
      <div
        className={`pointer-events-auto bg-white rounded-[1.75rem] shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? "max-h-[70vh] opacity-100 mb-3 p-8 scale-100"
            : "max-h-0 opacity-0 mb-0 p-0 scale-95 !pointer-events-none"
        }`}
      >
        <nav className="space-y-1">
          {menuLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="block py-3 px-2 text-lg font-light text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all duration-200"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block py-3 px-2 text-lg font-light text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all duration-200"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>
      </div>

      {/* Floating MENU button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        className={`pointer-events-auto w-full rounded-full shadow-lg flex items-center justify-center gap-3 py-4 sm:py-5 transition-all duration-300 hover:shadow-xl active:scale-[0.98] cursor-pointer ${
          isOpen ? "bg-stone-100" : "bg-white"
        }`}
      >
        {/* Hamburger / X icon */}
        <div className="relative w-5 h-4 flex flex-col justify-between">
          <span
            className={`block h-[1.5px] w-full bg-stone-800 transition-all duration-300 origin-center ${
              isOpen ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`block h-[1.5px] w-full bg-stone-800 transition-all duration-300 ${
              isOpen ? "opacity-0 scale-x-0" : ""
            }`}
          />
          <span
            className={`block h-[1.5px] w-full bg-stone-800 transition-all duration-300 origin-center ${
              isOpen ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </div>
        <span className="text-sm font-medium tracking-[0.25em] uppercase text-stone-800">
          {isOpen ? "Close" : "Menu"}
        </span>
      </button>
    </div>
  );
}
