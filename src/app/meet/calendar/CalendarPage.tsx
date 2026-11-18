"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Icon, personColourLight, initial, firstName } from "../ui";
import { ManagerFrame, PAGE as C, panel, mono, useJson, postJson } from "../ManagerShell";
import NewMeeting from "../NewMeeting";

/* 8 · Calendar. Values from the design canvas. */

type Meeting = {
  id: string; title: string; kind: "call" | "room"; status: string; date: string; time: string; startsAt: string; minutes: number; private: boolean;
  host: string; invited: { id: number; name: string }[]; inNow: { id: number; name: string }[]; came: number;
};
type Task = { id: string; title: string; dueDate: string; status: string; owner: string; ownerId: number };

const addDays = (d: string, n: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
const mondayOf = (d: string) => addDays(d, -((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7));
const todayLondon = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const nowMin = () => { const [h, m] = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/London" }).split(":").map(Number); return h * 60 + m; };
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const ROW = 29; // half an hour (the design's 58px hour)

function rangeTitle(view: string, anchor: string) {
  if (view === "day") return fmt(anchor, { weekday: "long", day: "numeric", month: "long" });
  if (view === "month") return fmt(anchor, { month: "long", year: "numeric" });
  const mon = mondayOf(anchor), sun = addDays(mon, 6);
  return mon.slice(5, 7) === sun.slice(5, 7) ? `${Number(mon.slice(8))} – ${fmt(sun, { day: "numeric", month: "long" })}` : `${fmt(mon, { day: "numeric", month: "short" })} – ${fmt(sun, { day: "numeric", month: "short" })}`;
}

const tone = (m: Meeting): CSSProperties =>
  m.status === "live" ? { background: "linear-gradient(120deg, #ff7a45, #e8513a)", color: "#ffffff" }
    : m.status === "ended" || m.status === "ready" ? { background: C.page, color: C.body }
    : m.kind === "room" ? { background: "#fef3e2", color: "#78350f" } : { background: C.coralBg, color: "#7c2d12" };

export default function CalendarPage() {
  const today = todayLondon();
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [anchor, setAnchor] = useState(today);
  const [creating, setCreating] = useState<string | null>(null);
  const [open, setOpen] = useState<Meeting | null>(null);
  const [note, setNote] = useState("");
  const [, setClock] = useState(0);

  const from = view === "day" ? anchor : view === "week" ? mondayOf(anchor) : mondayOf(anchor.slice(0, 8) + "01");
  const to = view === "day" ? anchor : view === "week" ? addDays(mondayOf(anchor), 6) : addDays(from, 41);
  const meetings = useJson<{ meetings: Meeting[] }>(`/api/meet/meetings?from=${from}&to=${to}`);
  const tasks = useJson<{ tasks: Task[] }>("/api/meet/tasks?manage=1").data?.tasks || [];

  useEffect(() => { const t = setInterval(() => { setClock((c) => c + 1); meetings.reload(); }, 60_000); return () => clearInterval(t); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = (meetings.data?.meetings || []).filter((m) => m.date >= from && m.date <= to);
  const due = tasks.filter((t) => (t.status === "open" || t.status === "help") && t.dueDate >= from && t.dueDate <= to);
  const days = view === "day" ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(mondayOf(anchor), i));

  // Hours shown: 09:00 to 18:00, stretched to fit anything earlier or later.
  const starts = list.map((m) => toMin(m.time));
  const ends = list.map((m) => toMin(m.time) + m.minutes);
  const firstHour = Math.min(9, ...starts.map((s) => Math.floor(s / 60)));
  const lastHour = Math.min(24, Math.max(19, ...ends.map((e) => Math.ceil(e / 60))));
  const rows = (lastHour - firstHour) * 2;
  const rowOf = (min: number) => Math.max(1, Math.min(rows, Math.floor((min - firstHour * 60) / 30) + 1));
  const step = (n: number) => setAnchor(view === "day" ? addDays(anchor, n) : view === "week" ? addDays(anchor, 7 * n) : (() => { const d = new Date(`${anchor.slice(0, 8)}01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); })());

  const cols = `52px repeat(${days.length}, minmax(0, 1fr))`;
  const minWidth = days.length > 1 ? 760 : 0;

  function openMeeting(m: Meeting) {
    if (m.status === "live") window.location.href = `/meet/call/${m.id}`;
    else if (m.status === "ended" || m.status === "ready") window.location.href = `/meet/notes/${m.id}`;
    else setOpen(m);
  }

  const avatars = (people: { id: number; name: string }[], ring: string) => (
    <span style={{ display: "flex", marginTop: "auto" }}>
      {people.slice(0, 3).map((p, i) => { const col = personColourLight(p.id); return <span key={p.id} style={{ width: 20, height: 20, marginLeft: i ? -6 : 0, borderRadius: "50%", border: `2px solid ${ring}`, background: col.bg, color: col.fg, fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(p.name)}</span>; })}
    </span>
  );

  return (
    <ManagerFrame current="calendar">
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "4px 4px 0" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>{rangeTitle(view, anchor)}</h1>
        <div style={{ display: "flex", gap: 4, marginLeft: 6 }}>
          <button aria-label={`Previous ${view}`} onClick={() => step(-1)} style={roundBtn}><Icon name="chevron_left" size={20} /></button>
          <button aria-label={`Next ${view}`} onClick={() => step(1)} style={roundBtn}><Icon name="chevron_right" size={20} /></button>
          {anchor !== today && <button onClick={() => setAnchor(today)} style={{ ...roundBtn, width: "auto", padding: "0 12px", fontSize: 13, fontFamily: "inherit" }}>Today</button>}
        </div>
        <div role="group" aria-label="View" style={{ marginLeft: "auto", display: "flex", gap: 4, padding: 4, borderRadius: 20, background: "#ebe7e2" }}>
          {(["day", "week", "month"] as const).map((v) => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)} style={{ height: 32, padding: "0 14px", border: 0, borderRadius: 16, background: view === v ? "#ffffff" : "transparent", fontSize: 13, fontWeight: view === v ? 600 : 500, fontFamily: "inherit", color: C.ink, boxShadow: view === v ? "0 1px 2px rgba(20,20,20,0.08)" : "none", cursor: "pointer", textTransform: "capitalize" }}>{v}</button>
          ))}
        </div>
        <button onClick={() => setCreating(view === "day" ? anchor : today)} style={{ height: 40, boxSizing: "border-box", display: "inline-flex", alignItems: "center", gap: 7, padding: "0 18px", border: 0, borderRadius: 20, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}><Icon name="add" size={19} />New meeting</button>
      </header>
      {note && <p role="status" style={{ margin: "0 4px", fontSize: 13, color: C.body }}>{note}</p>}
      {meetings.error ? <p style={{ ...panel, margin: 0, color: C.sub }}>{meetings.error}</p> : view === "month" ? (
        <section aria-label="Month" style={{ borderRadius: 24, background: "#ffffff", padding: 12, boxShadow: "0 1px 2px rgba(20,20,20,0.05)", overflowX: "auto" }}>
          <div style={{ minWidth: 700, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <p key={d} style={{ margin: 0, padding: "4px 6px", fontSize: 12, color: C.sub }}>{d}</p>)}
            {Array.from({ length: 42 }, (_, i) => addDays(from, i)).map((d) => {
              const inMonth = d.slice(0, 7) === anchor.slice(0, 7);
              const ms = list.filter((m) => m.date === d);
              const ts = due.filter((t) => t.dueDate === d);
              return (
                <button key={d} onClick={() => { setAnchor(d); setView("day"); }} style={{ minHeight: 92, padding: 8, border: 0, borderRadius: 14, background: d === today ? "#fffaf7" : inMonth ? C.page : "transparent", textAlign: "left", fontFamily: "inherit", color: inMonth ? C.ink : "#b6b0a9", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: d === today ? C.coral : undefined }}>{Number(d.slice(8))}</span>
                  {ms.slice(0, 3).map((m) => <span key={m.id} style={{ ...tone(m), borderRadius: 8, padding: "2px 6px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.time} {m.title}</span>)}
                  {ms.length > 3 && <span style={{ fontSize: 11, color: C.sub }}>+{ms.length - 3} more</span>}
                  {ts.length > 0 && <span style={{ fontSize: 11, color: "#3730a3", display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="check_circle" size={13} />{ts.length} due</span>}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section aria-label={view === "day" ? "Day" : "Week"} style={{ borderRadius: 24, background: "#ffffff", padding: "8px 12px 12px", boxShadow: "0 1px 2px rgba(20,20,20,0.05)", overflowX: "auto" }}>
          <div style={{ minWidth, display: "grid", gridTemplateColumns: cols, columnGap: 6 }}>
            <span />
            {days.map((d) => (
              <div key={d} style={{ padding: "8px 4px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 12, color: d === today ? C.coral : C.sub, fontWeight: d === today ? 600 : 400 }}>{fmt(d, { weekday: "short" })}</p>
                {d === today
                  ? <p style={{ margin: "2px auto 0", width: 32, height: 32, borderRadius: 16, background: "#f2643a", color: "#ffffff", fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{Number(d.slice(8))}</p>
                  : <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 600 }}>{Number(d.slice(8))}</p>}
              </div>
            ))}
          </div>
          {/* Tasks due: a strip above the hours, so they never cover a meeting. */}
          {due.length > 0 && (
            <div style={{ minWidth, display: "grid", gridTemplateColumns: cols, columnGap: 6, paddingBottom: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.sub, paddingTop: 8 }}>Due</span>
              {days.map((d) => (
                <div key={d} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {due.filter((t) => t.dueDate === d).map((t) => (
                    <a key={t.id} href="/meet/tasks" title={`${t.title} · ${t.owner}`} style={{ borderRadius: 12, border: "1.5px dashed #a5b4fc", color: "#3730a3", padding: "6px 10px", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <Icon name="check_circle" size={16} /><span style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                    </a>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div style={{ minWidth, position: "relative", display: "grid", gridTemplateColumns: cols, gridTemplateRows: `repeat(${rows}, ${ROW}px)`, columnGap: 6, borderTop: `1px solid ${C.line}` }}>
            {Array.from({ length: lastHour - firstHour }, (_, i) => (
              <span key={i} style={{ gridColumn: 1, gridRow: `${i * 2 + 1} / span 2`, fontFamily: mono, fontSize: 11, color: C.sub, paddingTop: 4 }}>{hhmm((firstHour + i) * 60)}</span>
            ))}
            {days.map((d, i) => d === today && <span key={d} style={{ gridColumn: i + 2, gridRow: `1 / ${rows + 1}`, background: "#fffaf7", borderRadius: 12 }} />)}
            {days.map((d, i) => {
              // Each day: meetings placed by their real times; ones that overlap sit side by side.
              const evs = list.filter((m) => m.date === d).map((m) => ({ m, s: toMin(m.time), e: toMin(m.time) + Math.max(15, m.minutes) })).sort((a, b) => a.s - b.s);
              const lanes: number[] = [];
              const placed = evs.map((ev) => { let lane = lanes.findIndex((end) => end <= ev.s); if (lane < 0) { lane = lanes.length; lanes.push(ev.e); } else lanes[lane] = ev.e; return { ...ev, lane }; });
              const width = (ev: (typeof placed)[number]) => Math.max(1, ...placed.filter((o) => o.s < ev.e && o.e > ev.s).map((o) => o.lane + 1));
              return (
                <div key={d} style={{ gridColumn: i + 2, gridRow: `1 / ${rows + 1}`, position: "relative", zIndex: 1 }}>
                  {placed.map((ev) => {
                    const { m } = ev;
                    const top = ((ev.s - firstHour * 60) / 30) * ROW;
                    const h = Math.max(ROW - 6, ((ev.e - ev.s) / 30) * ROW - 8);
                    const n = width(ev);
                    const live = m.status === "live";
                    const t = tone(m);
                    const tall = h >= 2 * ROW - 8;
                    return (
                      <button key={m.id} onClick={() => openMeeting(m)} title={`${m.title} · ${m.time} – ${hhmm(ev.s + m.minutes)}`} style={{ position: "absolute", top: top + 4, height: h, left: `calc(${(ev.lane / n) * 100}% + ${ev.lane ? 2 : 0}px)`, width: `calc(${100 / n}% - ${n > 1 ? 2 : 0}px)`, boxSizing: "border-box", border: 0, borderRadius: 12, padding: tall ? "8px 10px" : "4px 10px", textAlign: "left", fontFamily: "inherit", display: "flex", flexDirection: tall ? "column" : "row", alignItems: tall ? "stretch" : "center", gap: tall ? 4 : 6, overflow: "hidden", cursor: "pointer", ...t }}>
                        <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{m.private && <Icon name="lock" size={12} style={{ marginRight: 3 }} />}{m.title}</span>
                        <span style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                          {live ? <><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff" }} />Live · {m.inNow.length} in</> : tall ? `${m.time} – ${hhmm(ev.s + m.minutes)} · ${m.kind === "room" ? "Room" : "Video"}` : m.time}
                        </span>
                        {tall && h > 3 * ROW && m.invited.length > 0 && avatars(m.invited, String(t.background).startsWith("#") ? String(t.background) : "#ffffff")}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {days.includes(today) && nowMin() >= firstHour * 60 && nowMin() < lastHour * 60 && (
              <div aria-hidden="true" style={{ gridColumn: days.indexOf(today) + 2, gridRow: rowOf(nowMin()), alignSelf: "start", marginTop: ((nowMin() - firstHour * 60) % 30) / 30 * ROW, height: 2, background: "#f2643a", position: "relative", zIndex: 2 }}>
                <span style={{ position: "absolute", left: -4, top: -3, width: 8, height: 8, borderRadius: "50%", background: "#f2643a" }} />
              </div>
            )}
          </div>
          {list.length === 0 && due.length === 0 && <p style={{ margin: "10px 4px 0", fontSize: 13, color: C.sub }}>Nothing this {view}. Tap New meeting to set one up.</p>}
        </section>
      )}
      <p style={{ margin: "0 4px", fontSize: 12, color: C.sub }}>Staff get a notification and an email for each meeting they&rsquo;re invited to, and it shows in their calendar on the app.</p>
      {creating !== null && <NewMeeting date={creating} onClose={() => setCreating(null)} onCreated={() => { setCreating(null); setNote("Meeting created. Everyone invited has been told."); meetings.reload(); }} />}
      {open && <MeetingSheet m={open} onClose={() => setOpen(null)} onChanged={(msg) => { setOpen(null); setNote(msg); meetings.reload(); }} />}
    </ManagerFrame>
  );
}

const roundBtn: CSSProperties = { width: 36, height: 36, border: 0, borderRadius: 18, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.08)", cursor: "pointer", color: C.ink };

/** A scheduled meeting: who's invited, start it now, or cancel it. */
function MeetingSheet({ m, onClose, onChanged }: { m: Meeting; onClose: () => void; onChanged: (msg: string) => void }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  async function start() {
    setBusy("start");
    const r = await postJson(`/api/meet/meetings/${m.id}`, { action: "start" });
    if (!r.ok) { setBusy(""); return setErr(r.data.error || "Couldn't start it"); }
    window.location.href = m.kind === "room" ? `/meet/room/${m.id}` : `/meet/call/${m.id}`;
  }
  async function cancel() {
    if (!confirm(`Cancel "${m.title}"? Everyone invited is told.`)) return;
    setBusy("cancel");
    const r = await postJson(`/api/meet/meetings/${m.id}`, { action: "cancel" });
    setBusy("");
    if (!r.ok) return setErr(r.data.error || "Couldn't cancel it");
    onChanged("Meeting cancelled. Everyone invited has been told.");
  }
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(40,32,26,0.42)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 16px" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ms-h" style={{ width: "100%", maxWidth: 440, background: "#ffffff", borderRadius: 28, padding: 22, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 30px 70px -20px rgba(20,20,20,0.45)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: m.kind === "room" ? "#fef3e2" : C.coralBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={m.kind === "room" ? "mic" : "videocam"} size={22} fill style={{ color: m.kind === "room" ? "#b45309" : C.accent }} /></span>
          <div style={{ flex: 1 }}>
            <h2 id="ms-h" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{m.title}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: C.sub }}>{fmt(m.date, { weekday: "short", day: "numeric", month: "short" })} · {m.time} · {m.minutes} min · {m.kind === "room" ? "Room recording" : "Video call"}{m.private ? " · Private" : ""}</p>
          </div>
          <button aria-label="Close" onClick={onClose} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: C.page, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ink }}><Icon name="close" size={20} /></button>
        </div>
        {m.invited.length > 0 && <p style={{ margin: 0, fontSize: 13, color: C.body }}>Invited: {m.invited.map((p) => firstName(p.name)).join(", ")}</p>}
        {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{err}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={cancel} disabled={!!busy} style={{ height: 44, padding: "0 16px", border: 0, borderRadius: 22, background: C.page, color: "#b91c1c", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>{busy === "cancel" ? "Cancelling…" : "Cancel meeting"}</button>
          <button onClick={start} disabled={!!busy} style={{ marginLeft: "auto", height: 44, padding: "0 20px", border: 0, borderRadius: 22, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <Icon name={m.kind === "room" ? "mic" : "videocam"} size={19} fill />{busy === "start" ? "Starting…" : m.kind === "room" ? "Start recording" : "Start now"}
          </button>
        </div>
      </div>
    </div>
  );
}
