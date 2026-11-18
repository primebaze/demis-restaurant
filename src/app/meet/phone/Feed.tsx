"use client";

import { useState } from "react";
import { Icon, ago } from "../ui";
import { D, Screen, Back, Chip, gradient, useData, send, hm, londonToday, type Meeting } from "./kit";

/* 17 · News and info, its documents, and 16 · Notifications. Values from the design canvas. */

type Post = { id: string; title: string; body: string; kind: string; audience: string; pinned: boolean; ackBy: string; acked: boolean; photo: string; by: string; at: string };
const KIND: Record<string, { label: string; icon: string; colour: string }> = {
  menu: { label: "Menu", icon: "restaurant_menu", colour: D.peach },
  rota: { label: "Rota", icon: "view_timeline", colour: "#93c5fd" },
  kitchen: { label: "Kitchen", icon: "build", colour: D.amber },
  policies: { label: "Policies", icon: "policy", colour: "#c4b5fd" },
};
const AUD: Record<string, string> = { cricklewood: "Cricklewood", streatham: "Streatham", kitchen: "Kitchen team" };
const byWhen = (iso: string) => {
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (mins < 60 * 20) return ago(iso);
  const d = new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  const y = new Date(Date.now() - 86400_000).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  if (d === y) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", ...(mins > 6 * 1440 ? { day: "numeric", month: "short" } : {}), timeZone: "Europe/London" });
};
const readTime = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 200));

export function NewsScreen({ onDocs }: { onDocs: () => void }) {
  const { data, error, setData } = useData<{ posts: Post[] }>("/api/meet/news");
  const [kind, setKind] = useState("all");
  const [open, setOpen] = useState("");
  const posts = (data?.posts || []).filter((p) => kind === "all" || p.kind === kind);
  const due = (d: string) => (d === londonToday() ? "today" : new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)));

  async function gotIt(p: Post) {
    setData((x) => (x ? { posts: x.posts.map((y) => (y.id === p.id ? { ...y, acked: true } : y)) } : x));
    await send("/api/meet/news", { action: "ack", id: p.id });
  }

  return (
    <Screen gap={14}>
      <div style={{ paddingTop: 6 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>News</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: D.muted }}>From the managers at Demi&rsquo;s</p>
      </div>
      <div role="group" aria-label="Show" style={{ display: "flex", gap: 8, marginRight: -18, overflowX: "auto", paddingRight: 18, scrollbarWidth: "none" }}>
        <Chip on={kind === "all"} onClick={() => setKind("all")}>All</Chip>
        {Object.entries(KIND).map(([k, v]) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{v.label}</Chip>)}
      </div>
      {error && <p style={{ margin: 0, color: D.muted }}>{error}</p>}
      {!data && !error && <div style={{ height: 120, borderRadius: 22, background: D.card }} />}
      {data && posts.length === 0 && <p style={{ margin: 0, padding: "14px 16px", borderRadius: 20, background: D.card, color: D.muted }}>{kind === "all" ? "No news yet." : `No ${KIND[kind].label.toLowerCase()} news yet.`}</p>}
      {posts.map((p) => {
        const k = KIND[p.kind] || { label: "News", icon: "campaign", colour: D.peach };
        const expanded = open === p.id;
        if (p.pinned && !p.acked) {
          return (
            <article key={p.id} style={{ borderRadius: 22, background: gradient, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}><Icon name="push_pin" size={16} fill />Pinned{p.ackBy ? ` · Please read by ${due(p.ackBy)}` : ""}</p>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{p.title}</h2>
              {p.photo && <img src={p.photo} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 14 }} />}
              {p.body && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.92)", whiteSpace: "pre-wrap" }}>{p.body}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{p.by} · {byWhen(p.at)}</span>
                <button onClick={() => gotIt(p)} style={{ marginLeft: "auto", height: 34, padding: "0 14px", border: 0, borderRadius: 17, background: "#ffffff", color: D.bg, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>Got it</button>
              </div>
            </article>
          );
        }
        if (p.photo) {
          return (
            <article key={p.id} onClick={() => setOpen(expanded ? "" : p.id)} style={{ borderRadius: 22, background: D.card, overflow: "hidden", cursor: "pointer" }}>
              <img src={p.photo} alt="" style={{ display: "block", width: "100%", height: expanded ? "auto" : 128, objectFit: "cover" }} />
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ margin: 0, fontSize: 12, color: k.colour, fontWeight: 500 }}>{k.label}{AUD[p.audience] ? ` · ${AUD[p.audience]}` : ""}</p>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{p.title}</h2>
                {expanded && p.body && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: D.soft, whiteSpace: "pre-wrap" }}>{p.body}</p>}
                <p style={{ margin: 0, fontSize: 12, color: D.muted }}>{p.by} · {byWhen(p.at)}{p.body ? ` · ${readTime(p.body)} min read` : ""}{p.pinned ? " · Pinned" : ""}</p>
              </div>
            </article>
          );
        }
        return (
          <article key={p.id} onClick={() => setOpen(expanded ? "" : p.id)} style={{ display: "flex", gap: 12, padding: 14, borderRadius: 20, background: D.card, cursor: "pointer" }}>
            <span style={{ width: 40, height: 40, flex: "none", borderRadius: 14, background: D.raised, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={p.pinned ? "push_pin" : k.icon} size={21} style={{ color: k.colour }} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 12, color: k.colour }}>{k.label}{AUD[p.audience] ? ` · ${AUD[p.audience]}` : ""}</span>
              <span style={{ display: "block", marginTop: 2, fontSize: 15, fontWeight: 500 }}>{p.title}</span>
              <span style={{ display: "block", marginTop: 2, fontSize: 12, color: D.muted, whiteSpace: expanded ? "pre-wrap" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{expanded ? p.body : `${p.body ? `${p.body.split("\n")[0]} ` : ""}`}{expanded ? "" : `${p.by} · ${byWhen(p.at)}`}</span>
              {expanded && <span style={{ display: "block", marginTop: 6, fontSize: 12, color: D.muted }}>{p.by} · {byWhen(p.at)}</span>}
            </span>
          </article>
        );
      })}
      <button onClick={onDocs} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: 0, borderRadius: 20, background: D.card, color: "#ffffff", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
        <span style={{ width: 40, height: 40, flex: "none", borderRadius: 14, background: D.raised, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="folder_open" size={21} /></span>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>Handbook and documents</span><span style={{ display: "block", marginTop: 2, fontSize: 12, color: D.muted }}>Allergen chart, food hygiene, staff handbook</span></span>
        <Icon name="chevron_right" size={20} style={{ color: D.faint }} />
      </button>
    </Screen>
  );
}

type Doc = { id: string; title: string; mime: string; size: number; url: string };

export function DocsScreen({ onBack }: { onBack: () => void }) {
  const { data, error } = useData<{ docs: Doc[] }>("/api/meet/docs");
  return (
    <Screen>
      <Back onBack={onBack} title="Handbook and documents" />
      {error && <p style={{ margin: 0, color: D.muted }}>{error}</p>}
      {!data && !error && <div style={{ height: 70, borderRadius: 20, background: D.card }} />}
      {data?.docs.length === 0 && <p style={{ margin: 0, padding: "14px 16px", borderRadius: 20, background: D.card, color: D.muted }}>No documents yet. Managers add them from News on a computer.</p>}
      {data?.docs.map((d) => (
        <a key={d.id} href={d.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, background: D.card, color: "#ffffff", textDecoration: "none" }}>
          <span style={{ width: 40, height: 40, flex: "none", borderRadius: 14, background: D.raised, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={d.mime.startsWith("image/") ? "image" : "description"} size={21} /></span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{d.title}</span><span style={{ display: "block", marginTop: 2, fontSize: 12, color: D.muted }}>{d.mime.includes("pdf") ? "PDF" : d.mime.startsWith("image/") ? "Picture" : "Document"} · {Math.max(1, Math.round(d.size / 1024))} KB</span></span>
          <Icon name="open_in_new" size={20} style={{ color: D.faint }} />
        </a>
      ))}
    </Screen>
  );
}

type Alert = { id: string; title: string; body: string; url: string; icon: string; read: boolean; at: string };

/** 16 · Notifications: everything sent to me, newest first, with meetings happening now on top. */
export function AlertsScreen({ onBack, onOpen, live, pushOff, onTurnOn }: { onBack: () => void; onOpen: (url: string) => void; live: Meeting[]; pushOff: boolean; onTurnOn: () => void }) {
  const { data, setData } = useData<{ unread: number; alerts: Alert[] }>("/api/meet/alerts");
  const today = londonToday();
  const list = data?.alerts || [];
  const todays = list.filter((a) => new Date(a.at).toLocaleDateString("en-CA", { timeZone: "Europe/London" }) === today);
  const earlier = list.filter((a) => !todays.includes(a));

  async function readAll() {
    setData((d) => (d ? { unread: 0, alerts: d.alerts.map((a) => ({ ...a, read: true })) } : d));
    await send("/api/meet/alerts", { all: true });
  }
  function open(a: Alert) {
    if (!a.read) send("/api/meet/alerts", { id: a.id });
    onOpen(a.url);
  }
  const iconTone = (a: Alert) => (a.icon === "priority_high" ? { bg: D.redBg, fg: D.red } : a.icon === "auto_awesome" ? { bg: D.chip, fg: D.peach } : { bg: D.chip, fg: "#ffffff" });
  const split = (a: Alert) => { const i = a.title.indexOf(": "); return i > 0 && i < 20 ? [a.title.slice(0, i + 1), a.title.slice(i + 2)] : ["", a.title]; };
  const row = (a: Alert) => {
    const t = iconTone(a);
    const [lead, text] = split(a);
    return (
      <button key={a.id} onClick={() => open(a)} style={{ display: "flex", gap: 12, padding: 12, border: 0, borderRadius: 18, background: "transparent", color: "#ffffff", textAlign: "left", fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
        <span style={{ width: 40, height: 40, flex: "none", borderRadius: 14, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={a.icon} size={21} fill={a.icon === "auto_awesome"} style={{ color: t.fg }} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14 }}>{lead && <strong style={{ fontWeight: 600 }}>{lead} </strong>}{text}</span>
          <span style={{ display: "block", marginTop: 3, fontSize: 12, color: D.muted }}>{a.body ? `${a.body.slice(0, 90)}${a.body.length > 90 ? "…" : ""} · ` : ""}{todays.includes(a) ? hm(a.at) : byWhen(a.at)}</span>
        </span>
        {!a.read && <span aria-label="New" style={{ width: 8, height: 8, marginTop: 6, flex: "none", borderRadius: "50%", background: D.orange }} />}
      </button>
    );
  };

  return (
    <Screen>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
        <button onClick={onBack} aria-label="Back" style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: D.chip, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="arrow_back" size={22} /></button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>Notifications</h1>
        {(data?.unread || 0) > 0 && <button onClick={readAll} style={{ marginLeft: "auto", height: 36, padding: "0 12px", border: 0, borderRadius: 18, background: "transparent", color: D.muted, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>Mark all read</button>}
      </div>
      {live.length > 0 && (
        <>
          <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: D.muted }}>Now</p>
          {live.map((m) => (
            <a key={m.id} href={`/meet/call/${m.id}`} style={{ display: "flex", gap: 12, padding: 14, borderRadius: 20, background: "#24160f", color: "#ffffff", textDecoration: "none", boxShadow: "inset 0 0 0 1px rgba(242,100,58,0.35)" }}>
              <span style={{ width: 40, height: 40, flex: "none", borderRadius: 14, background: D.orange, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="videocam" size={22} fill /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>Your meeting has started</span>
                <span style={{ display: "block", marginTop: 3, fontSize: 13, color: D.soft }}>{m.title} · {m.inNow.length} {m.inNow.length === 1 ? "person is" : "people are"} in</span>
                <span style={{ display: "inline-flex", marginTop: 10, height: 34, padding: "0 16px", alignItems: "center", borderRadius: 17, background: "#ffffff", color: D.bg, fontSize: 13, fontWeight: 600 }}>Join now</span>
              </span>
            </a>
          ))}
        </>
      )}
      {!data && <div style={{ height: 70, borderRadius: 20, background: D.card }} />}
      {data && list.length === 0 && live.length === 0 && <p style={{ margin: 0, color: D.muted }}>Nothing yet. New rotas, tasks, meetings and news show here.</p>}
      {todays.length > 0 && <><p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: D.muted }}>Today</p><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{todays.map(row)}</div></>}
      {earlier.length > 0 && <><p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: D.muted }}>Earlier</p><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{earlier.map(row)}</div></>}
      {pushOff && (
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10, padding: 14, borderRadius: 20, background: D.card }}>
          <Icon name="notifications_active" size={22} />
          <span style={{ flex: 1, fontSize: 13, color: D.soft }}>Get these on your lock screen too</span>
          <button onClick={onTurnOn} style={{ height: 36, padding: "0 14px", border: 0, borderRadius: 18, background: "#ffffff", color: D.bg, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>Turn on</button>
        </div>
      )}
    </Screen>
  );
}
