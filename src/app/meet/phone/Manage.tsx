"use client";

import { useState } from "react";
import { Icon, personColour, initial, firstName, BRANCH } from "../ui";
import { D, Screen, Chip, bigWhite, field, mono, useData, send, dayShort, dayNum, londonToday } from "./kit";

/* 30 · Manager phone: the Manage tab for quick jobs. Rota building, payroll and attendance stay on the computer. */

type Device = { id: string; clockinId: number; staffName: string; label: string };
type Fix = { id: string; staffId: number; name: string; date: string; wasStart: string; wasEnd: string; start: string; end: string; reason: string };
type Report = { id: string; kind: string; category: string; body: string; urgent: boolean; branch: string; photo: string; from: string; status: string; at: string };
type Req = { kind: string; status: string };
type TaskRow = { status: string; dueDate: string };

const mins = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return m < 60 ? `${Math.max(1, m)} min` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};
const headline = (b: string) => { const f = b.split(/(?<=[.!?])\s|\n/)[0].trim(); return f.length > 70 ? f.slice(0, 67) + "…" : f; };

export function ManageScreen({ onPost }: { onPost: () => void }) {
  const devices = useData<{ pending: Device[] }>("/api/meet/devices");
  const hours = useData<{ fixes: Fix[] }>("/api/meet/hours/manage");
  const reports = useData<{ reports: Report[] }>("/api/meet/reports?manage=1");
  const reqs = useData<{ waiting: Req[] }>("/api/meet/requests/manage");
  const tasks = useData<{ tasks: TaskRow[] }>("/api/meet/tasks?manage=1");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const today = londonToday();

  const urgent = (reports.data?.reports || []).filter((r) => r.status === "new" && (r.urgent || r.kind === "person"));
  const otherReports = (reports.data?.reports || []).filter((r) => r.status !== "closed" && !urgent.includes(r)).length;
  const phones = devices.data?.pending || [];
  const fixes = hours.data?.fixes || [];
  const swaps = (reqs.data?.waiting || []).filter((r) => r.kind === "swap").length;
  const timeoff = (reqs.data?.waiting || []).filter((r) => r.kind === "timeoff").length;
  const overdue = (tasks.data?.tasks || []).filter((t) => (t.status === "open" || t.status === "help") && t.dueDate && t.dueDate < today).length;
  const count = urgent.length + phones.length + fixes.length + swaps + timeoff + otherReports;

  async function act(url: string, body: object, key: string, done: string, reload: () => void) {
    setBusy(key);
    const r = await send(url, body);
    setBusy("");
    setMsg(r.ok ? done : r.data.error || "Couldn't do that");
    reload();
  }
  const card = { borderRadius: 22, background: D.card, padding: 14, display: "flex", flexDirection: "column" as const, gap: 10 };
  const avatar = (id: number, name: string) => { const c = personColour(id); return <span style={{ width: 36, height: 36, borderRadius: "50%", background: c.bg, color: c.fg, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{initial(name)}</span>; };
  const twoBtns = (yes: () => void, no: () => void, key: string) => (
    <div style={{ display: "flex", gap: 6 }}>
      <button onClick={yes} disabled={!!busy} style={{ flex: 1, height: 40, border: 0, borderRadius: 20, background: "#ffffff", color: D.bg, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>{busy === key + "y" ? "…" : "Approve"}</button>
      <button onClick={no} disabled={!!busy} style={{ height: 40, padding: "0 16px", border: 0, borderRadius: 20, background: "#2a2a2a", color: "#ffffff", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>{busy === key + "n" ? "…" : "Decline"}</button>
    </div>
  );
  const link = (href: string, icon: string, label: string, n: number, colour = "#ffffff", first = false, plain = false) => (
    <a href={href} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 54, padding: "0 14px", borderTop: first ? undefined : "1px solid #262626", color: "#ffffff", textDecoration: "none" }}>
      <Icon name={icon} size={21} style={{ color: colour }} /><span style={{ flex: 1, fontSize: 15 }}>{label}</span>
      {n > 0 && (plain ? <span style={{ fontSize: 13, color: D.muted }}>{n}</span> : <span style={{ minWidth: 22, height: 22, padding: "0 7px", boxSizing: "border-box", borderRadius: 11, background: "#3a1d12", color: D.peach, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>)}
      <Icon name="chevron_right" size={20} style={{ color: D.faint }} />
    </a>
  );

  return (
    <Screen gap={12}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 6 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>Manage</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: D.muted }}>{count === 0 ? "Nothing needs you right now" : `${count} thing${count === 1 ? "" : "s"} need${count === 1 ? "s" : ""} you`}</p>
        </div>
        <button aria-label="Post news" onClick={onPost} style={{ height: 44, padding: "0 14px", border: 0, borderRadius: 22, background: "#ffffff", color: D.bg, fontSize: 14, fontWeight: 600, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}><Icon name="campaign" size={20} />Post</button>
      </div>
      {msg && <p role="status" style={{ margin: 0, fontSize: 13, color: D.soft }}>{msg}</p>}
      {urgent.map((r) => (
        <article key={r.id} style={{ borderRadius: 22, background: r.kind === "person" ? "#1e1b2e" : "linear-gradient(140deg, #ff7a45, #e0502f)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: r.kind === "person" ? "#c4b5fd" : "#ffffff" }}><Icon name={r.kind === "person" ? "lock" : "priority_high"} size={16} fill />{r.kind === "person" ? "Private report" : "Urgent report"}{BRANCH[r.branch] ? ` · ${BRANCH[r.branch]}` : ""} · {mins(r.at)}</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{r.kind === "person" ? "A concern about a colleague" : headline(r.body)}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>{r.from ? firstName(r.from) : "Sent without a name"}{r.photo ? " · with a photo" : ""}</span><a href="/meet/reports" style={{ marginLeft: "auto", height: 34, padding: "0 14px", borderRadius: 17, background: "#ffffff", color: D.bg, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open</a></div>
        </article>
      ))}
      {phones.map((p) => (
        <article key={p.id} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{avatar(p.clockinId, p.staffName)}<span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 12, color: D.muted }}>New phone</span><span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{firstName(p.staffName)} · {p.label.split(" · ")[0]}</span></span></div>
          {twoBtns(() => act("/api/meet/devices", { id: p.id, action: "approve" }, p.id + "y", `${firstName(p.staffName)}'s phone approved.`, devices.reload), () => act("/api/meet/devices", { id: p.id, action: "decline" }, p.id + "n", "Phone declined.", devices.reload), p.id)}
        </article>
      ))}
      {fixes.map((f) => (
        <article key={f.id} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{avatar(f.staffId, f.name)}<span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 12, color: D.muted }}>Fix hours · {dayShort(f.date)} {dayNum(f.date)}</span><span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{firstName(f.name)}: {f.reason.split(".")[0].toLowerCase()}</span></span></div>
          <p style={{ margin: 0, fontFamily: mono, fontSize: 13, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ color: D.muted, textDecoration: "line-through" }}>{f.wasStart || "none"} – {f.wasEnd || "none"}</span><Icon name="arrow_forward" size={16} style={{ color: D.muted }} /><span style={{ fontWeight: 600 }}>{f.start} – {f.end}</span></p>
          {twoBtns(() => act("/api/meet/hours/manage", { id: f.id, action: "approve" }, f.id + "y", `Approved. Saved to ${firstName(f.name)}'s hours.`, hours.reload), () => act("/api/meet/hours/manage", { id: f.id, action: "decline" }, f.id + "n", "Declined.", hours.reload), f.id)}
        </article>
      ))}
      <div style={{ display: "flex", flexDirection: "column", borderRadius: 22, background: D.card, overflow: "hidden" }}>
        {link("/meet/rota/requests", "swap_horiz", "Swap requests", swaps, D.peach, true)}
        {link("/meet/rota/requests", "beach_access", "Time off", timeoff, D.peach)}
        {link("/meet/reports", "flag", "Reports", otherReports, D.peach)}
        {link("/meet/tasks", "notifications", "Nudge overdue tasks", overdue, "#ffffff", false, true)}
        {link("/meet/staff", "groups", "Staff and phones", 0)}
      </div>
      <p style={{ margin: "0 4px", fontSize: 12, color: D.muted }}>Rota building, payroll and attendance stay on the computer.</p>
    </Screen>
  );
}

const KINDS: [string, string][] = [["menu", "Menu"], ["rota", "Rota"], ["kitchen", "Kitchen"], ["policies", "Policies"]];
const AUD: [string, string][] = [["everyone", "Everyone"], ["cricklewood", "Cricklewood"], ["streatham", "Streatham"], ["kitchen", "Kitchen team"]];

/** Post news from the phone (the quick version of design 29). */
export function PostScreen({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("rota");
  const [aud, setAud] = useState("everyone");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function post() {
    setBusy(true);
    setErr("");
    const r = await send("/api/meet/news", { action: "post", title, body, kind, audience: aud, pinned, ackBy: "" });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error || "Couldn't post that");
    onBack();
  }
  return (
    <Screen>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
        <button onClick={onBack} aria-label="Back" style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: D.chip, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="arrow_back" size={22} /></button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>Post news</h1>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Headline" aria-label="Headline" style={{ ...field, height: 52, padding: "0 16px" }} />
      <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="What do staff need to know?" aria-label="Message" style={field} />
      <div role="group" aria-label="Type" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{KINDS.map(([k, l]) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{l}</Chip>)}</div>
      <div role="group" aria-label="Who sees it" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{AUD.map(([k, l]) => <Chip key={k} on={aud === k} onClick={() => setAud(k)}>{l}</Chip>)}</div>
      <label style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "0 14px", borderRadius: 18, background: D.card, cursor: "pointer" }}>
        <Icon name="push_pin" size={21} /><span style={{ flex: 1 }}>Pin to the top</span>
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ width: 22, height: 22, accentColor: D.orange }} />
      </label>
      {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: D.red }}>{err}</p>}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={post} disabled={busy || !title.trim()} style={{ ...bigWhite, opacity: title.trim() ? 1 : 0.5 }}><Icon name="send" size={20} />{busy ? "Posting…" : "Post"}</button>
        <p style={{ margin: 0, textAlign: "center", fontSize: 12, color: D.muted }}>Sends a notification and an email. Photos and &ldquo;Got it&rdquo; dates are on the computer.</p>
      </div>
    </Screen>
  );
}
