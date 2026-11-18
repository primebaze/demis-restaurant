"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Icon, IconFont, BRANCH, firstName, personColourLight, initial } from "./ui";
import { Sidebar, useBadges, postJson } from "./ManagerShell";
import NewMeeting from "./NewMeeting";

/*
 * 1 · Meetings home, for managers on a computer. Values from the design canvas:
 * what's live, today's meetings and shifts, what needs a manager, and this week's numbers.
 */

const C = { page: "#f6f4f1", ink: "#141414", sub: "#6e6a65", body: "#3b3834", line: "#f0ece7", coral: "#c2410c", chev: "#a19c96" };
const card: CSSProperties = { borderRadius: 22, background: "#ffffff", padding: 18, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" };

type Data = {
  today: string;
  phonesWaiting: number;
  requests: number;
  locked: string[];
  rota: { thisWeekLabel: string; nextWeekLabel: string; changed: number; nextNotSent: boolean; thisNotSent: boolean; hours: number; people: number; seen: number; onRota: number };
  onToday: { name: string; start: string; end: string; branch: string }[];
  hoursFixes: number;
  reports: { fresh: number; urgent: number };
  overdue: { total: number; by: { name: string; n: number }[] };
  helpAsked: number;
  toConfirm: { id: string; n: number; title: string }[];
  voices: { id: string; title: string; unnamed: number }[];
  meetingsWeek: { held: number; attendance: number | null; tasksDone: number };
};
type Meeting = { id: string; title: string; kind: string; status: string; date: string; time: string; minutes: number; startedAt: string; invited: { id: number; name: string }[]; inNow: { id: number; name: string }[] };

export default function ManagerHome({ name }: { name: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<"" | "call" | "room">("");
  const [copied, setCopied] = useState("");
  const badges = useBadges();

  const load = useCallback(async () => {
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
    const [res, mres] = await Promise.all([
      fetch("/api/meet/manager-home", { cache: "no-store" }).catch(() => null),
      fetch(`/api/meet/meetings?from=${day}&to=${day}`, { cache: "no-store" }).catch(() => null),
    ]);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return setError(d?.error || "Can't load right now");
    setError("");
    setData(d);
    if (mres?.ok) setMeetings((await mres.json()).meetings || []);
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
    if (data.requests) needs.push({ href: "/meet/rota/requests", icon: "swap_horiz", bg: "#fff1ec", fg: "#e2552b", title: `${data.requests} request${data.requests === 1 ? "" : "s"} to approve`, sub: "Swaps and time off" });
    if (data.phonesWaiting) needs.push({ href: "/meet/staff", icon: "smartphone", bg: "#fff1ec", fg: "#e2552b", title: `${data.phonesWaiting} phone${data.phonesWaiting === 1 ? "" : "s"} to approve`, sub: "Staff signed in on a new phone" });
    if (data.rota.thisNotSent) needs.push({ href: "/meet/rota", icon: "view_timeline", bg: "#fff1ec", fg: "#e2552b", title: "This week's rota not sent", sub: data.rota.thisWeekLabel });
    if (data.rota.changed) needs.push({ href: "/meet/rota", icon: "view_timeline", bg: "#fff1ec", fg: "#e2552b", title: "Rota changes not sent", sub: `${data.rota.changed} ${data.rota.changed === 1 ? "person's" : "people's"} shifts changed · ${data.rota.thisWeekLabel}` });
    if (data.rota.nextNotSent) needs.push({ href: "/meet/rota", icon: "view_timeline", bg: "#eef2ff", fg: "#4f46e5", title: "Next week's rota not sent", sub: data.rota.nextWeekLabel });
    for (const n of data.locked) needs.push({ href: "/meet/staff", icon: "lock", bg: "#fef7e6", fg: "#b45309", title: `${firstName(n)} is locked out`, sub: "Too many wrong PINs" });
    if (data.reports.fresh) needs.push({ href: "/meet/reports", icon: "flag", bg: "#fff1ec", fg: "#e2552b", title: `${data.reports.fresh} new report${data.reports.fresh === 1 ? "" : "s"}`, sub: data.reports.urgent ? `${data.reports.urgent} urgent` : "From staff phones" });
    if (data.hoursFixes) needs.push({ href: "/meet/hours", icon: "schedule", bg: "#fff1ec", fg: "#e2552b", title: `${data.hoursFixes} hours fix${data.hoursFixes === 1 ? "" : "es"} to approve`, sub: "Staff corrected their clock-in times" });
    for (const v of data.voices) needs.push({ href: `/meet/notes/${v.id}`, icon: "record_voice_over", bg: "#eef2ff", fg: "#4f46e5", title: `Name ${v.unnamed} speaker${v.unnamed === 1 ? "" : "s"}`, sub: v.title });
    for (const t of data.toConfirm) needs.push({ href: `/meet/notes/${t.id}`, icon: "auto_awesome", bg: "#fff1ec", fg: "#e2552b", title: `${t.n} task${t.n === 1 ? "" : "s"} to confirm`, sub: t.title });
    if (data.helpAsked) needs.push({ href: "/meet/tasks", icon: "front_hand", bg: "#fef7e6", fg: "#b45309", title: `${data.helpAsked} asked for help`, sub: "On their tasks" });
    if (data.overdue.total) needs.push({ href: "/meet/tasks", icon: "assignment_late", bg: "#fff1ec", fg: "#e2552b", title: `${data.overdue.total} task${data.overdue.total === 1 ? "" : "s"} overdue`, sub: data.overdue.by.map((b) => `${b.name} ${b.n}`).join(" · ") });
  }
  const live = meetings.find((m) => m.status === "live");
  const todays = meetings.filter((m) => m.status !== "ended" && m.status !== "ready");
  const mins = (iso: string) => Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  async function startRoom(m: Meeting) {
    const r = await postJson(`/api/meet/meetings/${m.id}`, { action: "start" });
    if (r.ok) window.location.href = m.kind === "room" ? `/meet/room/${m.id}` : `/meet/call/${m.id}`;
  }
  function copyLink(m: Meeting) {
    navigator.clipboard?.writeText(`${window.location.origin}/meet/call/${m.id}`).then(() => { setCopied(m.id); setTimeout(() => setCopied(""), 2000); });
  }

  const headBtn = (label: ReactNode, icon: string, onClick: () => void, dark?: boolean) => (
    <button onClick={onClick} style={{ height: 40, boxSizing: "border-box", display: "inline-flex", alignItems: "center", gap: 7, padding: dark ? "0 18px" : "0 16px", border: 0, borderRadius: 20, background: dark ? C.ink : "#ffffff", color: dark ? "#ffffff" : C.ink, fontSize: 14, fontWeight: 500, fontFamily: "inherit", boxShadow: dark ? undefined : "0 1px 2px rgba(20,20,20,0.08)", cursor: "pointer" }}>
      <Icon name={icon} size={19} fill={!dark} style={dark ? undefined : { color: "#e2552b" }} />{label}
    </button>
  );

  return (
    <div style={{ minHeight: "100dvh", background: C.page, color: C.ink, fontSize: 14, display: "flex", flexWrap: "wrap", alignContent: "flex-start", width: "100%", overflowX: "clip" }}>
      <IconFont />
      <style>{`html,body{background:${C.page};overflow-x:clip}`}</style>
      <Sidebar current="home" badges={{ ...badges, staff: data?.phonesWaiting || 0, rota: data?.requests || 0 }} />

      <main style={{ flex: "999 1 560px", minWidth: 0, boxSizing: "border-box", padding: "18px 24px 24px 8px", display: "flex", flexDirection: "column", gap: 18 }}>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "4px 4px 0" }}>
          <div style={{ flex: "1 1 240px" }}>
            <p style={{ margin: 0, fontSize: 13, color: C.sub }}>{date}</p>
            <h1 style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>Today at Demi&rsquo;s</h1>
          </div>
          {headBtn("Record a room", "radio_button_checked", () => setCreating("room"))}
          {headBtn("New meeting", "add", () => setCreating("call"), true)}
        </header>

        {error && <p style={{ ...card, margin: 0, color: C.sub }}>{error}</p>}

        {live && (
          <section aria-label="Live now" style={{ position: "relative", overflow: "hidden", borderRadius: 22, background: "linear-gradient(120deg, #ff7a45 0%, #f2643a 45%, #e8513a 100%)", color: "#ffffff", padding: "20px 22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18 }}>
            <div style={{ flex: "1 1 300px", minWidth: 0 }}>
              <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 600 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ffffff" }} />Live now · {mins(live.startedAt)} min</p>
              <h2 style={{ margin: "10px 0 0", fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em" }}>{live.title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>{live.kind === "room" ? "Recording the room" : `${live.inNow.length} in the call`} · notes are written when it ends</p>
            </div>
            <div aria-label={`${live.inNow.length} people in the call`} role="img" style={{ display: "flex" }}>
              {live.inNow.slice(0, 3).map((p, i) => <span key={p.id} style={{ width: 34, height: 34, marginLeft: i ? -9 : 0, borderRadius: "50%", border: "2px solid #f2643a", background: "#ffffff", color: personColourLight(p.id).fg, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(p.name)}</span>)}
              {live.inNow.length > 3 && <span style={{ width: 34, height: 34, marginLeft: -9, borderRadius: "50%", border: "2px solid #f2643a", background: "#ffffff", color: "#6d28d9", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>+{live.inNow.length - 3}</span>}
            </div>
            <a href={`/meet/live/${live.id}`} style={{ height: 40, boxSizing: "border-box", display: "inline-flex", alignItems: "center", padding: "0 16px", borderRadius: 20, background: "rgba(255,255,255,0.18)", color: "#ffffff", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>Attendance</a>
            <a href={live.kind === "room" ? `/meet/room/${live.id}` : `/meet/call/${live.id}`} style={{ height: 40, boxSizing: "border-box", display: "inline-flex", alignItems: "center", gap: 6, padding: "0 18px", borderRadius: 20, background: "#ffffff", color: C.ink, fontSize: 14, fontWeight: 600, textDecoration: "none" }}><Icon name={live.kind === "room" ? "mic" : "videocam"} size={19} fill />{live.kind === "room" ? "Open" : "Join"}</a>
          </section>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
          <section aria-labelledby="today-h" style={{ ...card, flex: "999 1 440px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <h2 id="today-h" style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Schedule</h2>
              <a href="/meet/calendar" style={{ marginLeft: "auto", fontSize: 13, color: C.sub, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 2 }}>Calendar<Icon name="chevron_right" size={17} /></a>
            </div>
            {!data ? (
              <div style={{ height: 120, borderRadius: 16, background: C.page }} />
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {todays.length === 0 && (
                  <li style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 16, background: C.page }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="videocam" size={21} fill style={{ color: "#a19c96" }} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontWeight: 500 }}>No meetings today</p><p style={{ margin: "1px 0 0", fontSize: 12, color: C.sub }}>Tap New meeting to set one up</p></div>
                  </li>
                )}
                {todays.map((m) => {
                  const isLive = m.status === "live";
                  return (
                    <li key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 16, background: isLive ? "#fff3ee" : C.page }}>
                      <div style={{ width: 54, textAlign: "center" }}><p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{m.time}</p><p style={{ margin: 0, fontSize: 11, color: C.sub }}>{m.minutes} min</p></div>
                      <span style={{ width: 40, height: 40, borderRadius: 12, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={m.kind === "room" ? "mic" : "videocam"} size={21} fill style={{ color: m.kind === "room" ? "#b45309" : isLive ? "#e2552b" : "#4f46e5" }} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontWeight: 500 }}>{m.title}</p><p style={{ margin: "1px 0 0", fontSize: 12, color: C.sub }}>{m.kind === "room" ? "Room recording" : "Video call"} · {m.invited.length} invited</p></div>
                      {isLive ? <span style={{ fontSize: 12, fontWeight: 600, color: C.coral, whiteSpace: "nowrap" }}>In progress</span>
                        : m.kind === "room" ? <button onClick={() => startRoom(m)} style={{ height: 36, boxSizing: "border-box", display: "inline-flex", alignItems: "center", padding: "0 14px", border: 0, borderRadius: 18, background: "#ffffff", fontSize: 13, fontWeight: 500, fontFamily: "inherit", color: C.ink, cursor: "pointer" }}>Start</button>
                        : <span style={{ display: "inline-flex", gap: 6 }}>
                            <button onClick={() => copyLink(m)} aria-label={`Copy link for ${m.title}`} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, cursor: "pointer" }}><Icon name={copied === m.id ? "check" : "link"} size={18} /></button>
                            <button onClick={() => startRoom(m)} style={{ height: 36, padding: "0 14px", border: 0, borderRadius: 18, background: "#ffffff", fontSize: 13, fontWeight: 500, fontFamily: "inherit", color: C.ink, cursor: "pointer" }}>Start</button>
                          </span>}
                    </li>
                  );
                })}
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

          <aside className="lg:sticky lg:top-[18px] lg:max-h-[calc(100dvh-36px)] lg:overflow-y-auto" style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
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
                  ["videocam", "Meetings held", data ? `${data.meetingsWeek.held}` : "…"],
                  ["how_to_reg", "Attendance", data ? (data.meetingsWeek.attendance === null ? "–" : `${data.meetingsWeek.attendance}%`) : "…"],
                  ["task_alt", "Tasks done", data ? `${data.meetingsWeek.tasksDone}` : "…"],
                  ["schedule", "Rota hours", data ? `${data.rota.hours}` : "…"],
                  ["groups", "People on the rota", data ? `${data.rota.people}` : "…"],
                  ["visibility", "Seen the rota", data ? (data.rota.onRota ? `${data.rota.seen} of ${data.rota.onRota}` : "Not sent") : "…"],
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
      {creating && <NewMeetingFor kind={creating} onClose={() => setCreating("")} onCreated={(id) => { setCreating(""); load(); if (creating === "room") window.location.href = `/meet/room/${id}`; }} />}
    </div>
  );
}

/** "Record a room" opens the same dialog; a room recording made for now goes straight to the recorder. */
function NewMeetingFor({ kind, onClose, onCreated }: { kind: "call" | "room"; onClose: () => void; onCreated: (id: string) => void }) {
  return <NewMeeting kind={kind} onClose={onClose} onCreated={onCreated} />;
}
