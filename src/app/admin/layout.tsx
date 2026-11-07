"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  CalendarCheck, CalendarDays, ChefHat, ClipboardCheck, Clapperboard, DoorOpen, Drumstick, LayoutDashboard,
  LogOut, Mail, Megaphone, MousePointerClick, Settings, Soup, Star, Users, UtensilsCrossed, ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

// Grouped by what staff are doing. Line icons only (see docs/COLOURS.md).
const NAV_GROUPS: { title: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    title: "Today",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/admin/door/cricklewood", label: "Door: Cricklewood", icon: DoorOpen },
      { href: "/admin/door/streatham", label: "Door: Streatham", icon: DoorOpen },
    ],
  },
  {
    title: "Bookings",
    items: [
      { href: "/admin/bookings", label: "Table bookings", icon: CalendarCheck },
      { href: "/admin/set-menu", label: "Set Menu", icon: UtensilsCrossed },
      { href: "/admin/buffet", label: "Buffet", icon: ChefHat },
    ],
  },
  {
    title: "Experiences",
    items: [
      { href: "/admin/sunday-buffet", label: "Sunday Buffet", icon: Soup },
      { href: "/admin/checkins", label: "Buffet Check-ins", icon: ClipboardCheck },
      { href: "/admin/saturday-brunch", label: "Sunday Feast", icon: Drumstick },
      { href: "/admin/brunch-checkins", label: "Feast Check-ins", icon: ClipboardCheck },
    ],
  },
  {
    title: "Guests & marketing",
    items: [
      { href: "/admin/guests", label: "Guests", icon: Users },
      { href: "/admin/mailing", label: "Email Blast", icon: Megaphone },
      { href: "/admin/email-logs", label: "Email Logs", icon: Mail },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/link-clicks", label: "Link Clicks", icon: MousePointerClick },
      { href: "/admin/shoot-plans", label: "Weekly Plans", icon: Clapperboard },
    ],
  },
  {
    title: "Setup",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // If we're on the login page, just render children directly
  const isLoginPage = pathname === "/admin/login";

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "include" });
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
    if (!isLoginPage) {
      checkAuth();
    }
  }, [isLoginPage, checkAuth]);

  // Login page rendered without admin shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state
  if (authed === null) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-gold-300 text-lg">Loading...</div>
      </div>
    );
  }

  if (!authed) return null;

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-ink-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:self-start lg:h-screen inset-y-0 left-0 z-50 w-60 bg-ink-950 border-r border-white/[0.06] transform transition-transform lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <Link href="/admin" className="block">
              <p className="font-serif text-xl text-gold-300 leading-none">Demi&apos;s</p>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-stone-500">Admin</p>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="mb-5 last:mb-0">
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${
                          isActive
                            ? "bg-white/[0.06] font-medium text-white"
                            : "text-stone-400 hover:bg-white/[0.03] hover:text-stone-100"
                        }`}
                      >
                        {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-gold-300" />}
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-gold-300" : "text-stone-500"}`} strokeWidth={1.75} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/[0.06] p-3 space-y-0.5">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-stone-400 transition hover:bg-white/[0.03] hover:text-stone-100"
            >
              <ArrowUpRight className="h-4 w-4 text-stone-500" strokeWidth={1.75} />
              View website
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] text-stone-400 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4 text-stone-500" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-ink-950">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="font-serif text-lg text-gold-300">Demi&apos;s</span>
          <div className="w-10" />
        </header>

        {/* Page content */}
        <main className={`flex-1 p-4 lg:p-8 ${pathname.startsWith("/admin/shoot-plans") ? "overflow-visible" : "overflow-auto"}`}>{children}</main>
      </div>
    </div>
  );
}
