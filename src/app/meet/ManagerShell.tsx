"use client";

import type { CSSProperties } from "react";
import { Icon } from "./ui";

/* Manager pages: the design's sidebar on computers, a slim top bar on phones. */

const C = { ink: "#141414", body: "#3b3834", coral: "#c2410c", badge: "#ffe4da" };

export type ManagerPage = "home" | "rota" | "staff";

/** Sidebar from the design. Screens not built yet are greyed out. */
export function Sidebar({ current, badges = {} }: { current: ManagerPage; badges?: Partial<Record<ManagerPage, number>> }) {
  const items: [string, string, string | null, ManagerPage | null][] = [
    ["Home", "home", "/meet", "home"],
    ["Calendar", "calendar_month", null, null],
    ["Rota", "view_timeline", "/meet/rota", "rota"],
    ["Hours", "schedule", null, null],
    ["Meeting notes", "auto_stories", null, null],
    ["Tasks", "check_circle", null, null],
    ["Attendance", "how_to_reg", null, null],
    ["News", "campaign", null, null],
    ["Staff", "groups", "/meet/staff", "staff"],
    ["Reports", "flag", null, null],
  ];
  return (
    <nav aria-label="Main" className="hidden md:flex" style={{ flex: "1 1 220px", maxWidth: 244, boxSizing: "border-box", padding: "18px 14px", flexDirection: "column", gap: 18 }}>
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
