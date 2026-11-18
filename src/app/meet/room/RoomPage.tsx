"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon, IconFont, personColourLight, initial, firstName } from "../ui";
import { PAGE as C, mono, postJson } from "../ManagerShell";

/* 32 · Room recording in progress: one computer records everyone in the room. */

type Attendee = { id: number; name: string; inRoom: boolean; onShift: boolean; invited: boolean };
type Detail = {
  meeting: { id: string; title: string; status: string; startedAt: string; liveNotes: boolean };
  attendees: Attendee[];
  people: { id: number; name: string; branch: string }[];
  live: { lines: { ms: number; name: string; text: string }[] } | null;
  ready: { transcription: boolean };
};

const PIECE_MS = 30_000;
const SPEAKER = ["#1d4ed8", "#be185d", "#047857", "#6d28d9", "#b45309", "#0f766e"];
const clock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const mmss = (ms: number) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const ROOM_LIMIT_MS = 30 * 60_000;
const card: CSSProperties = { borderRadius: 24, background: "#ffffff", boxShadow: "0 1px 2px rgba(20,20,20,0.05)" };

export default function RoomPage({ id }: { id: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [state, setState] = useState<"ready" | "recording" | "paused" | "ending">("ready");
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [micId, setMicId] = useState("");
  const [levels, setLevels] = useState<number[]>(Array(12).fill(0.1));
  const [now, setNow] = useState(Date.now());
  const [present, setPresent] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);

  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const seq = useRef(0);
  const startedAt = useRef(0);
  const running = useRef(false);
  const queue = useRef<{ blob: Blob; seq: number; startMs: number; mime: string; tries: number }[]>([]);
  const analyser = useRef<(() => number) | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/meet/meetings/${id}`, { cache: "no-store" }).catch(() => null);
    if (!res) return setError("Can't connect right now");
    if (res.status === 401) { window.location.replace(`/meet?back=${encodeURIComponent(window.location.pathname)}`); return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Meeting not found");
    setD(data);
    setPresent((p) => (p.length ? p : data.attendees.filter((a: Attendee) => a.inRoom || a.invited).map((a: Attendee) => a.id)));
    if (data.meeting.startedAt) startedAt.current = new Date(data.meeting.startedAt).getTime();
  }, [id]);
  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  useEffect(() => { navigator.mediaDevices?.enumerateDevices().then((all) => setMics(all.filter((x) => x.kind === "audioinput"))).catch(() => {}); }, [state]);

  // One upload run at a time: two at once uploaded the same piece twice (doubled words in the notes).
  const flushing = useRef<Promise<void> | null>(null);
  const flush = useCallback((): Promise<void> => {
    if (flushing.current) return flushing.current;
    flushing.current = flushRun().finally(() => { flushing.current = null; });
    return flushing.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const flushRun = async () => {
    while (queue.current.length) {
      const job = queue.current[0];
      try {
        const ext = job.mime.includes("mp4") ? "mp4" : job.mime.includes("ogg") ? "ogg" : "webm";
        const up = await postJson(`/api/meet/meetings/${id}/piece`, { action: "url", ext });
        if (!up.ok) throw new Error(String(up.data.error || "no upload link"));
        const put = await fetch(String(up.data.url), { method: "PUT", headers: { "Content-Type": job.mime.split(";")[0], "x-upsert": "false" }, body: job.blob }).catch(() => null);
        if (!put?.ok) throw new Error("the upload didn't go through");
        const done = await postJson(`/api/meet/meetings/${id}/piece`, { action: "done", path: up.data.path, seq: job.seq, startMs: job.startMs, mime: job.mime, room: true });
        if (!done.ok) throw new Error(String(done.data.error || "couldn't save it"));
        queue.current.shift();
        setSaveError("");
        // Live notes: transcribe it in the background; nothing here waits for that.
        if (done.data.id) postJson(`/api/meet/meetings/${id}/piece`, { action: "transcribe", id: done.data.id }).catch(() => {});
      } catch (e) {
        // Say so on screen: a recording that isn't being saved must never look like it is.
        setSaveError(`The recording isn't saving (${e instanceof Error ? e.message : "unknown problem"}). It keeps trying; check the connection.`);
        if (++job.tries > 8) queue.current.shift();
        break;
      }
    }
  };

  const piece = useCallback(() => {
    if (!running.current || !stream.current) return;
    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((x) => MediaRecorder.isTypeSupported(x)) || "";
    const r = new MediaRecorder(stream.current, mime ? { mimeType: mime, audioBitsPerSecond: 48000 } : undefined);
    const chunks: Blob[] = [];
    const mySeq = seq.current++;
    const startMs = Date.now() - startedAt.current;
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      const blob = new Blob(chunks, { type: r.mimeType || mime || "audio/webm" });
      if (blob.size > 2000) { queue.current.push({ blob, seq: mySeq, startMs: Math.max(0, startMs), mime: blob.type, tries: 0 }); flush(); }
      if (running.current) piece();
    };
    r.start();
    rec.current = r;
    setTimeout(() => r.state === "recording" && r.stop(), PIECE_MS);
  }, [flush]);

  async function openMic(deviceId = micId) {
    stream.current?.getTracks().forEach((t) => t.stop());
    // Room recordings keep the natural sound (no echo cancelling, which can cut quiet voices across a table).
    stream.current = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    ctx.createMediaStreamSource(stream.current).connect(an);
    const buf = new Uint8Array(an.fftSize);
    analyser.current = () => { an.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; s += x * x; } return Math.sqrt(s / buf.length); };
  }

  async function start() {
    setError("");
    try {
      // Mic first: the meeting only goes live (and tells people) once recording can really start.
      await openMic();
      if (d?.meeting.status === "scheduled") {
        const r = await postJson(`/api/meet/meetings/${id}`, { action: "start" });
        if (!r.ok) {
          stream.current?.getTracks().forEach((t) => t.stop());
          throw new Error(String(r.data.error || "Couldn't start"));
        }
      }
      await load();
      if (!startedAt.current) startedAt.current = Date.now();
      running.current = true;
      setState("recording");
      piece();
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      wake.current = (await nav.wakeLock?.request("screen").catch(() => null)) || null;
      saveRoom(present);
    } catch (e) {
      setError(e instanceof Error && e.name === "NotAllowedError" ? "Allow the microphone to record. Check the browser's settings for this site." : e instanceof Error ? e.message : "Couldn't start recording");
    }
  }
  function pause() {
    running.current = false;
    if (rec.current?.state === "recording") rec.current.stop();
    setState("paused");
  }
  function resume() { running.current = true; setState("recording"); piece(); }
  async function end(ask = true) {
    if (ask && !confirm("End the recording and make the notes?")) return;
    setState("ending");
    running.current = false;
    if (rec.current?.state === "recording") rec.current.stop();
    // The meeting ends now (the last piece is still accepted after), so it never looks stuck.
    await Promise.all([postJson(`/api/meet/meetings/${id}`, { action: "end" }), saveRoom(present)]);
    stream.current?.getTracks().forEach((t) => t.stop());
    wake.current?.release().catch(() => {});
    await new Promise((r) => setTimeout(r, 300)); // the recorder hands over its last piece
    for (let i = 0; i < 12 && queue.current.length; i++) { await flush(); if (queue.current.length) await new Promise((r) => setTimeout(r, 700)); }
    window.location.href = `/meet/notes/${id}`;
  }
  async function saveRoom(ids: number[]) { await postJson(`/api/meet/meetings/${id}`, { action: "room", present: ids }); }

  // Sound level bars, and keep the recording going if the screen was locked.
  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => { const v = analyser.current ? Math.min(1, analyser.current() * 6) : 0; setLevels((l) => [...l.slice(1), Math.max(0.12, v)]); }, 120);
    const keep = setInterval(flush, 20_000);
    const onShow = async () => {
      if (document.visibilityState !== "visible") return;
      if (stream.current?.getAudioTracks()[0]?.readyState !== "live") { await openMic().catch(() => {}); }
    };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(t); clearInterval(keep); document.removeEventListener("visibilitychange", onShow); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, flush]);

  const toggle = (pid: number) => { const next = present.includes(pid) ? present.filter((x) => x !== pid) : [...present, pid]; setPresent(next); if (state !== "ready") saveRoom(next); };
  const roomList = (d?.attendees || []).filter((a) => a.invited || a.inRoom || present.includes(a.id));
  const extra = (d?.people || []).filter((p) => present.includes(p.id) && !roomList.some((a) => a.id === p.id));
  const micName = mics.find((m) => m.deviceId === micId)?.label || mics.find((m) => m.deviceId === "default")?.label || mics[0]?.label || "this computer's microphone";
  const elapsed = startedAt.current && state !== "ready" ? now - startedAt.current : 0;
  const leftMs = startedAt.current ? ROOM_LIMIT_MS - (now - startedAt.current) : ROOM_LIMIT_MS;

  // Room recordings stop at 30 minutes (keeps recording and transcription costs in check).
  const endRef = useRef(end);
  endRef.current = end;
  useEffect(() => {
    if ((state === "recording" || state === "paused") && startedAt.current && leftMs <= 0) endRef.current(false);
  }, [state, leftMs]);

  return (
    <div style={{ minHeight: "100dvh", boxSizing: "border-box", background: C.page, color: C.ink, fontSize: 14, padding: 18, display: "flex", flexWrap: "wrap", gap: 18, alignItems: "stretch" }}>
      <IconFont />
      <section aria-label="Recording" style={{ ...card, flex: "999 1 560px", minWidth: 0, padding: 22, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12 }}>
          <a href="/meet" aria-label="Back to home" style={{ width: 40, height: 40, borderRadius: 20, background: C.page, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink }}><Icon name="arrow_back" size={20} /></a>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{d?.meeting.title || "…"}</h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: C.sub }}>Room recording, no call</p>
          </div>
          {state !== "ready" && <span style={{ height: 32, padding: "0 12px", borderRadius: 16, background: state === "recording" ? C.coralBg : C.page, color: state === "recording" ? C.coral : C.body, fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: state === "recording" ? C.accent : "#a8a29e" }} />{state === "recording" ? "Recording" : state === "paused" ? "Paused" : "Saving…"}</span>}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, padding: "10px 0" }}>
          <p style={{ margin: 0, fontFamily: mono, fontSize: "clamp(40px, 8vw, 64px)", fontWeight: 500, letterSpacing: "-0.03em" }}>{clock(elapsed)}</p>
          <div role="img" aria-label={state === "recording" ? "Sound level" : "Not recording"} style={{ display: "flex", alignItems: "center", gap: 5, height: 84 }}>
            {levels.map((v, i) => <span key={i} style={{ width: 6, height: Math.round(10 + v * 74), borderRadius: 3, background: state !== "recording" ? "#e7e2dc" : v > 0.6 ? "#f2643a" : v > 0.3 ? "#ffad8c" : "#ffd5c4", transition: "height 0.1s" }} />)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 16, background: C.page, fontSize: 13, flexWrap: "wrap", justifyContent: "center" }}>
            <Icon name="speaker_phone" size={20} style={{ color: "#047857" }} />
            <span>Recording from <strong style={{ fontWeight: 600 }}>{micName}</strong></span>
            {mics.length > 1 && (
              <label style={{ position: "relative", height: 30, padding: "0 12px", borderRadius: 15, background: "#ffffff", fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", cursor: "pointer" }}>Change
                <select aria-label="Microphone" value={micId} onChange={async (e) => { setMicId(e.target.value); if (state !== "ready") { await openMic(e.target.value).catch(() => {}); } }} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}>
                  {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label || "Microphone"}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
        {state !== "ready" && leftMs > 0 && leftMs <= 5 * 60_000 && (
          <p role="status" style={{ margin: 0, textAlign: "center", fontSize: 13, color: "#b45309" }}>Room recordings stop at 30 minutes. {Math.ceil(leftMs / 60_000)} min left; it ends and makes the notes by itself.</p>
        )}
        {(error || saveError) && <p role="alert" style={{ margin: 0, textAlign: "center", fontSize: 13, color: "#b91c1c" }}>{error || saveError}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 10 }}>
          {state === "ready" ? (
            <button onClick={start} disabled={!d || d.meeting.status === "ended" || d.meeting.status === "ready"} style={{ height: 52, padding: "0 24px", border: 0, borderRadius: 26, background: "linear-gradient(120deg, #ff7a45, #e8513a)", color: "#ffffff", fontSize: 15, fontWeight: 600, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}><Icon name="mic" size={22} fill />{d?.meeting.status === "live" ? "Carry on recording" : "Start recording"}</button>
          ) : (
            <>
              <button onClick={state === "paused" ? resume : pause} disabled={state === "ending"} style={{ height: 52, padding: "0 22px", border: 0, borderRadius: 26, background: C.page, fontSize: 15, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, color: C.ink, cursor: "pointer" }}><Icon name={state === "paused" ? "play_arrow" : "pause"} size={22} />{state === "paused" ? "Carry on" : "Pause"}</button>
              <button onClick={() => end()} disabled={state === "ending"} style={{ height: 52, padding: "0 24px", border: 0, borderRadius: 26, background: "linear-gradient(120deg, #ff7a45, #e8513a)", color: "#ffffff", fontSize: 15, fontWeight: 600, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}><Icon name="stop_circle" size={22} fill />{state === "ending" ? "Saving the last bit…" : "End and make notes"}</button>
            </>
          )}
        </div>
        <p style={{ margin: "-8px 0 0", textAlign: "center", fontSize: 12, color: C.sub }}>Saved every 30 seconds, so nothing is lost if this computer sleeps. Keep it in the middle of the table.</p>
      </section>

      <aside style={{ flex: "1 1 340px", maxWidth: 400, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <section aria-labelledby="room-h" style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4 }}><h2 id="room-h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Who&rsquo;s in the room</h2><span style={{ marginLeft: "auto", fontSize: 12, color: C.sub }}>Tick everyone here</span></div>
          {[...roomList, ...extra.map((p) => ({ id: p.id, name: p.name, onShift: false, inRoom: true, invited: false }))].map((a) => {
            const col = personColourLight(a.id);
            return (
              <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "0 6px", borderRadius: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={present.includes(a.id)} onChange={() => toggle(a.id)} style={{ width: 20, height: 20, accentColor: C.ink }} />
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(a.name)}</span>
                <span style={{ flex: 1 }}>{firstName(a.name)}</span>
                <span style={{ fontSize: 12, color: a.onShift ? "#047857" : C.sub }}>{a.onShift ? "On shift" : "Off shift"}</span>
              </label>
            );
          })}
          {adding ? (
            <select autoFocus aria-label="Add someone" onChange={(e) => { if (e.target.value) toggle(Number(e.target.value)); setAdding(false); }} style={{ marginTop: 4, height: 38, borderRadius: 19, border: `1px solid ${C.field}`, padding: "0 10px", fontFamily: "inherit", fontSize: 13 }}>
              <option value="">Pick a person</option>{(d?.people || []).filter((p) => !present.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : <button onClick={() => setAdding(true)} style={{ marginTop: 4, height: 38, border: 0, borderRadius: 19, background: C.page, fontSize: 13, fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: C.ink, cursor: "pointer" }}><Icon name="person_add" size={18} />Add someone</button>}
        </section>
        <section aria-label="Live notes" style={{ ...card, flex: 1, minHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 16px", background: "linear-gradient(120deg, #ff7a45 0%, #f2643a 50%, #e8513a 100%)", color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="auto_awesome" size={22} fill />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Demi&rsquo;s notes</p>
            <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.22)", fontSize: 12, fontWeight: 600 }}>{d?.live ? "Live" : "After"}</span>
          </div>
          <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 12, fontSize: 13, lineHeight: 1.5, overflowY: "auto" }}>
            {(d?.live?.lines || []).slice(-12).map((l, i) => {
              const n = Number((l.name.match(/Speaker (\d+)/) || [])[1] || 1);
              return <div key={i}><p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: SPEAKER[(n - 1) % SPEAKER.length] }}>{l.name} <span style={{ fontWeight: 400, color: C.sub, fontFamily: mono }}>{mmss(l.ms)}</span></p><p style={{ margin: "2px 0 0" }}>{l.text}</p></div>;
            })}
            {!d?.live?.lines.length && <p style={{ margin: 0, color: C.sub }}>{d?.ready.transcription ? "What's said appears here about a minute behind." : "The notes are made after the recording ends. Live notes need transcription switched on."}</p>}
            <p style={{ margin: "auto 0 0", padding: "10px 12px", borderRadius: 14, background: C.page, fontSize: 12, color: C.sub }}>Voices show as Speaker 1, 2, 3 for now. You&rsquo;ll name them when the meeting ends.</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
