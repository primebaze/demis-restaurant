"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const NAV_ITEMS = [
  { href: "/blog/admin", label: "Dashboard", icon: "📝" },
  { href: "/blog/admin/posts", label: "Posts", icon: "📄" },
  { href: "/blog/admin/authors", label: "Authors", icon: "✍️" },
  { href: "/blog/admin/categories", label: "Categories", icon: "🏷️" },
  { href: "/blog/admin/comments", label: "Comments", icon: "💬" },
  { href: "/blog/admin/ads", label: "Ads", icon: "📢" },
  { href: "/blog/admin/settings", label: "Settings", icon: "⚙️" },
];

export default function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const isLoginPage = pathname === "/blog/admin/login";

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/blog/admin/me", { credentials: "include" });
      if (res.status === 401) {
        setAuthed(false);
        if (!isLoginPage) router.push("/blog/admin/login");
      } else {
        setAuthed(true);
      }
    } catch {
      setAuthed(false);
      if (!isLoginPage) router.push("/blog/admin/login");
    }
  }, [isLoginPage, router]);

  useEffect(() => {
    if (!isLoginPage) checkAuth();
  }, [isLoginPage, checkAuth]);

  if (isLoginPage) return <><head><meta name="robots" content="noindex, nofollow" /></head>{children}</>;

  if (authed === null) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-gold-300 text-lg">Loading...</div>
      </div>
    );
  }

  if (!authed) return null;

  async function handleLogout() {
    await fetch("/api/blog/admin/login", { method: "DELETE" });
    router.push("/blog/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex">
      <head><meta name="robots" content="noindex, nofollow" /></head>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#141414] border-r border-gray-800 transform transition-transform lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-800">
            <Link href="/blog/admin" className="block">
              <h1 className="text-xl font-bold text-gold-300">Demi&apos;s</h1>
              <p className="text-gray-500 text-xs mt-0.5">Blog Admin</p>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/blog/admin"
                  ? pathname === "/blog/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-gold-300/10 text-gold-300"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-800">
            <Link
              href="/blog"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition"
            >
              ← View Blog
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 transition text-left"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-[#141414]">
          <button onClick={() => setSidebarOpen(true)} className="text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-gold-300 font-bold">Blog Admin</span>
          <div className="w-10" />
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
