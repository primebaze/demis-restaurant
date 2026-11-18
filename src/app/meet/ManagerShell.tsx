"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Icon, IconFont } from "./ui";

/* Manager pages: the design's sidebar on computers, a slim top bar on phones. */

const C = { ink: "#141414", body: "#3b3834", coral: "#c2410c", badge: "#ffe4da" };

export type ManagerPage = "home" | "calendar" | "rota" | "hours" | "notes" | "tasks" | "attendance" | "news" | "staff" | "reports";

/** Sidebar from the design (every manager page). */
export function Sidebar({ current, badges = {} }: { current: ManagerPage; badges?: Partial<Record<ManagerPage, number>> }) {
  const items: [string, string, string | null, ManagerPage | null][] = [
    ["Home", "home", "/meet", "home"],
    ["Calendar", "calendar_month", "/meet/calendar", "calendar"],
    ["Rota", "view_timeline", "/meet/rota", "rota"],
    ["Hours", "schedule", "/meet/hours", "hours"],
    ["Meeting notes", "auto_stories", "/meet/notes", "notes"],
    ["Tasks", "check_circle", "/meet/tasks", "tasks"],
    ["Attendance", "how_to_reg", "/meet/attendance", "attendance"],
    ["News", "campaign", "/meet/news", "news"],
    ["Staff", "groups", "/meet/staff", "staff"],
    ["Reports", "flag", "/meet/reports", "reports"],
  ];
  return (
    <nav aria-label="Main" className="hidden md:flex" style={{ flex: "1 1 220px", maxWidth: 244, boxSizing: "border-box", padding: "18px 14px", flexDirection: "column", gap: 18, position: "sticky", top: 0, alignSelf: "flex-start", maxHeight: "100dvh", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 48, padding: "0 16px", borderRadius: 16, background: C.ink }}>
        <img src="/meet/logo.png" alt="Demi's" style={{ height: 15, width: "auto" }} />
        <span aria-hidden="true" style={{ width: 1, height: 18, background: "#3a3632" }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#e8cc9c" }}>Meetings</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(([label, icon, href, page]) => {
          const on = page === current;
          const base: CSSProperties = { display: "flex", alignItems: "center", gap: 11, height: 38, padding: "0 12px", borderRadius: 12, textDecoration: "none" };
          if (!href) {
            return (
              <span key={label} title="Coming soon" aria-disabled="true" style={{ ...base, color: C.body, opacity: 0.4 }}>
                <Icon name={icon} size={20} />{label}
              </span>
            );
          }
          const n = page ? badges[page] || 0 : 0;
          return (
            <a key={label} href={href} aria-current={on ? "page" : undefined} style={on ? { ...base, background: "#ffffff", color: C.ink, fontWeight: 500, boxShadow: "0 1px 2px rgba(20,20,20,0.06)" } : { ...base, color: C.body }}>
              <Icon name={icon} size={20} fill={on} />{label}
              {n > 0 && (
                <span style={{ marginLeft: "auto", minWidth: 20, height: 20, padding: "0 6px", boxSizing: "border-box", borderRadius: 10, background: C.badge, color: C.coral, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

/** Phones: a slim bar instead of the sidebar. */
export function TopBar() {
  return (
    <div className="flex md:hidden" style={{ width: "100%", boxSizing: "border-box", padding: "calc(env(safe-area-inset-top) + 30px) 16px 0", alignItems: "center", gap: 10 }}>
      <a href="/meet" aria-label="Back to the app" style={{ width: 40, height: 40, borderRadius: 20, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.08)", color: C.ink }}>
        <Icon name="arrow_back" size={20} />
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 40, padding: "0 14px", borderRadius: 14, background: C.ink }}>
        <img src="/meet/logo.png" alt="Demi's" style={{ height: 12, width: "auto" }} />
        <span aria-hidden="true" style={{ width: 1, height: 14, background: "#3a3632" }} />
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#e8cc9c" }}>Meetings</span>
      </div>
    </div>
  );
}

/** Sidebar numbers, shared by every manager page. */
export function useBadges() {
  const [b, setB] = useState<Partial<Record<ManagerPage, number>>>({});
  useEffect(() => {
    const load = () => fetch("/api/meet/badges", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setB(d)).catch(() => {});
    load();
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    const t = setInterval(load, 60_000);
    return () => { document.removeEventListener("visibilitychange", onShow); clearInterval(t); };
  }, []);
  return b;
}

export const PAGE = { page: "#f6f4f1", ink: "#141414", sub: "#6e6a65", body: "#3b3834", line: "#f0ece7", field: "#e7e2dc", coral: "#c2410c", coralBg: "#fff1ec", accent: "#e2552b" };
export const panel: CSSProperties = { borderRadius: 24, background: "#ffffff", padding: 16, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" };
export const btnWhite: CSSProperties = { height: 40, padding: "0 14px", border: 0, borderRadius: 20, background: "#ffffff", color: PAGE.ink, fontSize: 14, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(20,20,20,0.08)", cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" };
export const btnBlack: CSSProperties = { ...btnWhite, padding: "0 18px", background: PAGE.ink, color: "#ffffff", boxShadow: "none" };
export const mono = "var(--font-geist-mono), 'Geist Mono', monospace";

/** Every manager page: page colours, the sidebar (computers) or top bar (phones), and the main column. */
export function ManagerFrame({ current, children, badges }: { current: ManagerPage; children: ReactNode; badges?: Partial<Record<ManagerPage, number>> }) {
  const shared = useBadges();
  return (
    <div style={{ minHeight: "100dvh", background: PAGE.page, color: PAGE.ink, fontSize: 14, display: "flex", flexWrap: "wrap", alignContent: "flex-start", width: "100%", maxWidth: "100vw", overflowX: "clip" }}>
      <IconFont />
      <style>{`html,body{background:${PAGE.page};overflow-x:clip;overscroll-behavior-x:none}`}</style>
      <Sidebar current={current} badges={{ ...shared, ...badges }} />
      <TopBar />
      <main className="px-4 pb-6 pt-[18px] md:pl-2 md:pr-6" style={{ flex: "999 1 560px", minWidth: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </main>
    </div>
  );
}

/** Page heading as in the designs: a grey line above a big title, with buttons on the right. */
export function PageHead({ over, title, children }: { over?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "4px 4px 0" }}>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        {over && <p style={{ margin: 0, fontSize: 13, color: PAGE.sub }}>{over}</p>}
        <h1 style={{ margin: over ? "2px 0 0" : 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>{title}</h1>
      </div>
      {children}
    </header>
  );
}

/** Load JSON for a page, again whenever the app comes back to the front. */
export function useJson<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url) return;
    let gone = false;
    const load = async () => {
      const res = await fetch(url, { cache: "no-store" }).catch(() => null);
      if (gone) return;
      if (!res) return setError("Can't connect right now");
      if (res.status === 401) { window.location.replace(`/meet?back=${encodeURIComponent(window.location.pathname)}`); return; }
      if (res.status === 403) return setError("This page is for managers.");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || "Can't load this page");
      setError("");
      setData(d);
    };
    load();
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => { gone = true; document.removeEventListener("visibilitychange", onShow); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...deps]);
  return { data, error, reload: () => setTick((t) => t + 1), setData };
}

/** POST JSON and return { ok, data } with the server's error message on failure. */
export async function postJson(url: string, body: object): Promise<{ ok: boolean; data: Record<string, unknown> & { error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const data = (await res?.json().catch(() => ({}))) || {};
  return { ok: !!res?.ok, data: res ? data : { error: "Can't connect right now" } };
}
