"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarCheck, CalendarDays, ChefHat, ClipboardCheck, Clapperboard, Clock, DoorOpen, Drumstick, LayoutGrid,
  LogOut, Menu, MailCheck, Megaphone, MousePointerClick, Settings2, Soup, Users, UtensilsCrossed, Video, ArrowUpRight,
  X, type LucideIcon,
} from "lucide-react";
import { PageHead } from "@/components/admin/ui";

type Item = { href: string; label: string; icon: LucideIcon; external?: boolean };

// Top bar: the main pages. Reviews is left out of the menu on purpose.
const TOP: Item[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/bookings", label: "Table bookings", icon: CalendarCheck },
  { href: "/admin/set-menu", label: "Set Menu", icon: UtensilsCrossed },
  { href: "/admin/buffet", label: "Buffet", icon: ChefHat },
  { href: "/admin/sunday-buffet", label: "Sunday Buffet", icon: Soup },
  { href: "/admin/saturday-brunch", label: "Sunday Feast", icon: Drumstick },
  { href: "/admin/guests", label: "Guests", icon: Users },
  { href: "/admin/mailing", label: "Email Blast", icon: Megaphone },
  { href: "/admin/link-clicks", label: "Link Clicks", icon: MousePointerClick },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];

// Left column: the door and day-of tools.
const SIDE: Item[] = [
  { href: "/admin/door/cricklewood", label: "Door", icon: DoorOpen },
  { href: "/admin/checkins", label: "Check-ins", icon: ClipboardCheck },
  { href: "/admin/shoot-plans", label: "Weekly Plans", icon: Clapperboard },
  { href: "https://meeting.demisrestaurant.co.uk", label: "Meetings", icon: Video, external: true },
];

// Bottom bar on iPad portrait and phones.
const TABS: Item[] = [
  { href: "/admin", label: "Home", icon: LayoutGrid },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/saturday-brunch", label: "Feast", icon: Drumstick },
  { href: "/admin/sunday-buffet", label: "Buffet", icon: Soup },
  { href: "/admin/door/cricklewood", label: "Door", icon: DoorOpen },
];

// Pages that come as a pair get a switch at the top.
const SWITCHES: { match: (p: string) => boolean; items: { href: string; label: string }[] }[] = [
  {
    match: (p) => p.startsWith("/admin/door/"),
    items: [
      { href: "/admin/door/cricklewood", label: "Cricklewood" },
      { href: "/admin/door/streatham", label: "Streatham Hill" },
    ],
  },
  {
    match: (p) => p.startsWith("/admin/checkins") || p.startsWith("/admin/brunch-checkins"),
    items: [
      { href: "/admin/checkins", label: "Sunday Buffet" },
      { href: "/admin/brunch-checkins", label: "Sunday Feast" },
    ],
  },
];

// Pages that draw their own layout. Every other page gets its title on the photo and sits on a white sheet.
const OWN_LAYOUT = ["/admin"];

// Titles shown on the photo above each page's sheet.
const TITLES: { match: (p: string) => boolean; title: string; subtitle?: string }[] = [
  { match: (p) => p.startsWith("/admin/bookings"), title: "Table bookings", subtitle: "Website bookings for Cricklewood and Streatham Hill" },
  { match: (p) => p.startsWith("/admin/calendar"), title: "Booking calendar", subtitle: "Every booking, day by day" },
  { match: (p) => p.startsWith("/admin/set-menu"), title: "Set Menu", subtitle: "Groups where each guest picks their own courses" },
  { match: (p) => p === "/admin/buffet" || p.startsWith("/admin/buffet/"), title: "Buffet bookings", subtitle: "Group buffets at Cricklewood and Streatham Hill" },
  { match: (p) => p.startsWith("/admin/sunday-buffet"), title: "Sunday Buffet", subtitle: "Streatham Hill · 12.30pm to 4pm" },
  { match: (p) => p.startsWith("/admin/saturday-brunch"), title: "Sunday Feast", subtitle: "Cricklewood · 1.30pm to 6pm" },
  { match: (p) => p.startsWith("/admin/checkins") || p.startsWith("/admin/brunch-checkins"), title: "Check-ins", subtitle: "Who came through the door, numbered as they arrive" },
  { match: (p) => p === "/admin/guests/import", title: "Import guests" },
  { match: (p) => /^\/admin\/guests\/[^/]+$/.test(p), title: "Guest" },
  { match: (p) => p.startsWith("/admin/guests"), title: "Guests", subtitle: "Everyone who has booked with us or been imported" },
  { match: (p) => p.startsWith("/admin/mailing"), title: "Email Blast" },
  { match: (p) => p.startsWith("/admin/email-logs"), title: "Email Logs" },
  { match: (p) => p.startsWith("/admin/link-clicks"), title: "Link Clicks" },
  { match: (p) => p.startsWith("/admin/settings"), title: "Settings", subtitle: "Booking rules, time slots, add-ons, blackout dates and your password" },
  { match: (p) => p.startsWith("/admin/reviews"), title: "Reviews" },
  { match: (p) => p.startsWith("/admin/door/"), title: "Door", subtitle: "Who came through the door, from the door tablets" },
  { match: (p) => p.startsWith("/admin/shoot-plans"), title: "Weekly Plans", subtitle: "The food, people and moments to capture each week" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href.startsWith("/admin/door/")) return pathname.startsWith("/admin/door/");
  if (href === "/admin/checkins") return pathname.startsWith("/admin/checkins") || pathname.startsWith("/admin/brunch-checkins");
  return pathname.startsWith(href);
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return { long: "", short: "" };
  const day = now.toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" });
  const time = now.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "numeric", minute: "2-digit", hour12: true }).replace(":", ".").toUpperCase();
  return { long: `${day} · ${time}`, short: day };
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const clock = useClock();

  const isLoginPage = pathname === "/admin/login";

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard?check=1", { credentials: "include" });
      if (res.status === 401) {
        setAuthed(false);
        if (!isLoginPage) router.push("/admin/login");
      } else {
        setAuthed(true);
      }
    } catch {
      setAuthed(false);
      if (!isLoginPage) router.push("/admin/login");
    }
  }, [isLoginPage, router]);

  useEffect(() => {
    if (!isLoginPage) checkAuth();
  }, [isLoginPage, checkAuth]);

  // The header turns frosted once the page scrolls under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
    setUserOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen && !userOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen, userOpen]);

  useEffect(() => {
    if (!userOpen) return;
    const close = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [userOpen]);

  if (isLoginPage) return <>{children}</>;

  if (authed === null) {
    return (
      <div className="admin-bg fixed inset-0 flex items-center justify-center font-outfit">
        <div className="text-white/90 text-lg font-light">Loading…</div>
      </div>
    );
  }
  if (!authed) return null;

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  }

  const ownLayout = OWN_LAYOUT.includes(pathname);
  const head = TITLES.find((t) => t.match(pathname));
  const sw = SWITCHES.find((s) => s.match(pathname));
  const moreItems = [...TOP.filter((i) => !TABS.some((t) => t.href === i.href) && i.href !== "/admin"), ...SIDE.filter((i) => !TABS.some((t) => t.href === i.href))];

  return (
    <div className="min-h-screen font-outfit text-white">
      <div className="admin-bg fixed inset-0 -z-10" aria-hidden="true" />

      {/* Sticky header */}
      <header
        className={`sticky top-0 z-40 transition-[background,box-shadow,border-color] duration-300 border-b ${
          scrolled ? "bg-[rgba(18,13,10,0.55)] backdrop-blur-xl border-white/10 shadow-[0_12px_30px_-20px_rgba(0,0,0,0.8)]" : "bg-transparent border-transparent"
        }`}
      >
        <div className="flex items-center gap-1.5 px-4 md:px-6 py-3 md:py-4">
          <Link href="/admin" aria-label="Demi's admin home" className="mr-4 lg:mr-8 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Demi's" className="h-5 md:h-[22px] w-auto" />
          </Link>

          <nav aria-label="Admin" className="topnav hidden lg:flex items-center gap-1 xl:gap-1.5">
            {TOP.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return active ? (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current="page"
                  className="inline-flex h-[46px] shrink-0 items-center gap-2 rounded-full bg-white pl-3.5 pr-[18px] text-[15px] text-stone-900 whitespace-nowrap"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  {item.label}
                </Link>
              ) : (
                <Link key={item.href} href={item.href} className="gbtn" aria-label={item.label}>
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="tip" aria-hidden="true">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 text-sm font-light whitespace-nowrap min-w-0">
            <Clock className="h-[18px] w-[18px] shrink-0 lg:hidden xl:block" strokeWidth={1.5} />
            <span className="hidden xl:inline">{clock.long}</span>
            <span className="lg:hidden">{clock.short}</span>
          </div>

          <div ref={userRef} className="relative ml-2 md:ml-3">
            <button
              type="button"
              onClick={() => setUserOpen((o) => !o)}
              aria-expanded={userOpen}
              aria-label="Account"
              className="flex h-10 w-10 md:h-[46px] md:w-[46px] items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-gold-200 to-gold-500 text-[15px] font-medium text-ink-900"
            >
              D
            </button>
            {userOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-52 rounded-2xl bg-white p-1.5 text-stone-900 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
                <Link href="/admin/email-logs" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-stone-100">
                  <MailCheck className="h-4 w-4 text-stone-500" strokeWidth={1.75} />
                  Email Logs
                </Link>
                <Link href="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-stone-100">
                  <ArrowUpRight className="h-4 w-4 text-stone-500" strokeWidth={1.75} />
                  View website
                </Link>
                <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-red-50 hover:text-red-700">
                  <LogOut className="h-4 w-4 text-stone-500" strokeWidth={1.75} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Left column (computers and iPad landscape) */}
      <nav aria-label="Tools" className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-2.5">
        {SIDE.map((item) => {
          const active = !item.external && isActive(pathname, item.href);
          const Icon = item.icon;
          const props = item.external ? { target: "_blank", rel: "noopener" } : {};
          return (
            <Link
              key={item.href}
              href={item.href}
              {...props}
              className={`gbtn round${active ? " on" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={item.external ? `${item.label}, opens Demi's Meetings` : item.label}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="tip side" aria-hidden="true">{item.external ? `${item.label} ↗` : item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="px-4 md:px-6 lg:pl-24 lg:pr-6 pt-2 pb-32 lg:pb-12">
        {ownLayout ? (
          children
        ) : (
          <>
            {head && (
              <div className="shell-head">
                <PageHead title={head.title} subtitle={head.subtitle} />
              </div>
            )}
            {sw && (
              <div className="shell-switch mb-4 inline-flex rounded-full border border-white/15 bg-[rgba(58,52,48,0.48)] p-1 backdrop-blur-xl" role="group" aria-label="Switch">
                {sw.items.map((s) => {
                  const on = pathname.startsWith(s.href);
                  return (
                    <Link
                      key={s.href}
                      href={s.href}
                      aria-current={on ? "page" : undefined}
                      className={`h-9 inline-flex items-center rounded-full px-4 text-sm transition ${on ? "bg-white text-stone-900" : "text-white/90 hover:text-white"}`}
                    >
                      {s.label}
                    </Link>
                  );
                })}
              </div>
            )}
            <div
              className={`shell-sheet rounded-[22px] bg-white p-4 text-stone-900 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.6)] md:p-6 ${
                pathname.startsWith("/admin/shoot-plans") ? "overflow-visible" : "overflow-x-auto"
              }`}
            >
              {children}
            </div>
          </>
        )}
      </main>

      {/* Bottom bar (iPad portrait and phones) */}
      <nav aria-label="Admin" className="tabbar lg:hidden fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-24px)] max-w-[640px] -translate-x-1/2 items-center justify-around rounded-full px-1.5 py-1.5">
        {TABS.map((item, i) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${i === 4 ? "hidden md:flex" : "flex"} h-[52px] min-w-[52px] flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 rounded-full px-3 md:px-4 text-[10.5px] md:text-sm transition ${
                active ? "bg-white text-stone-900" : "text-white/85"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex h-[52px] min-w-[52px] flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 rounded-full px-3 md:px-4 text-[10.5px] md:text-sm ${moreOpen ? "bg-white text-stone-900" : "text-white/85"}`}
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
          More
        </button>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-3 bottom-3 max-h-[80vh] overflow-y-auto rounded-[28px] bg-white p-3 text-stone-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="More pages"
          >
            <div className="flex items-center px-2 pb-1 pt-1">
              <h2 className="text-xl font-normal">More</h2>
              <button onClick={() => setMoreOpen(false)} aria-label="Close" className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            {[...moreItems, { href: "/admin/email-logs", label: "Email Logs", icon: MailCheck }, { href: "/admin/door/cricklewood", label: "Door", icon: DoorOpen }]
              .filter((v, i, a) => a.findIndex((x) => x.href === v.href) === i)
              .map((item) => {
                const Icon = item.icon;
                const props = item.external ? { target: "_blank", rel: "noopener" } : {};
                return (
                  <Link key={item.href} href={item.href} {...props} className="flex h-12 items-center gap-3.5 border-t border-stone-100 px-2 text-base first-of-type:border-t-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    {item.label}
                    {item.external && <ArrowUpRight className="ml-auto h-4 w-4 text-stone-400" strokeWidth={1.75} />}
                  </Link>
                );
              })}
            <button onClick={handleLogout} className="mt-2 flex h-12 w-full items-center gap-3.5 rounded-2xl px-2 text-left text-base text-red-700 hover:bg-red-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
