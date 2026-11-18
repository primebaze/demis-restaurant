"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Icon, personColourLight, initial, firstName } from "./ui";
import { PAGE as C, postJson } from "./ManagerShell";

/* 2 · New meeting (a dialog over the manager pages). Values from the design canvas. */

type Person = { id: number; name: string; role: string; branch: string };

const londonNow = () => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value || "";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: Number(g("hour")), time: `${g("hour")}:${g("minute")}` };
};
const quick: CSSProperties = { marginLeft: "auto", height: 24, padding: "0 10px", border: 0, borderRadius: 12, background: C.page, color: C.ink, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" };
const weekday = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const LENGTHS = [15, 20, 30, 45, 60];
// Longest allowed (keeps recording and transcription costs in check): room 30 min, call 1 hour.
const MAX_LEN: Record<"call" | "room", number> = { room: 30, call: 60 };

const fieldWrap: CSSProperties = { position: "relative" };
const field: CSSProperties = { width: "100%", height: 48, boxSizing: "border-box", padding: "0 12px 0 42px", border: 0, borderRadius: 16, background: C.page, fontSize: 15, fontFamily: "inherit", color: C.ink };
const fieldIcon: CSSProperties = { position: "absolute", left: 14, top: 14, color: C.sub, pointerEvents: "none" };
const lbl: CSSProperties = { fontSize: 13, fontWeight: 500, color: C.body };

export default function NewMeeting({ onClose, onCreated, date: startDate, kind: startKind = "call" }: { onClose: () => void; onCreated: (id: string) => void; date?: string; kind?: "call" | "room" }) {
  const now = londonNow();
  const [people, setPeople] = useState<Person[]>([]);
  const [meId, setMeId] = useState(0);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"call" | "room">(startKind);
  const [date, setDate] = useState(startDate || now.date);
  const [time, setTime] = useState(`${String(Math.min(22, now.hour + 1)).padStart(2, "0")}:00`);
  // "Now": the time is taken when Create is pressed, and the meeting opens straight away.
  const [startNow, setStartNow] = useState(false);
  const [minutes, setMinutes] = useState(30);
  // Invites: one group (All Cricklewood, All Streatham, Managers, Everyone) picked like a tab, plus
  // anyone added by name. Picking another group swaps the group; people added by name stay.
  const [group, setGroup] = useState("");
  const [manual, setManual] = useState<number[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [liveNotes, setLiveNotes] = useState(true);
  const [repeat, setRepeat] = useState<"" | "daily" | "weekly">("");
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/meet/team", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const list: Person[] = (d.people || d.staff || []).filter((p: { active?: boolean }) => p.active !== false).map((p: Person & { clockinId?: number }) => ({ id: p.id ?? p.clockinId, name: p.name, role: p.role || "", branch: p.branch || "" }));
      setPeople(list);
    }).catch(() => {});
    fetch("/api/meet/me", { cache: "no-store" }).then((r) => r.json()).then((d) => setMeId(d?.person?.id || 0)).catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const others = people.filter((p) => p.id !== meId);
  const GROUPS: [string, string, (p: Person) => boolean][] = [
    ["cricklewood", "All Cricklewood", (p) => p.branch === "cricklewood" || p.branch === "both"],
    ["streatham", "All Streatham", (p) => p.branch === "streatham" || p.branch === "both"],
    ["managers", "Managers", (p) => p.role.toLowerCase() === "manager"],
    ["everyone", "Everyone", () => true],
  ];
  const groupIds = useMemo(() => { const g = GROUPS.find(([k]) => k === group); return g ? others.filter(g[2]).map((p) => p.id) : []; },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group, others]);
  const invite = useMemo(() => Array.from(new Set([...groupIds.filter((id) => !removed.includes(id)), ...manual])), [groupIds, removed, manual]);
  const add = (ids: number[]) => { setManual((cur) => Array.from(new Set([...cur, ...ids]))); setRemoved((r) => r.filter((x) => !ids.includes(x))); };
  const removeOne = (id: number) => { setManual((cur) => cur.filter((x) => x !== id)); setRemoved((r) => [...r, id]); };
  const matches = useMemo(() => (search.trim() ? others.filter((p) => !invite.includes(p.id) && p.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 6) : []), [search, others, invite]);

  async function create() {
    // Say what's missing (and take them to it) rather than leaving a grey button.
    if (!title.trim()) {
      setErr("Give the meeting a title first.");
      const t = document.getElementById("nm-name");
      t?.scrollIntoView({ behavior: "smooth", block: "center" });
      t?.focus({ preventScroll: true });
      return;
    }
    if (kind === "call" && invite.length === 0) {
      setErr("Invite at least one person to a video call.");
      document.getElementById("nm-invite")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    setErr("");
    const at = startNow ? londonNow() : null;
    const r = await postJson("/api/meet/meetings", { title, kind, date: at ? at.date : date, time: at ? at.time : time, minutes, invite, liveNotes, repeat, private: priv });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error || "Couldn't create the meeting");
    if (startNow) {
      const id = String(r.data.id);
      // A call goes live at once (everyone invited is told it's started); a room recording opens its
      // screen, where Start recording asks for the microphone.
      if (kind === "call") await postJson(`/api/meet/meetings/${id}`, { action: "start" });
      window.location.href = `/meet/${kind === "room" ? "room" : "call"}/${id}`;
      return;
    }
    onCreated(String(r.data.id));
  }

  const kindCard = (k: "call" | "room", icon: string, name: string, text: string, iconColour: string) => {
    const on = kind === k;
    return (
      <label style={{ display: "flex", gap: 12, padding: 16, borderRadius: 20, background: on ? C.ink : C.page, color: on ? "#ffffff" : C.ink, cursor: "pointer", position: "relative" }}>
        <input type="radio" name="kind" checked={on} onChange={() => { setKind(k); setMinutes((m) => Math.min(m, MAX_LEN[k])); }} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
        <Icon name={icon} size={24} fill={k === "call"} style={{ color: iconColour }} />
        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
          <span style={{ fontSize: 13, color: on ? "#c9c3bc" : C.sub, lineHeight: 1.45 }}>{text}</span>
        </span>
      </label>
    );
  };
  const toggle = (icon: string, text: string, on: boolean, set: (v: boolean) => void, first = false, colour = C.body, fill = false) => (
    <label style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, borderTop: first ? undefined : "1px solid #ebe6e0", cursor: "pointer" }}>
      <Icon name={icon} size={21} fill={fill} style={{ color: colour }} /><span style={{ flex: 1 }}>{text}</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} style={{ width: 20, height: 20, accentColor: "#f2643a" }} />
    </label>
  );

  return (
    <div data-overlay onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(40,32,26,0.42)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "36px 16px", overflowY: "auto" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="nm-title" style={{ width: "100%", maxWidth: 648, boxSizing: "border-box", background: "#ffffff", borderRadius: 28, boxShadow: "0 30px 70px -20px rgba(20,20,20,0.45)", padding: 26, display: "flex", flexDirection: "column", gap: 20, color: C.ink }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: C.coralBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="event" size={24} fill style={{ color: C.accent }} /></span>
          <div style={{ flex: 1 }}>
            <h2 id="nm-title" style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>New meeting</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: C.sub }}>Invites go out as a notification and an email</p>
          </div>
          <button aria-label="Close" onClick={onClose} style={{ width: 40, height: 40, border: 0, borderRadius: 20, background: C.page, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ink }}><Icon name="close" size={20} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="nm-name" style={lbl}>Title</label>
          <input id="nm-name" value={title} onChange={(e) => { setTitle(e.target.value); setErr(""); }} maxLength={120} placeholder="Weekly managers' catch-up" style={{ ...field, padding: "0 16px" }} />
        </div>
        <div role="radiogroup" aria-label="Type" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {kindCard("call", "videocam", "Video call", "Everyone joins from their own phone or computer", "#ffad8c")}
          {kindCard("room", "mic", "Room recording", "One computer records everyone in the room", "#b45309")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label htmlFor="nm-day" style={lbl}>Date</label>
              <button type="button" onClick={() => setDate(londonNow().date)} aria-pressed={date === londonNow().date} style={{ ...quick, ...(date === londonNow().date ? { background: C.ink, color: "#ffffff" } : {}) }}>Today</button>
            </div>
            <div style={fieldWrap}><Icon name="calendar_today" size={19} style={fieldIcon} /><input id="nm-day" type="date" value={date} min={now.date} onChange={(e) => { setDate(e.target.value); setStartNow(false); }} style={field} /></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label htmlFor="nm-time" style={lbl}>Time</label>
              <button type="button" aria-pressed={startNow} onClick={() => { const n = londonNow(); if (!startNow) { setDate(n.date); setTime(n.time); } setStartNow(!startNow); }} title="Start it as soon as it's created" style={{ ...quick, ...(startNow ? { background: C.ink, color: "#ffffff" } : {}) }}>Now</button>
            </div>
            <div style={fieldWrap}><Icon name="schedule" size={19} style={fieldIcon} />
              {startNow
                ? <button type="button" id="nm-time" onClick={() => setStartNow(false)} title="Pick a time instead" style={{ ...field, textAlign: "left", cursor: "pointer", fontWeight: 500 }}>Now</button>
                : <input id="nm-time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} style={field} />}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label htmlFor="nm-len" style={lbl}>Length</label>
              <span style={{ marginLeft: "auto", fontSize: 12, color: C.sub }}>Up to {kind === "room" ? "30 min" : "1 hour"}</span>
            </div>
            <div style={fieldWrap}><Icon name="timer" size={19} style={fieldIcon} />
              <select id="nm-len" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={{ ...field, appearance: "none" }}>
                {LENGTHS.filter((m) => m <= MAX_LEN[kind]).map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? "s" : ""}`}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline" }}><label htmlFor="nm-invite" style={lbl}>{kind === "room" ? "Invite (optional)" : "Invite"}</label><span style={{ marginLeft: "auto", fontSize: 12, color: C.sub }}>From the clock-in app</span></div>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, minHeight: 52, boxSizing: "border-box", padding: 8, borderRadius: 16, background: C.page }}>
              {invite.map((id) => {
                const p = people.find((x) => x.id === id);
                if (!p) return null;
                const col = personColourLight(id);
                return (
                  <button key={id} onClick={() => removeOne(id)} aria-label={`Remove ${p.name}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px 0 4px", border: 0, borderRadius: 16, background: "#ffffff", fontSize: 13, whiteSpace: "nowrap", fontFamily: "inherit", color: C.ink, cursor: "pointer" }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(p.name)}</span>{firstName(p.name)}
                  </button>
                );
              })}
              <input id="nm-invite" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { add([matches[0].id]); setSearch(""); } }} placeholder="Add people" autoComplete="off" style={{ flex: 1, minWidth: 100, height: 32, border: 0, outline: 0, background: "transparent", fontSize: 14, fontFamily: "inherit", color: C.ink }} />
            </div>
            {matches.length > 0 && (
              <div role="listbox" style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", zIndex: 5, padding: 6, borderRadius: 16, background: "#ffffff", boxShadow: "0 12px 32px rgba(20,20,20,0.16)" }}>
                {matches.map((p) => (
                  <button key={p.id} role="option" aria-selected="false" onClick={() => { add([p.id]); setSearch(""); }} style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, height: 40, padding: "0 10px", border: 0, borderRadius: 10, background: "transparent", fontFamily: "inherit", fontSize: 14, color: C.ink, textAlign: "left", cursor: "pointer" }}>
                    {p.name}<span style={{ marginLeft: "auto", fontSize: 12, color: C.sub }}>{p.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {GROUPS.map(([k, label, f]) => {
              const on = group === k;
              const n = others.filter(f).length;
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => { setGroup(on ? "" : k); setRemoved([]); }} style={{ height: 34, padding: "0 14px", border: on ? "1px solid transparent" : "1px solid #e6e1db", borderRadius: 17, background: on ? C.ink : "#ffffff", fontSize: 13, fontWeight: on ? 500 : 400, fontFamily: "inherit", whiteSpace: "nowrap", color: on ? "#ffffff" : C.ink, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {on ? <Icon name="check" size={16} /> : "+"} {label}<span style={{ fontSize: 12, opacity: 0.7 }}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, borderRadius: 20, background: C.page, padding: "6px 16px" }}>
          {toggle("auto_awesome", "Live notes, captions and tasks", liveNotes, setLiveNotes, true, C.accent, true)}
          {toggle("repeat", "Repeat every day", repeat === "daily", (v) => setRepeat(v ? "daily" : ""))}
          {toggle("repeat", `Repeat every ${weekday(date)}`, repeat === "weekly", (v) => setRepeat(v ? "weekly" : ""))}
          {toggle("lock", "Private (manager PIN to read notes)", priv, setPriv)}
        </div>
        {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{err}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ height: 48, padding: "0 20px", border: 0, borderRadius: 24, background: "transparent", fontSize: 15, fontWeight: 500, fontFamily: "inherit", color: C.ink, cursor: "pointer" }}>Cancel</button>
          <button onClick={create} disabled={busy} style={{ height: 48, display: "inline-flex", alignItems: "center", gap: 8, padding: "0 22px", border: 0, borderRadius: 24, background: C.ink, color: "#ffffff", fontSize: 15, fontWeight: 500, fontFamily: "inherit", opacity: !title.trim() || (kind === "call" && invite.length === 0) ? 0.55 : 1, cursor: "pointer" }}>
            {busy ? (startNow ? "Starting…" : "Creating…") : startNow ? (kind === "call" ? "Start the call now" : "Create and go to recording") : invite.length ? "Create and send invites" : "Create"}<Icon name="arrow_forward" size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
