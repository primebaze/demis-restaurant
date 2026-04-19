"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ALL_CATEGORIES } from "@/data/menuData";

/* ── Link sets ── */
const DESKTOP_LINKS = [
  { label: "Menu", href: "/menu" },
  { label: "Cricklewood", href: "/locations/cricklewood" },
  { label: "Streatham Hill", href: "/locations/streatham" },
  { label: "Events", href: "/events" },
  { label: "Bulk Order", href: "https://dropoff.demisrestaurant.co.uk" },
  { label: "Contact", href: "/contact" },
];

const MOBILE_LINKS = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Bulk Order", href: "https://dropoff.demisrestaurant.co.uk" },
  { label: "Cricklewood", href: "/locations/cricklewood" },
  { label: "Streatham Hill", href: "/locations/streatham" },
  { label: "Events", href: "/events" },
  { label: "Book a Table", href: "/booking" },
  { label: "Contact Us", href: "/contact" },
  { label: "Sustainability", href: "/sustainability" },
  { label: "Privacy Policy", href: "/privacy" },
];

/* ── Search highlight for desktop food menu ── */
function SearchHighlight({ text, query }: { text: string; query: string }) {
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

/* ── Scroll progress bar ──  */
function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const top = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? (top / height) * 100 : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] z-10">
      <div
        className="h-full bg-gradient-to-r from-gold-400 via-gold-300 to-gold-200 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function FloatingMenu() {
  const pathname = usePathname();

  /* ── Shared scroll state ── */
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);

  /* ── Mobile state ── */
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);

  /* ── Desktop food menu state ── */
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [menuSearch, setMenuSearch] = useState("");
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const itemsScrollRef = useRef<HTMLDivElement>(null);

  /* ── Desktop pill indicator ── */
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef(new Map<string, HTMLElement>());
  const [pill, setPill] = useState({ left: 0, width: 0, opacity: 0 });

  /* ── Cursor spotlight ── */
  const [spotlightX, setSpotlightX] = useState(-200);
  const [spotlightVisible, setSpotlightVisible] = useState(false);

  /* ── Hide on admin pages ── */
  const isAdmin = pathname.startsWith("/admin");

  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  /* ── Scroll handler ── */
  useEffect(() => {
    function handleScroll() {
      const y = window.scrollY;
      setScrolled(y > 50);
      if (y < 100) {
        setVisible(true);
      } else if (y < lastScrollY.current) {
        setVisible(true);
      } else if (y > lastScrollY.current + 10) {
        setVisible(false);
        setMobileOpen(false);
        setDesktopMenuOpen(false);
      }
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ── Close mobile on outside click ── */
  useEffect(() => {
    if (!mobileOpen && !desktopMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (mobileOpen && mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
      if (desktopMenuOpen && desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as Node)) {
        setDesktopMenuOpen(false);
        setMenuSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileOpen, desktopMenuOpen]);

  /* ── Close on Escape ── */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setDesktopMenuOpen(false);
        setMenuSearch("");
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  /* ── Desktop food menu: filtered items ── */
  const filteredCategories = useMemo(() => {
    if (!menuSearch.trim()) return ALL_CATEGORIES;
    const q = menuSearch.toLowerCase();
    return ALL_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [menuSearch]);

  const isSearchingMenu = menuSearch.trim().length > 0;
  const totalSearchResults = filteredCategories.reduce((sum, c) => sum + c.items.length, 0);

  /* ── Reset category when closing desktop menu ── */
  useEffect(() => {
    if (!desktopMenuOpen) {
      setMenuSearch("");
      setActiveCategory(0);
    }
  }, [desktopMenuOpen]);

  /* ── Scroll items to top when switching categories ── */
  useEffect(() => {
    if (itemsScrollRef.current) {
      itemsScrollRef.current.scrollTop = 0;
    }
  }, [activeCategory]);

  /* ── Desktop pill: compute rect for a given href ── */
  const getPillRect = useCallback((href: string) => {
    const navEl = desktopNavRef.current;
    const linkEl = linkRefs.current.get(href);
    if (!navEl || !linkEl) return null;
    const nb = navEl.getBoundingClientRect();
    const lb = linkEl.getBoundingClientRect();
    return { left: lb.left - nb.left, width: lb.width };
  }, []);

  /* ── Desktop pill: snap to active link ── */
  const moveToActive = useCallback(() => {
    const activeLink = DESKTOP_LINKS.find((l) => isActive(l.href));
    if (activeLink) {
      const r = getPillRect(activeLink.href);
      if (r) setPill({ ...r, opacity: 1 });
      else setPill((p) => ({ ...p, opacity: 0 }));
    } else {
      setPill((p) => ({ ...p, opacity: 0 }));
    }
  }, [isActive, getPillRect]);

  /* ── Recalculate on mount, pathname change, resize ── */
  useEffect(() => {
    const t = setTimeout(moveToActive, 60);
    window.addEventListener("resize", moveToActive);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", moveToActive);
    };
  }, [moveToActive]);

  function handleLinkHover(href: string) {
    const r = getPillRect(href);
    if (r) setPill({ ...r, opacity: 1 });
  }

  function handleNavLeave() {
    moveToActive();
    setSpotlightVisible(false);
  }

  function handleNavMouseMove(e: React.MouseEvent) {
    const navEl = desktopNavRef.current;
    if (!navEl) return;
    const bounds = navEl.getBoundingClientRect();
    setSpotlightX(e.clientX - bounds.left);
    setSpotlightVisible(true);
  }

  if (isAdmin) return null;

  return (
    <>
      {/* ═══════════════════════════════════════════
          DESKTOP NAV (lg+) — Glassmorphic top bar
          ═══════════════════════════════════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-[9999] hidden lg:block transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div
          className={`relative transition-all duration-500 ${
            scrolled
              ? "bg-[#1a1a1a]/80 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
              : "bg-gradient-to-b from-black/60 via-black/25 to-transparent"
          }`}
        >
          {/* Scroll progress */}
          <ScrollProgress />

          {/* Subtle gold bottom border on scroll */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-px transition-opacity duration-500 ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(232,204,156,0.15), transparent)",
            }}
          />

          <div className="mx-auto max-w-7xl px-8 flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="group flex items-baseline gap-2.5 shrink-0">
              <span className="text-[1.4rem] font-bold text-white tracking-[0.06em] transition-all duration-300 group-hover:text-gold-300">
                DEMI&apos;S
              </span>
              <span className="text-[9px] tracking-[0.35em] uppercase text-gold-300/60 font-medium hidden xl:inline transition-colors duration-300 group-hover:text-gold-300/90">
                Nigerian Restaurant
              </span>
            </Link>

            {/* Centre nav links with sliding pill + spotlight */}
            <nav
              ref={desktopNavRef}
              onMouseLeave={handleNavLeave}
              onMouseMove={handleNavMouseMove}
              className="relative flex items-center gap-0.5"
            >
              {/* Cursor spotlight glow */}
              <div
                className="absolute inset-y-0 w-40 -z-0 pointer-events-none transition-opacity duration-300"
                style={{
                  left: spotlightX - 80,
                  opacity: spotlightVisible ? 1 : 0,
                  background:
                    "radial-gradient(ellipse 80px 40px at center, rgba(232,204,156,0.07) 0%, transparent 100%)",
                }}
              />

              {/* Sliding pill background */}
              <div
                className="absolute h-9 rounded-full -z-0 transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  left: pill.left,
                  width: pill.width,
                  opacity: pill.opacity,
                  background: "rgba(232,204,156,0.08)",
                  boxShadow:
                    pill.opacity > 0
                      ? "inset 0 0 0 1px rgba(232,204,156,0.08)"
                      : "none",
                }}
              />

              {DESKTOP_LINKS.map((link) => {
                const active = isActive(link.href);
                const isExternal = link.href.startsWith("http");
                const LinkTag = isExternal ? "a" : Link;
                const extraProps = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};
                return (
                  <span
                    key={link.href}
                    ref={(el) => {
                      if (el) linkRefs.current.set(link.href, el);
                    }}
                    onMouseEnter={() => handleLinkHover(link.href)}
                  >
                    <LinkTag
                      href={link.href}
                      {...extraProps}
                      className={`relative z-10 block px-4 py-2 text-[13px] font-medium tracking-[0.02em] transition-colors duration-200 ${
                        active
                          ? "text-gold-300"
                          : "text-stone-400 hover:text-white"
                      }`}
                    >
                      {link.label}
                      {/* Active dot */}
                      {active && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold-300 shadow-[0_0_6px_rgba(232,204,156,0.6)]" />
                      )}
                    </LinkTag>
                  </span>
                );
              })}
            </nav>

            {/* Reserve CTA */}
            <Link
              href="/booking"
              className="group relative shrink-0 px-6 py-2.5 rounded-full text-[13px] font-semibold tracking-[0.03em] transition-all duration-300 overflow-hidden active:scale-[0.97] bg-gold-300 text-stone-900 hover:shadow-[0_0_24px_rgba(232,204,156,0.35)]"
            >
              <span className="relative z-10">Reserve</span>
              {/* Shimmer sweep on hover */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          DESKTOP FOOD MENU (lg+) — Floating bottom button
          ═══════════════════════════════════════════ */}
      <div
        ref={desktopMenuRef}
        className={`fixed bottom-6 left-0 right-0 z-[9999] hidden lg:flex flex-col items-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-24 opacity-0"
        }`}
      >
        {/* Expanded food menu panel */}
        <div
          className={`pointer-events-auto w-full max-w-2xl mx-auto rounded-[1.75rem] shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            desktopMenuOpen
              ? "max-h-[75vh] opacity-100 mb-3 scale-100"
              : "max-h-0 opacity-0 mb-0 scale-95 !pointer-events-none"
          }`}
          style={{
            background: "rgba(26,26,26,0.97)",
            backdropFilter: "blur(24px)",
          }}
        >
          {desktopMenuOpen && (
            <div className="flex flex-col max-h-[75vh]">
              {/* Header */}
              <div className="px-6 pt-6 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white italic tracking-tight">
                    Our Menu
                  </h2>
                  <Link
                    href="/menu"
                    onClick={() => setDesktopMenuOpen(false)}
                    className="text-xs text-gold-300 hover:text-gold-200 font-medium tracking-wide transition-colors flex items-center gap-1"
                  >
                    View Full Menu
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={menuSearch}
                    onChange={(e) => {
                      setMenuSearch(e.target.value);
                      setActiveCategory(0);
                    }}
                    className="w-full pl-10 pr-9 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white text-sm placeholder:text-stone-500 focus:outline-none focus:border-gold-300/30 focus:ring-1 focus:ring-gold-300/20 transition-all"
                  />
                  {menuSearch && (
                    <button
                      onClick={() => setMenuSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Category tabs — only show when not searching */}
                {!isSearchingMenu && (
                  <div
                    ref={categoryTabsRef}
                    className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {ALL_CATEGORIES.map((cat, i) => (
                      <button
                        key={cat.title}
                        onClick={() => setActiveCategory(i)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 ${
                          activeCategory === i
                            ? "bg-gold-300 text-stone-900"
                            : "bg-white/[0.06] text-stone-400 hover:text-white hover:bg-white/[0.1]"
                        }`}
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search result count */}
                {isSearchingMenu && (
                  <p className="text-xs text-stone-500 pb-1">
                    {totalSearchResults} {totalSearchResults === 1 ? "dish" : "dishes"} found
                  </p>
                )}
              </div>

              {/* Items list */}
              <div
                ref={itemsScrollRef}
                className="overflow-y-auto flex-1 px-6 py-2"
                style={{ maxHeight: "calc(75vh - 200px)", scrollbarWidth: "thin", scrollbarColor: "rgba(232,204,156,0.2) transparent" }}
              >
                {isSearchingMenu ? (
                  /* Search results - flat list grouped by category */
                  filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                      <div key={cat.title} className="mb-4 last:mb-2">
                        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-gold-300/70 italic mb-1">
                          {cat.title}
                        </h3>
                        {cat.items.map((item) => (
                          <div key={item.name} className="py-2.5 border-b border-white/[0.04] last:border-0 group">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-sm text-white font-medium leading-snug group-hover:text-gold-300 transition-colors">
                                <SearchHighlight text={item.name} query={menuSearch} />
                                {item.v && <span className="ml-1.5 text-[9px] font-bold text-emerald-400 align-super">V</span>}
                                {item.spicy && <span className="ml-1 text-[9px] align-super">🌶</span>}
                              </span>
                              {item.price != null && (
                                <span className="text-gold-300 font-semibold text-xs tabular-nums shrink-0">
                                  £{item.price}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-stone-500 leading-relaxed line-clamp-1">
                              <SearchHighlight text={item.desc} query={menuSearch} />
                            </p>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-stone-500 text-sm">No dishes found for &ldquo;{menuSearch}&rdquo;</p>
                    </div>
                  )
                ) : (
                  /* Category view */
                  <>
                    {ALL_CATEGORIES[activeCategory]?.subtitle && (
                      <p className="text-[11px] text-stone-500 leading-relaxed mb-3 pb-2 border-b border-white/[0.04]">
                        {ALL_CATEGORIES[activeCategory].subtitle}
                      </p>
                    )}
                    {ALL_CATEGORIES[activeCategory]?.items.map((item, i) => (
                      <div
                        key={item.name}
                        className="py-2.5 border-b border-white/[0.04] last:border-0 group"
                        style={{
                          animation: `fadeSlideIn 300ms ${i * 30}ms both`,
                        }}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-white font-medium leading-snug group-hover:text-gold-300 transition-colors">
                            {item.name}
                            {item.v && <span className="ml-1.5 text-[9px] font-bold text-emerald-400 align-super">V</span>}
                            {item.spicy && <span className="ml-1 text-[9px] align-super">🌶</span>}
                          </span>
                          {item.price != null && (
                            <span className="text-gold-300 font-semibold text-xs tabular-nums shrink-0">
                              £{item.price}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-stone-500 leading-relaxed line-clamp-2 group-hover:text-stone-400 transition-colors">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Footer CTA */}
              <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] text-stone-600 tracking-wide uppercase">
                  <span className="text-emerald-400 font-bold">V</span> = Vegetarian &nbsp; 🌶 = Spicy
                </span>
                <Link
                  href="/booking"
                  onClick={() => setDesktopMenuOpen(false)}
                  className="px-4 py-1.5 rounded-full bg-gold-300 text-stone-900 text-xs font-semibold tracking-wide hover:shadow-[0_0_16px_rgba(232,204,156,0.3)] transition-all"
                >
                  Book a Table
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Floating MENU button — Desktop */}
        <button
          type="button"
          onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
          aria-label={desktopMenuOpen ? "Close food menu" : "Open food menu"}
          aria-expanded={desktopMenuOpen}
          className={`pointer-events-auto w-full max-w-xs rounded-full shadow-lg flex items-center justify-center gap-3 py-4 transition-all duration-300 hover:shadow-xl active:scale-[0.98] cursor-pointer ${
            desktopMenuOpen ? "bg-stone-100" : "bg-white"
          }`}
        >
          {/* Hamburger / X icon */}
          <div className="relative w-5 h-4 flex flex-col justify-between">
            <span
              className={`block h-[1.5px] w-full bg-stone-800 transition-all duration-300 origin-center ${
                desktopMenuOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] w-full bg-stone-800 transition-all duration-300 ${
                desktopMenuOpen ? "opacity-0 scale-x-0" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] w-full bg-stone-800 transition-all duration-300 origin-center ${
                desktopMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </div>
          <span className="text-sm font-medium tracking-[0.25em] uppercase text-stone-800">
            {desktopMenuOpen ? "Close" : "Menu"}
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE NAV (<lg) — Floating bottom button
          ═══════════════════════════════════════════ */}
      <div
        ref={mobileRef}
        className={`fixed bottom-6 left-4 right-4 z-[9999] sm:left-6 sm:right-6 lg:hidden pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-24 opacity-0"
        }`}
      >
        {/* Expanded mobile panel */}
        <div
          className={`pointer-events-auto bg-white rounded-[1.75rem] shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            mobileOpen
              ? "max-h-[70vh] opacity-100 mb-3 p-8 scale-100"
              : "max-h-0 opacity-0 mb-0 p-0 scale-95 !pointer-events-none"
          }`}
        >
          <nav className="space-y-1">
            {MOBILE_LINKS.map((link, i) => {
              const isExternal = link.href.startsWith("http");
              const LinkTag = isExternal ? "a" : Link;
              const extraProps = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};
              return (
                <LinkTag
                  key={`${link.label}-${i}`}
                  href={link.href}
                  {...extraProps}
                  {...(!isExternal ? { onClick: () => setMobileOpen(false) } : {})}
                  className={`block py-3 px-2 text-lg font-light rounded-xl transition-all duration-300 ${
                    isActive(link.href)
                      ? "text-stone-900 bg-stone-100 font-normal"
                      : "text-stone-700 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                  style={{
                    transitionDelay: mobileOpen ? `${i * 30}ms` : "0ms",
                    opacity: mobileOpen ? 1 : 0,
                    transform: mobileOpen
                      ? "translateX(0)"
                      : "translateX(-12px)",
                  }}
                >
                  {link.label}
                </LinkTag>
              );
            })}
          </nav>
        </div>

        {/* Floating MENU button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className={`pointer-events-auto w-full rounded-full shadow-lg flex items-center justify-center gap-3 py-4 sm:py-5 transition-all duration-300 hover:shadow-xl active:scale-[0.98] cursor-pointer ${
            mobileOpen ? "bg-stone-100" : "bg-white"
          }`}
        >
          {/* Hamburger / X icon */}
          <div className="relative w-5 h-4 flex flex-col justify-between">
            <span
              className={`block h-[1.5px] w-full bg-stone-800 transition-all duration-300 origin-center ${
                mobileOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] w-full bg-stone-800 transition-all duration-300 ${
                mobileOpen ? "opacity-0 scale-x-0" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] w-full bg-stone-800 transition-all duration-300 origin-center ${
                mobileOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </div>
          <span className="text-sm font-medium tracking-[0.25em] uppercase text-stone-800">
            {mobileOpen ? "Close" : "Menu"}
          </span>
        </button>
      </div>
    </>
  );
}
