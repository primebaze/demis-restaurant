"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Icon, IconFont, BRANCH, firstName } from "./ui";
import { Sidebar } from "./ManagerShell";

/*
 * 1 · Meetings home, for managers on a computer. Values from the design canvas.
 * Meeting blocks (Live now, meetings in the schedule, meeting numbers) appear as
 * meetings are built; until then the schedule shows who's on the rota today.
 */

const C = { page: "#f6f4f1", ink: "#141414", sub: "#6e6a65", body: "#3b3834", line: "#f0ece7", coral: "#c2410c", chev: "#a19c96" };
const card: CSSProperties = { borderRadius: 22, background: "#ffffff", padding: 18, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" };

type Data = {
  today: string;
  phonesWaiting: number;
  locked: string[];
  rota: { thisWeekLabel: string; nextWeekLabel: string; changed: number; notSentNext: string[]; notSentThis: string[]; hours: number; people: number; seen: number; onRota: number };
  onToday: { name: string; start: string; end: string; branch: string }[];
};

export default function ManagerHome({ name }: { name: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/meet/manager-home", { cache: "no-store" }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return setError(d?.error || "Can't load right now");
    setError("");
    setData(d);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onShow); };
  }, [load]);

  const date = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" }).format(new Date());

  const needs: { href: string; icon: string; bg: string; fg: string; title: string; sub: string }[] = [];
  if (data) {
    if (data.phonesWaiting) needs.push({ href: "/meet/staff", icon: "smartphone", bg: "#fff1ec", fg: "#e2552b", title: `${data.phonesWaiting} phone${data.phonesWaiting === 1 ? "" : "s"} to approve`, sub: "Staff signed in on a new phone" });
    if (data.rota.notSentThis.length) needs.push({ href: "/meet/rota", icon: "view_timeline", bg: "#fff1ec", fg: "#e2552b", title: "This week's rota not sent", sub: `${data.rota.thisWeekLabel} · ${data.rota.notSentThis.map((b) => BRANCH[b]).join(" and ")}` });
    if (data.rota.changed) needs.push({ href: "/meet/rota", icon: "view_timeline", bg: "#fff1ec", fg: "#e2552b", title: "Rota changes not sent", sub: `${data.rota.changed} ${data.rota.changed === 1 ? "person's" : "people's"} shifts changed · ${data.rota.thisWeekLabel}` });
    if (data.rota.notSentNext.length) needs.push({ href: "/meet/rota", icon: "view_timeline", bg: "#eef2ff", fg: "#4f46e5", title: `Next week's rota not sent`, sub: `${data.rota.nextWeekLabel} · ${data.rota.notSentNext.map((b) => BRANCH[b]).join(" and ")}` });
    for (const n of data.locked) needs.push({ href: "/meet/staff", icon: "lock", bg: "#fef7e6", fg: "#b45309", title: `${firstName(n)} is locked out`, sub: "Too many wrong PINs" });
  }

  const disabledBtn = (label: ReactNode, icon: string, dark?: boolean) => (
    <span title="Coming soon" aria-disabled="true" style={{ height: 40, boxSizing: "border-box", display: "inline-flex", alignItems: "center", gap: 7, padding: dark ? "0 18px" : "0 16px", borderRadius: 20, background: dark ? C.ink : "#ffffff", color: dark ? "#ffffff" : C.ink, fontSize: 14, fontWeight: 500, boxShadow: dark ? undefined : "0 1px 2px rgba(20,20,20,0.08)", opacity: 0.45 }}>
      <Icon name={icon} size={19} fill={!dark} style={dark ? undefined : { color: "#e2552b" }} />{label}
    </span>
  );

  return (
    <div style={{ minHeight: "100dvh", background: C.page, color: C.ink, fontSize: 14, display: "flex", flexWrap: "wrap", alignContent: "flex-start", width: "100%", overflowX: "clip" }}>
      <IconFont />
      <style>{`html,body{background:${C.page};overflow-x:hidden}`}</style>
      <Sidebar current="home" badges={{ staff: data?.phonesWaiting || 0, rota: (data?.rota.changed ? 1 : 0) }} />

      <main style={{ flex: "999 1 560px", minWidth: 0, boxSizing: "border-box", padding: "18px 24px 24px 8px", display: "flex", flexDirection: "column", gap: 18 }}>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "4px 4px 0" }}>
          <div style={{ flex: "1 1 240px" }}>
            <p style={{ margin: 0, fontSize: 13, color: C.sub }}>{date}</p>
            <h1 style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>Today at Demi&rsquo;s</h1>
          </div>
          {disabledBtn("Record a room", "radio_button_checked")}
          {disabledBtn("New meeting", "add", true)}
        </header>

        {error && <p style={{ ...card, margin: 0, color: C.sub }}>{error}</p>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
          <section aria-labelledby="today-h" style={{ ...card, flex: "999 1 440px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <h2 id="today-h" style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Schedule</h2>
              <a href="/meet/rota" style={{ marginLeft: "auto", fontSize: 13, color: C.sub, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 2 }}>Rota<Icon name="chevron_right" size={17} /></a>
            </div>
            {!data ? (
              <div style={{ height: 120, borderRadius: 16, background: C.page }} />
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                <li style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 16, background: C.page }}>
                  <span style={{ width: 40, height: 40, borderRadius: 12, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="videocam" size={21} fill style={{ color: "#a19c96" }} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontWeight: 500 }}>No meetings today</p><p style={{ margin: "1px 0 0", fontSize: 12, color: C.sub }}>Meetings arrive in a later update</p></div>
                </li>
                {data.onToday.length === 0 ? (
                  <li style={{ padding: "4px 4px 0", fontSize: 13, color: C.sub }}>No one is on the rota today.</li>
                ) : (
                  data.onToday.map((s, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 16, background: C.page }}>
                      <div style={{ width: 54, textAlign: "center" }}><p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{s.start}</p><p style={{ margin: 0, fontSize: 11, color: C.sub }}>to {s.end}</p></div>
                      <span style={{ width: 40, height: 40, borderRadius: 12, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="badge" size={21} style={{ color: "#0f766e" }} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontWeight: 500 }}>{s.name}</p><p style={{ margin: "1px 0 0", fontSize: 12, color: C.sub }}>On shift · {BRANCH[s.branch]}</p></div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </section>

          <aside style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            <section aria-labelledby="att-h" style={card}>
              <h2 id="att-h" style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Needs you</h2>
              {data && needs.length === 0 && <p style={{ margin: 0, fontSize: 13, color: C.sub }}>Nothing right now, {firstName(name)}.</p>}
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {needs.map((n, i) => (
                  <li key={i}>
                    <a href={n.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, margin: "0 -10px", borderRadius: 14, textDecoration: "none", color: C.ink }}>
                      <span style={{ width: 36, height: 36, borderRadius: 12, background: n.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={n.icon} size={19} style={{ color: n.fg }} /></span>
                      <span style={{ flex: 1 }}><span style={{ display: "block", fontWeight: 500 }}>{n.title}</span><span style={{ display: "block", fontSize: 12, color: C.sub }}>{n.sub}</span></span>
                      <Icon name="chevron_right" size={18} style={{ color: C.chev }} />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="wk-h" style={card}>
              <h2 id="wk-h" style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>This week</h2>
              <dl style={{ margin: 0, display: "flex", flexDirection: "column" }}>
                {([
                  ["schedule", "Rota hours", data ? `${data.rota.hours}` : "…"],
                  ["groups", "People on the rota", data ? `${data.rota.people}` : "…"],
                  ["how_to_reg", "Seen the rota", data ? (data.rota.onRota ? `${data.rota.seen} of ${data.rota.onRota}` : "Not sent") : "…"],
                ] as [string, string, string][]).map(([icon, label, value], i, arr) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, borderBottom: i < arr.length - 1 ? `1px solid ${C.line}` : undefined }}>
                    <span style={{ width: 32, height: 32, borderRadius: 10, background: C.page, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={18} /></span>
                    <dt style={{ flex: 1, color: C.body }}>{label}</dt>
                    <dd style={{ margin: 0, fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
