"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Icon, IconFont, personColour, personColourLight, initial, firstName, BRANCH } from "../ui";
import { useCall, type PeerView } from "./useCall";

/*
 * A meeting on any device: 3b waiting for the host, 3 join, 31 in the call (phone),
 * 4 in the call (computer, with the people and notes panel) and 3c meeting ended.
 * Values from the design canvas.
 */

type Attendee = { id: number; name: string; branch: string; invited: boolean; presence: string; joinedAt: string; leftAt: string; seconds: number; onShift: boolean };
type Detail = {
  meeting: { id: string; title: string; kind: string; status: string; date: string; time: string; startsAt: string; minutes: number; private: boolean; liveNotes: boolean; host: string; startedAt: string; endedAt: string; stopsAt?: string };
  me: { id: number; name: string; manager: boolean; invited: boolean; joined: boolean; seconds: number };
  attendees: Attendee[];
  notes: { tasks: { id: string; title: string; ownerId: number; dueDate: string; status: string }[] } | null;
  live: { lines: { ms: number; name: string; text: string }[]; talk: { name: string; pct: number }[] } | null;
  ready: { transcription: boolean; summary: boolean };
};

const L = { page: "#f6f4f1", ink: "#141414", sub: "#6e6a65", body: "#3b3834", line: "#f0ece7", coral: "#c2410c", coralBg: "#fff1ec", accent: "#e2552b", orange: "#f2643a" };
const D = { bg: "#0f0f0f", card: "#1c1c1c", chip: "#1f1f1f", btn: "#232323", muted: "#a3a3a3", faint: "#737373" };
const mono = "var(--font-geist-mono), 'Geist Mono', monospace";
const glass: CSSProperties = { background: "rgba(20,20,20,0.42)", WebkitBackdropFilter: "blur(16px) saturate(160%)", backdropFilter: "blur(16px) saturate(160%)", color: "#ffffff" };
const gradient = "linear-gradient(120deg, #ff7a45, #e8513a)";
const dayLong = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const dayShort = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const clock = (ms: number, hours = false) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${hours || h ? `${String(h).padStart(2, "0")}:` : ""}${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
};
const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

/** A tiny "you're in" chime (no sound file needed). */
function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.32);
    });
  } catch { /* no sound: fine */ }
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 36, padding: "0 14px", borderRadius: 18, background: dark ? "#1f1f1f" : L.ink }}>
      <img src="/meet/logo.png" alt="Demi's" style={{ height: 13, width: "auto" }} />
      <span style={{ width: 1, height: 14, background: "#4a4540" }} />
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#e8cc9c" }}>Meetings</span>
    </span>
  );
}

/** Plays a stream: video (always muted; sound goes through the audio element). */
function Media({ stream, mirror, style }: { stream: MediaStream | null; mirror?: boolean; style?: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: mirror ? "scaleX(-1)" : undefined, ...style }} />;
}
function Sound({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (ref.current && ref.current.srcObject !== stream) { ref.current.srcObject = stream; ref.current.play().catch(() => {}); } }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}
const hasVideo = (s: MediaStream | null) => !!s && s.getVideoTracks().some((t) => t.readyState === "live" && !t.muted);

export default function CallPage({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [wantMic, setWantMic] = useState(true);
  const [wantCam, setWantCam] = useState(false);
  const wide = useWide();

  const load = useCallback(async () => {
    const res = await fetch(`/api/meet/meetings/${id}`, { cache: "no-store" }).catch(() => null);
    if (!res) return setError("Can't connect right now");
    const d = await res.json().catch(() => ({}));
    if (res.status === 401) { window.location.replace(`/meet?join=${encodeURIComponent(id)}`); return; }
    if (!res.ok) return setError(d.error || "Meeting not found");
    // Room recordings have no call: managers go to the room screen; staff are told.
    if (d.meeting?.kind === "room") {
      if (d.me?.manager) { window.location.replace(`/meet/room/${id}`); return; }
      return setError("This meeting is recorded on one device in the room, so there's no call to join.");
    }
    setError("");
    setDetail(d);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const me = detail?.me || { id: 0, name: "" };
  const call = useCall(id, { id: me.id, name: me.name }, { record: !!detail?.meeting.liveNotes });

  // Refresh: every 5s while waiting, every 10s in the call (people panel, live notes).
  useEffect(() => {
    if (!detail) return;
    const t = setInterval(load, call.status === "in" ? 10_000 : 5_000);
    return () => clearInterval(t);
  }, [detail, load, call.status]);

  // Let in automatically when the host starts it.
  const wasScheduled = useRef(false);
  useEffect(() => {
    if (detail?.meeting.status === "scheduled") wasScheduled.current = true;
    if (detail?.meeting.status === "live" && wasScheduled.current) { wasScheduled.current = false; chime(); }
  }, [detail?.meeting.status]);

  async function join() {
    await call.join();
    load();
    if (!wantMic) call.toggleMic();
    if (wantCam) call.toggleCam();
  }

  let screen: ReactNode;
  if (error) screen = <Light><Logo /><p style={{ margin: "40px 0 0", fontSize: 17, textAlign: "center" }}>{error}</p><a href="/meet" style={btnLightWide}>Back to the app</a></Light>;
  else if (!detail) screen = <Light><Logo /><p style={{ margin: "40px 0 0", color: L.sub, textAlign: "center" }}>Loading the meeting…</p></Light>;
  else if (call.status === "ended" || (call.status !== "in" && ["ended", "ready"].includes(detail.meeting.status))) screen = <Ended d={detail} seconds={detail.me.seconds} onRejoin={detail.meeting.status === "live" ? () => window.location.reload() : undefined} />;
  else if (call.status === "in") screen = wide ? <ComputerCall d={detail} call={call} /> : <PhoneCall d={detail} call={call} />;
  else if (detail.meeting.status === "scheduled") screen = <Waiting d={detail} mic={wantMic} cam={wantCam} onMic={() => setWantMic(!wantMic)} onCam={() => setWantCam(!wantCam)} reload={load} />;
  else screen = <Join d={detail} mic={wantMic} cam={wantCam} onMic={() => setWantMic(!wantMic)} onCam={() => setWantCam(!wantCam)} onJoin={join} busy={call.status === "joining"} error={call.error} />;

  return (
    <>
      <IconFont />
      <style>{`html,body{background:${call.status === "in" && !wide ? D.bg : L.page};overflow-x:clip}`}</style>
      {screen}
      {call.peers.map((p) => <Sound key={p.peerId} stream={p.stream} />)}
    </>
  );
}

function Light({ children, gap = 16 }: { children: ReactNode; gap?: number }) {
  return (
    <div style={{ minHeight: "100dvh", background: L.page, color: L.ink, fontSize: 14 }}>
      <div style={{ margin: "0 auto", maxWidth: 430, minHeight: "100dvh", boxSizing: "border-box", padding: "calc(env(safe-area-inset-top) + 20px) 20px max(20px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap }}>{children}</div>
    </div>
  );
}
const btnLightWide: CSSProperties = { marginTop: 16, height: 52, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 26, background: L.ink, color: "#ffffff", fontSize: 15, fontWeight: 500, textDecoration: "none" };
const roundLight = (danger = false): CSSProperties => ({ width: 56, height: 56, flex: "none", border: 0, borderRadius: 28, background: "#ffffff", color: danger ? "#dc2626" : L.ink, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.08)", cursor: "pointer" });

function inNames(d: Detail) {
  const ins = d.attendees.filter((a) => a.presence === "in" && a.id !== d.me.id);
  if (!ins.length) return "Nobody else is in yet";
  const names = ins.map((a) => firstName(a.name));
  return `${names.length <= 2 ? names.join(" and ") : `${names.slice(0, 2).join(", ")} and ${names.length - 2} other${names.length > 3 ? "s" : ""}`} ${names.length === 1 ? "is" : "are"} in`;
}

/* ─── 3 · Join ─── */
function Join({ d, mic, cam, onMic, onCam, onJoin, busy, error }: { d: Detail; mic: boolean; cam: boolean; onMic: () => void; onCam: () => void; onJoin: () => void; busy: boolean; error: string }) {
  const [preview, setPreview] = useState<MediaStream | null>(null);
  useEffect(() => {
    if (!cam) return;
    let s: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "user" } }).then((x) => { s = x; setPreview(x); }).catch(() => {});
    return () => { s?.getTracks().forEach((t) => t.stop()); setPreview(null); };
  }, [cam]);
  const col = personColourLight(d.me.id);
  const count = d.attendees.filter((a) => a.presence === "in").length;
  const meBranch = d.attendees.find((a) => a.id === d.me.id)?.branch;
  return (
    <Light>
      <div style={{ display: "flex", alignItems: "center", paddingTop: 4 }}><Logo /></div>
      <div style={{ position: "relative", height: 210, borderRadius: 26, overflow: "hidden", background: "#2a1d14", boxShadow: "0 14px 30px -16px rgba(20,20,20,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {preview ? <Media stream={preview} mirror /> : <span style={{ width: 72, height: 72, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 28, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(d.me.name)}</span>}
        <span style={{ ...glass, position: "absolute", left: 12, top: 12, height: 28, padding: "0 11px", borderRadius: 14, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />Live · {count} in the call</span>
        {d.meeting.liveNotes && <span style={{ ...glass, position: "absolute", right: 12, bottom: 12, height: 28, padding: "0 11px", borderRadius: 14, fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><Icon name="radio_button_checked" size={15} fill />Recording</span>}
      </div>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.025em" }}>{d.meeting.title}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: L.sub }}>{inNames(d)}</p>
      </div>
      <div style={{ borderRadius: 22, background: "#ffffff", padding: 6, display: "flex", flexDirection: "column", boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "0 12px" }}>
          <span style={{ width: 34, height: 34, borderRadius: 11, background: L.page, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="person" size={20} /></span>
          <span style={{ flex: 1, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 12, color: L.sub }}>You are</span><span style={{ fontSize: 15, fontWeight: 500 }}>{firstName(d.me.name)}{meBranch && BRANCH[meBranch] ? ` · ${BRANCH[meBranch]}` : ""}</span></span>
          <Icon name="verified_user" size={20} style={{ color: "#16a34a" }} />
        </div>
      </div>
      {d.meeting.liveNotes && (
        <p style={{ margin: 0, display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: L.sub, lineHeight: 1.5, padding: "0 6px" }}>
          <Icon name="info" size={19} style={{ color: L.accent, flex: "none" }} />This meeting is recorded, and notes and tasks are written for the team.
        </p>
      )}
      {error && <p role="alert" style={{ margin: 0, padding: "10px 12px", borderRadius: 14, background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{error}</p>}
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <button aria-label={mic ? "Microphone on" : "Microphone off"} aria-pressed={mic} onClick={onMic} style={roundLight(!mic)}><Icon name={mic ? "mic" : "mic_off"} size={23} fill={mic} /></button>
        <button aria-label={cam ? "Camera on" : "Camera off"} aria-pressed={cam} onClick={onCam} style={roundLight(!cam)}><Icon name={cam ? "videocam" : "videocam_off"} size={23} fill={cam} /></button>
        <button onClick={onJoin} disabled={busy} style={{ flex: 1, height: 56, border: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 28, background: L.ink, color: "#ffffff", fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>{busy ? "Joining…" : "Join now"}<Icon name="arrow_forward" size={20} /></button>
      </div>
      <p style={{ margin: "-6px 0 0", textAlign: "center", fontSize: 12, color: L.sub }}>On iPhone, keep this screen open during the meeting</p>
    </Light>
  );
}

/* ─── 3b · Waiting for the host ─── */
function Waiting({ d, mic, cam, onMic, onCam, reload }: { d: Detail; mic: boolean; cam: boolean; onMic: () => void; onCam: () => void; reload: () => void }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = new Date(d.meeting.startsAt).getTime() - now;
  const pct = Math.max(0, Math.min(100, 100 - (left / (15 * 60_000)) * 100));
  const others = d.attendees.filter((a) => a.id !== d.me.id && a.invited);
  async function start() {
    setBusy(true);
    await fetch(`/api/meet/meetings/${d.meeting.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) }).catch(() => {});
    setBusy(false);
    reload();
  }
  return (
    <Light gap={18}>
      <div style={{ display: "flex", alignItems: "center", paddingTop: 4 }}><Logo /></div>
      <div style={{ borderRadius: 28, background: "#ffffff", padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
        <div aria-hidden="true" style={{ width: 120, height: 120, borderRadius: "50%", background: `conic-gradient(${L.orange} 0 ${pct}%, ${L.page} ${pct}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: mono, fontSize: 24, fontWeight: 500 }}>{left > 0 ? clock(left) : "00:00"}</span>
            <span style={{ fontSize: 11, color: L.sub }}>{left > 0 ? "to go" : "any moment"}</span>
          </div>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, letterSpacing: "-0.025em" }}>Starts at {d.meeting.time}</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: L.sub, lineHeight: 1.5 }}>{d.meeting.title}. {d.me.manager ? "Start it when everyone's ready." : "You'll be let in automatically when a manager starts it."}</p>
        </div>
      </div>
      {others.length > 0 && (
        <section aria-labelledby="w-h" style={{ borderRadius: 24, background: "#ffffff", padding: 16, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
          <h2 id="w-h" style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>Invited with you</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {others.slice(0, 8).map((a) => { const col = personColourLight(a.id); return (
              <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 34, height: 34, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(a.name)}</span>{firstName(a.name)}<span style={{ marginLeft: "auto", fontSize: 12, color: L.sub }}>{BRANCH[a.branch] || ""}</span></li>
            ); })}
          </ul>
        </section>
      )}
      {d.me.manager ? (
        <button onClick={start} disabled={busy} style={{ height: 52, border: 0, borderRadius: 26, background: L.ink, color: "#ffffff", fontSize: 15, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}><Icon name="videocam" size={20} fill />{busy ? "Starting…" : "Start the meeting now"}</button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 20, background: L.coralBg }}>
          <Icon name="notifications_active" size={22} fill style={{ color: L.accent }} />
          <p style={{ margin: 0, flex: 1, fontSize: 13, color: "#7c2d12", lineHeight: 1.45 }}>Keep this screen open and we&rsquo;ll chime when you&rsquo;re in.</p>
        </div>
      )}
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <button aria-label={mic ? "Microphone on" : "Microphone off"} aria-pressed={mic} onClick={onMic} style={roundLight(!mic)}><Icon name={mic ? "mic" : "mic_off"} size={23} fill={mic} /></button>
        <button aria-label={cam ? "Camera on" : "Camera off"} aria-pressed={cam} onClick={onCam} style={roundLight(!cam)}><Icon name={cam ? "videocam" : "videocam_off"} size={23} fill={cam} /></button>
        <a href="/meet" style={{ flex: 1, height: 56, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 28, background: "#ffffff", color: L.ink, fontSize: 16, fontWeight: 500, textDecoration: "none", boxShadow: "inset 0 0 0 1px #e6e1db" }}>Leave</a>
      </div>
    </Light>
  );
}

/* ─── 3c · Meeting ended ─── */
function Ended({ d, seconds, onRejoin }: { d: Detail; seconds: number; onRejoin?: () => void }) {
  const came = d.attendees.filter((a) => a.joinedAt).length;
  const invited = d.attendees.filter((a) => a.invited).length;
  const mine = (d.notes?.tasks || []).filter((t) => t.ownerId === d.me.id && t.status !== "suggested");
  const card: CSSProperties = { borderRadius: 22, background: "#ffffff", padding: 16, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" };
  return (
    <Light>
      <div style={{ display: "flex", alignItems: "center", paddingTop: 4 }}><Logo /></div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "18px 0 4px", textAlign: "center" }}>
        <span style={{ width: 72, height: 72, borderRadius: 24, background: L.ink, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={36} fill style={{ color: "#ffffff" }} /></span>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>Thanks, {firstName(d.me.name)}</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: L.sub }}>{d.meeting.title} {d.meeting.status === "live" ? "is still going" : "has ended"}</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div style={card}><Icon name="timer" size={20} style={{ color: L.sub }} /><p style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{Math.max(1, Math.round(seconds / 60))} min</p><p style={{ margin: "2px 0 0", fontSize: 12, color: L.sub }}>You were in</p></div>
        <div style={card}><Icon name="group" size={20} style={{ color: L.sub }} /><p style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{came} of {invited || came}</p><p style={{ margin: "2px 0 0", fontSize: 12, color: L.sub }}>People came</p></div>
      </div>
      {d.meeting.liveNotes && (
        <section aria-labelledby="yt-h" style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="auto_awesome" size={20} fill style={{ color: L.accent }} /><h2 id="yt-h" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Your tasks from this meeting</h2></div>
          {mine.map((t) => (
            <a key={t.id} href={`/meet?task=${t.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, background: L.page, color: L.ink, textDecoration: "none" }}>
              <Icon name="radio_button_unchecked" size={20} />
              <span style={{ flex: 1 }}><span style={{ display: "block", fontWeight: 500 }}>{t.title}</span>{t.dueDate && <span style={{ display: "block", marginTop: 2, fontSize: 12, color: L.sub }}>Due {dayShort(t.dueDate)}</span>}</span>
            </a>
          ))}
          <p style={{ margin: 0, fontSize: 12, color: L.sub, lineHeight: 1.5 }}>{d.meeting.status === "ready" ? (mine.length ? "The notes are ready in the app." : "No tasks for you from this one.") : "The notes will be ready in a few minutes. We'll let you know."}</p>
        </section>
      )}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <a href="/meet" style={{ height: 56, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 28, background: L.ink, color: "#ffffff", fontSize: 16, fontWeight: 500, textDecoration: "none" }}>Done</a>
        {onRejoin && <button onClick={onRejoin} style={{ height: 44, border: 0, background: "transparent", fontSize: 14, color: L.body, fontFamily: "inherit", cursor: "pointer" }}>Left by mistake? Rejoin</button>}
      </div>
    </Light>
  );
}

type Call = ReturnType<typeof useCall>;

function useTimer(start: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return start ? now - start : 0;
}

/** The biggest tile goes to whoever is talking (or the first with a camera). */
function useStage(peers: PeerView[]) {
  const [stage, setStage] = useState("");
  useEffect(() => {
    const talking = peers.find((p) => p.speaking);
    if (talking) setStage(talking.peerId);
    else if (!peers.some((p) => p.peerId === stage)) setStage(peers.find((p) => p.cam)?.peerId || peers[0]?.peerId || "");
  }, [peers, stage]);
  return peers.find((p) => p.peerId === stage) || peers[0] || null;
}

/* ─── 31 · In the call, phone ─── */
/** End the meeting for everyone (managers): it ends at once, then the last bit of audio uploads. */
async function endForEveryone(d: Detail, call: Call) {
  await fetch(`/api/meet/meetings/${d.meeting.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end" }) }).catch(() => {});
  await call.leave();
  window.location.href = `/meet/notes/${d.meeting.id}`;
}

/** Minutes left before the 1-hour limit, once it's 5 or fewer. */
function useLimitWarning(stopsAt?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);
  if (!stopsAt) return "";
  const left = new Date(stopsAt).getTime() - now;
  return left > 0 && left <= 5 * 60_000 ? `Calls end at 1 hour. ${Math.ceil(left / 60_000)} min left.` : "";
}

function PhoneCall({ d, call }: { d: Detail; call: Call }) {
  const [leaving, setLeaving] = useState(false);
  const warn = useLimitWarning(d.meeting.stopsAt);
  const elapsed = useTimer(call.startedAt);
  const main = useStage(call.peers);
  const rest = call.peers.filter((p) => p !== main);
  const [captions, setCaptions] = useState(true);
  const last = d.live?.lines[d.live.lines.length - 1];
  const caption = captions && last && Date.now() - (call.startedAt + last.ms) < 90_000 ? last : null;
  const myCol = personColour(d.me.id);
  const roundDark = (on: boolean): CSSProperties => ({ width: 56, height: 56, border: 0, borderRadius: 28, background: on ? "#ffffff" : D.btn, color: on ? D.bg : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" });
  return (
    <div style={{ minHeight: "100dvh", background: D.bg, color: "#ffffff", fontSize: 14 }}>
      <div style={{ margin: "0 auto", maxWidth: 430, height: "100dvh", boxSizing: "border-box", padding: "calc(env(safe-area-inset-top) + 14px) 14px max(26px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px 0" }}>
          <a href="/meet" aria-label="Back to the app" style={{ width: 40, height: 40, borderRadius: 20, background: D.chip, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}><Icon name="keyboard_arrow_down" size={22} /></a>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.meeting.title}</p>
            <p style={{ margin: "1px 0 0", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: D.muted }}>
              {call.recording && <><Icon name="radio_button_checked" size={14} fill style={{ color: L.orange }} />Recording · </>}<span style={{ fontFamily: mono }}>{clock(elapsed)}</span>
            </p>
          </div>
          <span aria-label={`People, ${call.peers.length + 1} in the call`} style={{ height: 40, padding: "0 12px", borderRadius: 20, background: D.chip, fontSize: 14, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="group" size={19} />{call.peers.length + 1}</span>
        </div>
        <div style={{ position: "relative", flex: 1, minHeight: 0, borderRadius: 26, overflow: "hidden", background: "#2a1d14", outline: main?.speaking ? `3px solid ${L.orange}` : "none", outlineOffset: -3, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {main ? (
            <>
              {main.cam && hasVideo(main.stream) ? <Media stream={main.stream} /> : (() => { const c = personColour(main.clockinId); return <span style={{ width: 96, height: 96, borderRadius: "50%", background: c.bg, color: c.fg, fontSize: 38, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", opacity: main.state === "reconnecting" ? 0.5 : 1 }}>{initial(main.name)}</span>; })()}
              <span style={{ ...glass, position: "absolute", left: 12, top: 12, height: 30, padding: "0 12px", borderRadius: 15, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500 }}>
                <Icon name={main.state === "reconnecting" ? "sync" : main.mic ? "graphic_eq" : "mic_off"} size={16} />{firstName(main.name)}{main.state === "reconnecting" ? " · reconnecting" : ""}
              </span>
            </>
          ) : <p style={{ margin: 0, padding: 24, textAlign: "center", color: D.muted }}>You&rsquo;re in. Waiting for others to join…</p>}
          <div aria-label="You" role="img" style={{ position: "absolute", right: 12, top: 12, width: 92, height: 124, borderRadius: 18, overflow: "hidden", background: "linear-gradient(160deg, #1f4f4a, #134e4a)", boxShadow: "0 8px 20px -8px rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {call.cam ? <Media stream={call.local} mirror /> : <span style={{ width: 44, height: 44, borderRadius: "50%", background: myCol.bg, color: myCol.fg, boxShadow: "0 0 0 2px rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600 }}>{initial(d.me.name)}</span>}
            <span style={{ ...glass, position: "absolute", left: 6, right: 6, bottom: 6, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 11 }}>{!call.mic && <Icon name="mic_off" size={12} />}You</span>
          </div>
          {caption && (
            <div style={{ ...glass, position: "absolute", left: 12, right: 12, bottom: 12, padding: "10px 14px", borderRadius: 16, fontSize: 14, lineHeight: 1.45 }}>
              <span style={{ fontWeight: 600 }}>{caption.name}:</span> {caption.text.length > 160 ? "…" + caption.text.slice(-160) : caption.text}
            </div>
          )}
        </div>
        {rest.length > 0 && (
          <div role="list" aria-label="Also in the call" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {rest.map((p) => { const c = personColour(p.clockinId); return (
              <div role="listitem" key={p.peerId} style={{ position: "relative", height: 92, borderRadius: 18, overflow: "hidden", background: D.card, display: "flex", alignItems: "center", justifyContent: "center", outline: p.speaking ? `2px solid ${L.orange}` : "none", outlineOffset: -2 }}>
                {p.cam && hasVideo(p.stream) ? <Media stream={p.stream} /> : <span style={{ width: 42, height: 42, borderRadius: "50%", background: c.bg, color: c.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 600, opacity: p.state === "reconnecting" ? 0.5 : 1 }}>{initial(p.name)}</span>}
                {p.state === "reconnecting" && <span style={{ position: "absolute", top: 7, left: 7, right: 7, height: 20, borderRadius: 10, background: "rgba(251,191,36,0.15)", color: "#fcd34d", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}><Icon name="sync" size={12} />Reconnecting</span>}
                {!p.mic && <Icon name="mic_off" size={16} style={{ position: "absolute", top: 8, right: 8, color: D.muted }} />}
                <span style={{ position: "absolute", left: 0, right: 0, bottom: 7, textAlign: "center", fontSize: 11, color: "#d4d4d4" }}>{firstName(p.name)}</span>
              </div>
            ); })}
          </div>
        )}
        {call.error && <p role="alert" style={{ margin: 0, fontSize: 12, color: "#fca5a5", textAlign: "center" }}>{call.error}</p>}
        {warn && <p role="status" style={{ margin: 0, fontSize: 12, color: "#fcd34d", textAlign: "center" }}>{warn}</p>}
        {leaving && (
          <div role="dialog" aria-label="End or leave" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 22, background: D.card }}>
            <button onClick={() => endForEveryone(d, call)} style={{ height: 50, border: 0, borderRadius: 25, background: gradient, color: "#ffffff", fontSize: 15, fontWeight: 600, fontFamily: "inherit" }}>End for everyone and make the notes</button>
            <button onClick={() => { setLeaving(false); call.leave(); }} style={{ height: 46, border: 0, borderRadius: 23, background: D.btn, color: "#ffffff", fontSize: 14, fontFamily: "inherit" }}>Just leave (it carries on)</button>
            <button onClick={() => setLeaving(false)} style={{ height: 40, border: 0, borderRadius: 20, background: "transparent", color: D.muted, fontSize: 14, fontFamily: "inherit" }}>Cancel</button>
          </div>
        )}
        <nav aria-label="Call controls" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 2px 0" }}>
          <button aria-label={call.mic ? "Mute microphone" : "Unmute microphone"} aria-pressed={!call.mic} onClick={call.toggleMic} style={roundDark(call.mic)}><Icon name={call.mic ? "mic" : "mic_off"} size={24} fill={call.mic} /></button>
          <button aria-label={call.cam ? "Turn camera off" : "Turn camera on"} onClick={call.toggleCam} style={roundDark(call.cam)}><Icon name={call.cam ? "videocam" : "videocam_off"} size={24} fill={call.cam} /></button>
          <button aria-label={captions ? "Captions on" : "Captions off"} aria-pressed={captions} onClick={() => setCaptions(!captions)} disabled={!(d.live && d.ready.transcription)} style={{ ...roundDark(false), boxShadow: captions && d.live && d.ready.transcription ? "inset 0 0 0 2px #ffffff" : "none", opacity: d.live && d.ready.transcription ? 1 : 0.4 }}><Icon name="closed_caption" size={24} /></button>
          <a href="/meet" aria-label="Back to the app, stay in the call" style={{ ...roundDark(false), textDecoration: "none" }}><Icon name="home" size={24} /></a>
          <button aria-label={d.me.manager ? "End or leave the call" : "Leave the call"} onClick={() => (d.me.manager ? setLeaving(true) : call.leave())} style={{ width: 72, height: 56, border: 0, borderRadius: 28, background: gradient, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="call_end" size={26} fill /></button>
        </nav>
        <p style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: D.muted }}><Icon name="screen_lock_portrait" size={15} />Screen stays on. If your phone locks, you&rsquo;ll rejoin by yourself.</p>
      </div>
    </div>
  );
}

/* ─── 4 · In the call, computer (with people and live notes) ─── */
const TALK = ["#f2643a", "#ffad8c", "#ffd5c4", "#ece8e3", "#d6d1cb"];

function ComputerCall({ d, call }: { d: Detail; call: Call }) {
  const limitWarn = useLimitWarning(d.meeting.stopsAt);
  const elapsed = useTimer(call.startedAt);
  const main = useStage(call.peers);
  const rest = call.peers.filter((p) => p !== main);
  const [tab, setTab] = useState<"people" | "transcript" | "summary">("people");
  const [captions, setCaptions] = useState(true);
  const [note, setNote] = useState("");
  const liveOn = !!d.live && d.ready.transcription;
  const last = d.live?.lines[d.live.lines.length - 1];
  const caption = captions && last && Date.now() - (call.startedAt + last.ms) < 90_000 ? last : null;
  const missing = d.attendees.filter((a) => a.invited && a.presence === "not_joined" && a.id !== d.me.id);
  const tile = (p: PeerView | null, big: boolean) => {
    if (!p) return null;
    const c = personColourLight(p.clockinId);
    return (
      <div key={p.peerId} style={{ gridColumn: big ? "span 2" : undefined, gridRow: big ? "span 2" : undefined, position: "relative", borderRadius: 18, overflow: "hidden", background: p.cam && hasVideo(p.stream) ? "#2a1d14" : `linear-gradient(160deg, ${c.bg}, ${c.bg}cc)`, display: "flex", alignItems: "center", justifyContent: "center", outline: p.speaking ? `3px solid ${L.orange}` : "none", outlineOffset: -3, minHeight: 0 }}>
        {p.cam && hasVideo(p.stream) ? <Media stream={p.stream} /> : <span style={{ width: 66, height: 66, borderRadius: "50%", background: c.fg, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 600, opacity: p.state === "reconnecting" ? 0.55 : 1 }}>{initial(p.name)}</span>}
        {p.state === "reconnecting" && <span style={{ position: "absolute", top: 10, left: 10, height: 26, padding: "0 10px", borderRadius: 13, background: "rgba(255,255,255,0.85)", color: "#92400e", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}><Icon name="sync" size={15} />Reconnecting</span>}
        {big && caption && <div style={{ ...glass, position: "absolute", left: "50%", bottom: 62, transform: "translateX(-50%)", maxWidth: "80%", padding: "8px 14px", borderRadius: 12, fontSize: 14, lineHeight: 1.4, textAlign: "center" }}><span style={{ fontWeight: 600 }}>{caption.name}:</span> {caption.text.length > 140 ? "…" + caption.text.slice(-140) : caption.text}</div>}
        <div style={{ position: "absolute", left: big ? 12 : 10, right: big ? 12 : 10, bottom: big ? 12 : 10, display: "flex", alignItems: "center", gap: big ? 8 : 6 }}>
          {(p.speaking || !p.mic) && <span role="img" aria-label={p.mic ? "Speaking" : "Muted"} style={{ ...glass, width: big ? 34 : 30, height: big ? 34 : 30, borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={p.mic ? "graphic_eq" : "mic_off"} size={big ? 18 : 16} /></span>}
          <span style={{ ...glass, flex: 1, height: big ? 34 : 30, borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center", fontSize: big ? 13 : 12, fontWeight: 500 }}>{firstName(p.name)}</span>
        </div>
      </div>
    );
  };
  const selfC = personColourLight(d.me.id);
  const ctrl = (on: boolean, accent = false): CSSProperties => ({ width: 44, height: 44, borderRadius: 22, border: 0, background: accent ? L.coralBg : on ? L.ink : L.page, color: accent ? L.accent : on ? "#ffffff" : L.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" });

  async function remind(a: Attendee) {
    const res = await fetch(`/api/meet/meetings/${d.meeting.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remind", clockinId: a.id }) }).catch(() => null);
    setNote(res?.ok ? `Reminder sent to ${firstName(a.name)}.` : "Couldn't send the reminder");
  }
  async function endForAll() {
    if (!confirm("End the meeting for everyone?")) return;
    await endForEveryone(d, call);
  }
  const tiles = [main, ...rest];
  const gridCols = tiles.length <= 1 ? "1fr" : "repeat(3, minmax(0, 1fr))";

  return (
    <div style={{ minHeight: "100dvh", background: L.page, color: L.ink, fontSize: 14 }}>
      <div style={{ height: "100dvh", boxSizing: "border-box", padding: 18, display: "flex", gap: 18 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <section aria-label="Call" style={{ flex: 1, minHeight: 0, borderRadius: 24, background: "#ffffff", padding: 18, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <a href="/meet" aria-label="Back to home" style={{ width: 40, height: 40, borderRadius: 20, background: L.page, display: "flex", alignItems: "center", justifyContent: "center", color: L.ink }}><Icon name="arrow_back" size={20} /></a>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em" }}>{d.meeting.title}</h1>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: L.sub }}>{dayLong(d.meeting.date)} · Video call</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 12, color: L.sub }}>{call.recording ? "Recording" : "Time"}</p>
                <p style={{ margin: "2px 0 0", display: "flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 20, fontWeight: 500 }}>{call.recording && <Icon name="radio_button_checked" size={20} fill style={{ color: L.accent }} />}{clock(elapsed, true)}</p>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: gridCols, gridAutoRows: "minmax(0, 1fr)", gap: 10 }}>
              {main && tiles.map((p, i) => tile(p, i === 0 && tiles.length > 1))}
              <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: `linear-gradient(160deg, ${selfC.bg}, ${selfC.bg}cc)`, display: "flex", alignItems: "center", justifyContent: "center", outline: call.speakingSelf ? `3px solid ${L.orange}` : "none", outlineOffset: -3, minHeight: 120 }}>
                {call.cam ? <Media stream={call.local} mirror /> : <span style={{ width: 66, height: 66, borderRadius: "50%", background: selfC.fg, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 600 }}>{initial(d.me.name)}</span>}
                {!main && <span style={{ ...glass, position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", height: 32, padding: "0 14px", borderRadius: 16, display: "inline-flex", alignItems: "center", fontSize: 13, whiteSpace: "nowrap" }}>You&rsquo;re in. Waiting for others to join…</span>}
                <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  {!call.mic && <span role="img" aria-label="Muted" style={{ ...glass, width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="mic_off" size={16} /></span>}
                  <span style={{ ...glass, flex: 1, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>{firstName(d.me.name)} (you)</span>
                </div>
              </div>
            </div>
            {call.error && <p role="alert" style={{ margin: 0, padding: "8px 12px", borderRadius: 12, background: "#fef3c7", color: "#92400e", fontSize: 13 }}>{call.error}</p>}
            {limitWarn && <p role="status" style={{ margin: 0, padding: "8px 12px", borderRadius: 12, background: "#fef3c7", color: "#92400e", fontSize: 13 }}>{limitWarn}</p>}
            <nav aria-label="Call controls" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button aria-label="Full screen" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})} style={ctrl(false)}><Icon name="open_in_full" size={21} /></button>
              <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 10 }}>
                <button aria-label={call.mic ? "Mute microphone" : "Unmute microphone"} onClick={call.toggleMic} style={ctrl(false, call.mic)}><Icon name={call.mic ? "mic" : "mic_off"} size={21} fill={call.mic} /></button>
                <button aria-label={call.cam ? "Turn camera off" : "Turn camera on"} onClick={call.toggleCam} style={ctrl(call.cam)}><Icon name={call.cam ? "videocam" : "videocam_off"} size={21} /></button>
                <button aria-label={captions ? "Captions on" : "Captions off"} onClick={() => setCaptions(!captions)} disabled={!liveOn} style={{ ...ctrl(captions && liveOn), opacity: liveOn ? 1 : 0.4 }}><Icon name="closed_caption" size={21} /></button>
                <button onClick={call.leave} style={{ height: 44, border: 0, display: "inline-flex", alignItems: "center", gap: 8, padding: "0 20px", borderRadius: 22, background: gradient, color: "#ffffff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}><Icon name="call_end" size={20} fill />Leave</button>
                {d.me.manager && <button onClick={endForAll} style={{ height: 44, border: 0, padding: "0 16px", borderRadius: 22, background: L.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>End for everyone</button>}
              </div>
              <button aria-label={`People, ${call.peers.length + 1} in the call`} onClick={() => setTab("people")} style={{ height: 44, padding: "0 14px", borderRadius: 22, border: 0, background: L.page, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, fontFamily: "inherit", color: L.ink, cursor: "pointer" }}><Icon name="group" size={20} />{call.peers.length + 1}</button>
            </nav>
          </section>
          {d.live && d.live.talk.length > 0 && (
            <section aria-labelledby="ins-h" style={{ borderRadius: 24, background: "#ffffff", padding: "16px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
              <div style={{ flex: "0 0 200px" }}><h2 id="ins-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Who&rsquo;s talking</h2><p style={{ margin: "2px 0 0", fontSize: 12, color: L.sub }}>Share of speaking time so far</p></div>
              <div style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column", gap: 8 }}>
                <div role="img" aria-label={d.live.talk.map((t) => `${t.name} ${t.pct} percent`).join(", ")} style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", gap: 3 }}>
                  {d.live.talk.map((t, i) => <span key={t.name} style={{ width: `${t.pct}%`, background: TALK[Math.min(i, TALK.length - 1)], borderRadius: 3 }} />)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: L.sub }}>
                  {d.live.talk.map((t, i) => <span key={t.name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: TALK[Math.min(i, TALK.length - 1)] }} />{t.name} <strong style={{ color: L.ink, fontWeight: 600 }}>{t.pct}%</strong></span>)}
                </div>
              </div>
            </section>
          )}
        </div>

        <aside style={{ width: 360, flex: "none", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div role="img" aria-label={d.attendees.filter((a) => a.presence === "in").map((a) => firstName(a.name)).join(", ")} style={{ display: "flex" }}>
              {d.attendees.filter((a) => a.presence === "in").slice(0, 5).map((a, i) => { const c = personColourLight(a.id); return <span key={a.id} style={{ width: 36, height: 36, marginLeft: i ? -9 : 0, borderRadius: "50%", border: `2px solid ${L.page}`, background: c.bg, color: c.fg, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(a.name)}</span>; })}
            </div>
            {missing.length > 0 && <span style={{ marginLeft: "auto", height: 40, display: "inline-flex", alignItems: "center", gap: 6, padding: "0 16px", borderRadius: 20, background: L.ink, color: "#ffffff", fontSize: 14, fontWeight: 500 }}><Icon name="person_add" size={19} />{missing.length} missing</span>}
          </div>
          <section aria-label="Meeting notes" style={{ flex: 1, minHeight: 0, borderRadius: 24, background: "#ffffff", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
            <div style={{ padding: "16px 16px 14px", background: "linear-gradient(120deg, #ff7a45 0%, #f2643a 50%, #e8513a 100%)", color: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="auto_awesome" size={22} fill />
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Demi&rsquo;s notes</p>
                <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.22)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{liveOn ? "Live" : d.meeting.liveNotes ? "Recording" : "Off"}</span>
              </div>
              <p style={{ margin: "3px 0 12px 30px", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>{liveOn ? "Listening and writing notes" : d.meeting.liveNotes ? (d.ready.transcription ? "Recording for the notes" : "Recording. Notes need transcription switched on.") : "Not recorded"}</p>
              <div role="tablist" aria-label="Notes" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4, padding: 4, borderRadius: 16, background: "#ffffff" }}>
                {([["people", "People"], ["transcript", "Transcript"], ["summary", "Summary"]] as const).map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ height: 34, border: 0, borderRadius: 12, background: tab === k ? L.page : "transparent", color: L.ink, fontSize: 13, fontWeight: tab === k ? 600 : 500, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
                    {l}{k === "people" && missing.length > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: L.orange, color: "#ffffff", fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{missing.length}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
              {note && <p role="status" style={{ margin: 0, fontSize: 12, color: L.body }}>{note}</p>}
              {tab === "people" && d.attendees.map((x) => (x.id === d.me.id ? { ...x, presence: "in", joinedAt: x.joinedAt || new Date(call.startedAt || Date.now()).toISOString() } : x)).map((a) => {
                const c = personColourLight(a.id);
                const late = a.joinedAt && d.meeting.startedAt && new Date(a.joinedAt).getTime() - new Date(d.meeting.startedAt).getTime() > 5 * 60_000;
                const dot = a.presence === "in" ? "#22c55e" : a.presence === "reconnecting" ? "#f59e0b" : a.presence === "left" ? "#a8a29e" : "#ef4444";
                const label = a.presence === "in" ? "In the call" : a.presence === "reconnecting" ? "Reconnecting" : a.presence === "left" ? `Left ${hm(a.leftAt || a.joinedAt)}` : "Not here";
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 14, background: a.presence === "not_joined" && a.invited ? "#fff8f5" : "transparent" }}>
                    <span style={{ width: 32, height: 32, borderRadius: "50%", background: c.bg, color: c.fg, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{initial(a.name)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 500 }}>{firstName(a.name)}{late && <span style={{ marginLeft: 4, padding: "2px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 600 }}>{Math.round((new Date(a.joinedAt).getTime() - new Date(d.meeting.startedAt).getTime()) / 60_000)} min late</span>}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: a.presence === "not_joined" ? "#b91c1c" : L.sub }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />{label}{a.presence === "not_joined" && a.onShift ? " · on shift now" : ""}{!a.invited ? " · not invited" : ""}</span>
                    </span>
                    {a.presence === "not_joined" && d.me.manager && <button onClick={() => remind(a)} style={{ height: 32, padding: "0 12px", border: 0, borderRadius: 16, background: a.onShift ? L.ink : L.page, color: a.onShift ? "#ffffff" : L.ink, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Remind</button>}
                  </div>
                );
              })}
              {tab === "transcript" && (d.live?.lines.length ? d.live.lines.map((l, i) => (
                <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}><span style={{ fontFamily: mono, fontSize: 11, color: L.sub, marginRight: 6 }}>{clock(l.ms)}</span><strong style={{ fontWeight: 600 }}>{l.name}:</strong> {l.text}</p>
              )) : <p style={{ margin: 0, fontSize: 13, color: L.sub, lineHeight: 1.5 }}>{d.ready.transcription ? "The transcript appears here about a minute behind the conversation." : "The transcript needs transcription switched on (a Deepgram key in Vercel). The recording is still saved."}</p>)}
              {tab === "summary" && <p style={{ margin: 0, fontSize: 13, color: L.sub, lineHeight: 1.5 }}>{d.ready.summary ? "The summary, decisions and tasks are written when the meeting ends. You check the tasks before they go out." : "Summaries need Claude switched on (an Anthropic key in Vercel). After the meeting you can write the notes by hand."}</p>}
              <p style={{ margin: "auto 0 0", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 14, background: L.page, fontSize: 12, color: L.sub }}><Icon name="info" size={17} />Tasks spotted in the meeting are suggested after it ends, for you to confirm.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
