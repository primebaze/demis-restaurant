"use client";

/**
 * The call engine for Demi's Meetings, shared by the phone and computer screens.
 *
 * - Every device connects straight to every other one (a mesh, fine for up to 5
 *   devices). Connection details are passed through /api/meet/meetings/[id]/signal,
 *   checked every second. "Perfect negotiation" keeps two devices from talking over
 *   each other when they both start at once.
 * - The server keeps attendance: a ping every 30 seconds while someone is in.
 * - Each device records its OWN microphone in 30-second pieces and uploads them as it
 *   goes, so a dropped phone loses seconds of one voice, never the meeting.
 * - The screen is kept awake, and after a phone locks the microphone is picked up again.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type PeerView = {
  peerId: string;
  clockinId: number;
  name: string;
  stream: MediaStream | null;
  mic: boolean;
  cam: boolean;
  speaking: boolean;
  state: "connecting" | "in" | "reconnecting";
};

type Peer = PeerView & {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingIce: RTCIceCandidateInit[];
  iceTimer: ReturnType<typeof setTimeout> | null;
  level: (() => number) | null;
  audioSender: RTCRtpSender | null;
  videoSender: RTCRtpSender;
};

type Status = "idle" | "joining" | "in" | "ended" | "error";
type Signal = { id: string; from: string; to: string; kind: string; data: Record<string, unknown> };

const PIECE_MS = 30_000;
const randomId = () => Math.random().toString(36).slice(2, 10).padEnd(8, "0");

async function post(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't reach the meeting");
  return data;
}

/** A 0..1 loudness reader for a stream (for "who's talking"). */
function levelOf(ctx: AudioContext | null, stream: MediaStream): (() => number) | null {
  if (!ctx || !stream.getAudioTracks().length) return null;
  try {
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    return () => {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      return Math.sqrt(sum / buf.length);
    };
  } catch {
    return null;
  }
}

export function useCall(meetingId: string, me: { id: number; name: string }, opts: { record: boolean; room?: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [peers, setPeers] = useState<PeerView[]>([]);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(false);
  const [speakingSelf, setSpeakingSelf] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(0);

  const myPeer = useRef(`${me.id}-${randomId()}`);
  const startedAtRef = useRef(0);
  const peersRef = useRef(new Map<string, Peer>());
  const audioTrack = useRef<MediaStreamTrack | null>(null);
  const videoTrack = useRef<MediaStreamTrack | null>(null);
  const localStream = useRef<MediaStream>(typeof window !== "undefined" ? new MediaStream() : (null as unknown as MediaStream));
  const iceServers = useRef<RTCIceServer[]>([]);
  const last = useRef("0");
  const alive = useRef(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const selfLevel = useRef<(() => number) | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const seq = useRef(0);
  const uploads = useRef<{ blob: Blob; seq: number; startMs: number; mime: string; tries: number }[]>([]);
  const micOn = useRef(true);
  const camOn = useRef(false);

  const base = `/api/meet/meetings/${meetingId}`;
  const publish = useCallback(() => setPeers(Array.from(peersRef.current.values()).map(({ peerId, clockinId, name, stream, mic, cam, speaking, state }) => ({ peerId, clockinId, name, stream, mic, cam, speaking, state }))), []);

  const send = useCallback((to: string, kind: string, data: object = {}) =>
    post(`${base}/signal`, { from: myPeer.current, to, kind, data }).catch(() => {}), [base]);

  const hello = useCallback(() => ({ name: me.name, clockinId: me.id, mic: micOn.current, cam: camOn.current }), [me.name, me.id]);

  /* ─── One connection per other device ─── */

  const makePeer = useCallback((peerId: string, info: { name?: string; clockinId?: number; mic?: boolean; cam?: boolean }) => {
    const existing = peersRef.current.get(peerId);
    if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: iceServers.current });
    const p: Peer = {
      peerId, pc, clockinId: Number(info.clockinId) || Number(peerId.split("-")[0]) || 0, name: String(info.name || "Someone"),
      stream: null, mic: info.mic !== false, cam: !!info.cam, speaking: false, state: "connecting",
      polite: myPeer.current > peerId, makingOffer: false, ignoreOffer: false, pendingIce: [], iceTimer: null, level: null,
      // Send our microphone, and a video slot that the camera button fills or empties.
      audioSender: audioTrack.current ? pc.addTrack(audioTrack.current, localStream.current) : (pc.addTransceiver("audio", { direction: "sendrecv", streams: [localStream.current] }).sender),
      videoSender: pc.addTransceiver("video", { direction: "sendrecv", streams: [localStream.current] }).sender,
    };
    peersRef.current.set(peerId, p);
    // Development only: let the browser console see the connections.
    if (process.env.NODE_ENV !== "production") (window as unknown as { __meetPeers?: Map<string, Peer> }).__meetPeers = peersRef.current;
    if (videoTrack.current) p.videoSender.replaceTrack(videoTrack.current).catch(() => {});

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      p.pendingIce.push(candidate.toJSON());
      if (!p.iceTimer) p.iceTimer = setTimeout(() => { send(peerId, "ice", { candidates: p.pendingIce.splice(0) }); p.iceTimer = null; }, 250);
    };
    pc.onnegotiationneeded = async () => {
      try {
        p.makingOffer = true;
        await pc.setLocalDescription();
        await send(peerId, "offer", { sdp: pc.localDescription, ...hello() });
      } catch { /* the next negotiation will retry */ } finally {
        p.makingOffer = false;
      }
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] || p.stream || new MediaStream();
      if (!e.streams[0]) stream.addTrack(e.track);
      p.stream = stream;
      if (e.track.kind === "audio" && !p.level) p.level = levelOf(ctxRef.current, stream);
      publish();
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      p.state = s === "connected" ? "in" : s === "disconnected" || s === "failed" ? "reconnecting" : p.state;
      if (s === "failed") pc.restartIce();
      publish();
    };
    publish();
    return p;
  }, [send, hello, publish]);

  const dropPeer = useCallback((peerId: string) => {
    const p = peersRef.current.get(peerId);
    if (!p) return;
    try { p.pc.close(); } catch { /* already closed */ }
    peersRef.current.delete(peerId);
    publish();
  }, [publish]);

  const leaveRef = useRef<() => Promise<void>>(async () => {});
  const onSignal = useCallback(async (s: Signal) => {
    const d = s.data || {};
    if (s.kind === "hello") {
      makePeer(s.from, d); // the newcomer: our negotiation starts with an offer to them
      return;
    }
    if (s.kind === "bye") return dropPeer(s.from);
    if (s.kind === "ended") { leaveRef.current(); return; } // a manager ended it for everyone
    if (s.kind === "state") {
      const p = peersRef.current.get(s.from);
      if (p) { p.mic = d.mic !== false; p.cam = !!d.cam; publish(); }
      return;
    }
    if (s.kind === "offer" || s.kind === "answer") {
      const p = makePeer(s.from, d);
      if (d.name) p.name = String(d.name);
      if (d.mic !== undefined) p.mic = d.mic !== false;
      if (d.cam !== undefined) p.cam = !!d.cam;
      const desc = d.sdp as RTCSessionDescriptionInit;
      const collision = s.kind === "offer" && (p.makingOffer || p.pc.signalingState !== "stable");
      p.ignoreOffer = !p.polite && collision;
      if (p.ignoreOffer) return;
      try {
        await p.pc.setRemoteDescription(desc);
        if (s.kind === "offer") {
          await p.pc.setLocalDescription();
          await send(s.from, "answer", { sdp: p.pc.localDescription, ...hello() });
        }
      } catch { /* a stale offer or answer; the next one fixes it */ }
      publish();
      return;
    }
    if (s.kind === "ice") {
      const p = peersRef.current.get(s.from);
      if (!p) return;
      for (const c of (d.candidates as RTCIceCandidateInit[]) || []) {
        try { await p.pc.addIceCandidate(c); } catch { if (!p.ignoreOffer) { /* arrives before the offer; harmless */ } }
      }
    }
  }, [makePeer, dropPeer, send, hello, publish]);

  /* ─── Recording: 30-second pieces of this device's own microphone ─── */

  // One upload run at a time: two at once uploaded the same piece twice (doubled words in the notes).
  const flushing = useRef<Promise<void> | null>(null);
  const flushUploads = useCallback((): Promise<void> => {
    if (flushing.current) return flushing.current;
    flushing.current = (async () => {
    while (uploads.current.length) {
      const job = uploads.current[0];
      try {
        const ext = job.mime.includes("mp4") ? "mp4" : job.mime.includes("ogg") ? "ogg" : "webm";
        const up = await post(`${base}/piece`, { action: "url", ext });
        const put = await fetch(up.url, { method: "PUT", headers: { "Content-Type": job.mime.split(";")[0], "x-upsert": "false" }, body: job.blob });
        if (!put.ok) throw new Error("upload");
        const saved = await post(`${base}/piece`, { action: "done", path: up.path, seq: job.seq, startMs: job.startMs, mime: job.mime, room: !!opts.room });
        uploads.current.shift();
        // Live captions: transcribe it in the background; nothing here waits for that.
        if (saved?.id) post(`${base}/piece`, { action: "transcribe", id: saved.id }).catch(() => {});
        setSaveError("");
      } catch (e) {
        setSaveError(`Your voice isn't being saved for the notes (${e instanceof Error ? e.message : "unknown problem"}). It keeps trying.`);
        job.tries++;
        if (job.tries > 6) uploads.current.shift(); // give up on this piece after a few minutes of trying
        break;
      }
    }
    setPending(uploads.current.length);
    })().finally(() => { flushing.current = null; });
    return flushing.current;
  }, [base, opts.room]);

  const startPiece = useCallback((callStart: number) => {
    const track = audioTrack.current;
    if (!opts.record || !track || typeof MediaRecorder === "undefined" || !alive.current) return;
    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
    const rec = new MediaRecorder(new MediaStream([track]), mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    const pieceStart = Date.now() - callStart;
    const chunks: Blob[] = [];
    const mySeq = seq.current++;
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
      if (blob.size > 2000) {
        uploads.current.push({ blob, seq: mySeq, startMs: Math.max(0, pieceStart), mime: blob.type, tries: 0 });
        setPending(uploads.current.length);
        flushUploads();
      }
      if (alive.current) startPiece(callStart);
    };
    rec.start();
    recorder.current = rec;
    setRecording(true);
    setTimeout(() => rec.state === "recording" && rec.stop(), PIECE_MS);
  }, [opts.record, flushUploads]);

  /* ─── Keep the screen awake and the microphone alive ─── */

  const keepAwake = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock && document.visibilityState === "visible") wake.current = await nav.wakeLock.request("screen");
    } catch { /* not supported or refused: the call still works */ }
  }, []);

  const replaceAudio = useCallback(async () => {
    if (audioTrack.current && audioTrack.current.readyState === "live") return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const t = s.getAudioTracks()[0];
      if (audioTrack.current) localStream.current.removeTrack(audioTrack.current);
      audioTrack.current = t;
      t.enabled = micOn.current;
      localStream.current.addTrack(t);
      selfLevel.current = levelOf(ctxRef.current, new MediaStream([t]));
      for (const p of Array.from(peersRef.current.values())) {
        if (p.audioSender) await p.audioSender.replaceTrack(t).catch(() => {});
        else p.audioSender = p.pc.addTrack(t, localStream.current);
      }
      setLocal(new MediaStream(localStream.current.getTracks()));
    } catch { /* microphone refused */ }
  }, []);

  /* ─── Join, the loops, and leaving ─── */

  const join = useCallback(async () => {
    if (alive.current) return;
    if (!me.id) return; // the page hasn't loaded who this is yet
    // This device's id in the call, made now that we know who is joining.
    myPeer.current = `${me.id}-${randomId()}`;
    setStatus("joining");
    setError("");
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = AC ? new AC() : null;
      await ctxRef.current?.resume().catch(() => {});
      // No microphone (blocked, or none on this computer): join to listen, and say how to speak.
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
        audioTrack.current = s.getAudioTracks()[0];
        audioTrack.current.enabled = micOn.current;
        localStream.current.addTrack(audioTrack.current);
        selfLevel.current = levelOf(ctxRef.current, s);
      } catch {
        micOn.current = false;
        setMic(false);
        setError("You're listening only. To speak, allow the microphone for this site, then tap the microphone button.");
      }
      setLocal(new MediaStream(localStream.current.getTracks()));

      const j = await post(base, { action: "join" });
      const callStart = new Date(j.startedAt).getTime() || Date.now();
      setStartedAt(callStart);
      startedAtRef.current = callStart;
      const ice = await fetch("/api/meet/ice", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ iceServers: [] }));
      iceServers.current = ice.iceServers || [];
      const first = await fetch(`${base}/signal?peer=${myPeer.current}&after=-1`, { cache: "no-store" }).then((r) => r.json());
      last.current = first.last || "0";
      alive.current = true;
      await send("", "hello", hello());
      setStatus("in");
      keepAwake();
      startPiece(callStart);
    } catch (e) {
      alive.current = false;
      setStatus("error");
      setError(e instanceof Error && e.name === "NotAllowedError" ? "Allow the microphone to join. Check your browser's settings for this site." : e instanceof Error ? e.message : "Couldn't join");
    }
  }, [base, send, hello, keepAwake, startPiece, me.id]);

  // Check for messages every second, ping attendance every 30 seconds, measure who's talking.
  useEffect(() => {
    if (status !== "in") return;
    let polling = false;
    const poll = setInterval(async () => {
      if (polling || !alive.current) return;
      polling = true;
      try {
        const res = await fetch(`${base}/signal?peer=${myPeer.current}&after=${last.current}`, { cache: "no-store" });
        if (res.status === 404) { alive.current = false; setStatus("ended"); return; }
        const d = await res.json();
        last.current = d.last || last.current;
        for (const s of (d.signals || []) as Signal[]) await onSignal(s);
      } catch { /* offline for a moment: carry on */ } finally {
        polling = false;
      }
    }, 1000);
    const ping = setInterval(async () => {
      try {
        const d = await post(base, { action: "here" });
        if (d.ended) { alive.current = false; setStatus("ended"); }
      } catch { /* retry next time */ }
      flushUploads();
    }, 30_000);
    const meter = setInterval(() => {
      const self = selfLevel.current ? selfLevel.current() > 0.04 && micOn.current : false;
      setSpeakingSelf(self);
      let changed = false;
      for (const p of Array.from(peersRef.current.values())) {
        const now = p.level ? p.level() > 0.04 && p.mic : false;
        if (now !== p.speaking) { p.speaking = now; changed = true; }
      }
      if (changed) publish();
    }, 250);
    const onShow = () => {
      if (document.visibilityState !== "visible") return;
      keepAwake();
      replaceAudio();
      ctxRef.current?.resume().catch(() => {});
      for (const p of Array.from(peersRef.current.values())) if (p.pc.connectionState === "failed" || p.pc.connectionState === "disconnected") p.pc.restartIce();
      post(base, { action: "here" }).catch(() => {});
    };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(poll); clearInterval(ping); clearInterval(meter); document.removeEventListener("visibilitychange", onShow); };
  }, [status, base, onSignal, flushUploads, keepAwake, replaceAudio, publish]);

  const stopAll = useCallback(() => {
    alive.current = false;
    if (recorder.current && recorder.current.state === "recording") recorder.current.stop();
    for (const id of Array.from(peersRef.current.keys())) dropPeer(id);
    localStream.current.getTracks().forEach((t) => t.stop());
    wake.current?.release().catch(() => {});
    ctxRef.current?.close().catch(() => {});
    setRecording(false);
  }, [dropPeer]);

  // Leaving is instant on screen: the call stops and shows as ended straight away; telling the
  // server and the others, and uploading the last bit of audio, carry on in the background.
  // Resolves once the last audio is saved (the host waits for that before opening the notes).
  const leaving = useRef<Promise<void> | null>(null);
  const leave = useCallback((): Promise<void> => {
    if (leaving.current) return leaving.current;
    alive.current = false;
    stopAll();
    setStatus("ended");
    leaving.current = (async () => {
      await Promise.all([send("", "bye"), post(base, { action: "leave" }).catch(() => {})]);
      await new Promise((r) => setTimeout(r, 300)); // the recorder hands over its last piece
      for (let i = 0; i < 12 && uploads.current.length; i++) { await flushUploads(); if (uploads.current.length) await new Promise((r) => setTimeout(r, 500)); }
    })();
    return leaving.current;
  }, [base, send, stopAll, flushUploads]);

  leaveRef.current = leave;

  /** Managers: end the meeting for everyone. Others' phones close within a second. */
  const endAll = useCallback(async () => {
    await Promise.all([
      send("", "ended"),
      post(base, { action: "end" }).catch(() => {}),
      leave(),
    ]);
  }, [base, send, leave]);

  // Closing the tab: say goodbye so others drop the tile straight away.
  useEffect(() => {
    const bye = () => {
      if (!alive.current) return;
      navigator.sendBeacon?.(`${base}/signal`, new Blob([JSON.stringify({ from: myPeer.current, to: "", kind: "bye", data: {} })], { type: "application/json" }));
      navigator.sendBeacon?.(base, new Blob([JSON.stringify({ action: "leave" })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", bye);
    return () => { window.removeEventListener("pagehide", bye); };
  }, [base]);

  useEffect(() => () => { if (alive.current) stopAll(); }, [stopAll]);

  const toggleMic = useCallback(async () => {
    if (!audioTrack.current) {
      // Listening only so far: ask for the microphone now.
      micOn.current = true;
      await replaceAudio();
      if (!audioTrack.current) { micOn.current = false; return; }
      setError("");
      startPiece(startedAtRef.current);
    } else micOn.current = !micOn.current;
    if (audioTrack.current) audioTrack.current.enabled = micOn.current;
    setMic(micOn.current);
    send("", "state", hello());
  }, [send, hello, replaceAudio, startPiece]);

  const toggleCam = useCallback(async () => {
    if (camOn.current) {
      camOn.current = false;
      videoTrack.current?.stop();
      if (videoTrack.current) localStream.current.removeTrack(videoTrack.current);
      videoTrack.current = null;
      for (const p of Array.from(peersRef.current.values())) await p.videoSender.replaceTrack(null).catch(() => {});
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
        videoTrack.current = s.getVideoTracks()[0];
        localStream.current.addTrack(videoTrack.current);
        camOn.current = true;
        for (const p of Array.from(peersRef.current.values())) await p.videoSender.replaceTrack(videoTrack.current).catch(() => {});
      } catch {
        setError("The camera couldn't be turned on. Check your browser's settings for this site.");
      }
    }
    setCam(camOn.current);
    setLocal(new MediaStream(localStream.current.getTracks()));
    send("", "state", hello());
  }, [send, hello]);

  return { status, error: error || saveError, peers, local, mic, cam, speakingSelf, startedAt, recording, pending, join, leave, endAll, toggleMic, toggleCam, myPeerId: myPeer.current };
}
