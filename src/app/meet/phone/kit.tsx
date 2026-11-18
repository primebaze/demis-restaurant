"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../ui";

/* Shared bits for the staff phone screens (dark). Values from the design canvas. */

export const D = {
  bg: "#0f0f0f", card: "#1c1c1c", chip: "#1f1f1f", pill: "#232323", raised: "#262626", done: "#161616",
  muted: "#a3a3a3", faint: "#737373", ring: "#525252", dash: "#404040", soft: "#d4d4d4",
  orange: "#f2643a", peach: "#ffad8c", red: "#fca5a5", redBg: "rgba(239,68,68,0.16)", amber: "#fbbf24",
};
export const mono = "var(--font-geist-mono), 'Geist Mono', monospace";
export const gradient = "linear-gradient(140deg, #ff7a45, #e0502f)";

/** Every phone screen: safe-area padding at the top, the design's 18px sides. */
export function Screen({ children, gap = 16, bottom = 18 }: { children: ReactNode; gap?: number; bottom?: number }) {
  return <main style={{ flex: 1, boxSizing: "border-box", padding: `calc(env(safe-area-inset-top) + 40px) 18px ${bottom}px`, display: "flex", flexDirection: "column", gap }}>{children}</main>;
}

/** Back button and a title (designs 10, 15, 16, 21, 22, 23). */
export function Back({ onBack, title, sub, right }: { onBack: () => void; title?: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
      <button onClick={onBack} aria-label="Back" style={{ width: 44, height: 44, flex: "none", border: 0, borderRadius: 22, background: D.chip, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="arrow_back" size={22} /></button>
      {title && <div style={{ flex: 1, minWidth: 0 }}><h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>{title}</h1>{sub && <p style={{ margin: "1px 0 0", fontSize: 12, color: D.muted }}>{sub}</p>}</div>}
      {!title && <span style={{ flex: 1 }} />}
      {right}
    </div>
  );
}

/** Filter pills (white when on). */
export function Chip({ on, onClick, children, h = 38, style }: { on: boolean; onClick: () => void; children: ReactNode; h?: number; style?: CSSProperties }) {
  return (
    <button aria-pressed={on} onClick={onClick} style={{ height: h, padding: `0 ${h >= 44 ? 20 : h >= 40 ? 18 : 16}px`, border: 0, borderRadius: h / 2, background: on ? "#ffffff" : D.pill, color: on ? D.bg : "#ffffff", fontSize: h >= 44 ? 15 : 14, fontWeight: on ? 500 : 400, fontFamily: "inherit", whiteSpace: "nowrap", flex: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, ...style }}>{children}</button>
  );
}

export const bigWhite: CSSProperties = { height: 56, border: 0, borderRadius: 28, background: "#ffffff", color: D.bg, fontSize: 16, fontWeight: 600, fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", width: "100%" };
export const dashedBtn: CSSProperties = { flex: 1, height: 48, border: `1px dashed ${D.dash}`, borderRadius: 16, background: "transparent", color: "#ffffff", fontSize: 14, fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" };
export const field: CSSProperties = { boxSizing: "border-box", padding: 14, border: 0, borderRadius: 18, background: D.card, color: "#ffffff", fontSize: 15, lineHeight: 1.5, fontFamily: "inherit", resize: "none", width: "100%" };

/** Load JSON for a phone screen; again when the app comes back to the front. */
export function useData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url) return;
    let gone = false;
    const load = async () => {
      const res = await fetch(url, { cache: "no-store" }).catch(() => null);
      if (gone) return;
      if (!res) return setError("Can't connect right now. Pull down or reopen the app to try again.");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || "Can't load this right now");
      setError("");
      setData(d);
    };
    load();
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => { gone = true; document.removeEventListener("visibilitychange", onShow); };
  }, [url, tick]);
  return { data, error, reload: () => setTick((t) => t + 1), setData };
}

export async function send(url: string, body: object): Promise<{ ok: boolean; data: Record<string, unknown> & { error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const data = (await res?.json().catch(() => ({}))) || {};
  return { ok: !!res?.ok, data: res ? data : { error: "Can't connect right now" } };
}

export const dayShort = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
export const dayNum = (d: string) => Number(d.slice(8));
export const dayLong = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
export const dayFull = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
export const addDays = (d: string, n: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
export const mondayOf = (d: string) => addDays(d, -((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7));
export const londonToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
export const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
export const fmtHM = (hours: number) => `${Math.floor(hours)}h ${String(Math.round((hours % 1) * 60)).padStart(2, "0")}m`;

export type Meeting = {
  id: string; title: string; kind: "call" | "room"; status: string; date: string; time: string; startsAt: string; minutes: number; private: boolean;
  host: string; startedAt: string; invited: { id: number; name: string }[]; inNow: { id: number; name: string }[]; came: number; mineInvited: boolean; mineJoined: boolean;
};
export type Task = {
  id: string; title: string; dueDate: string; status: string; steps: { text: string; done: boolean }[]; stepsDone: number; meetingId: string | null; meeting: string;
  quote: string; quoteBy: string; quoteMs: number | null; note: string; helpNote: string; hasPhoto: boolean; createdBy: string; doneAt: string; at: string;
};
