"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Icon, personColourLight, initial, firstName } from "../ui";
import { ManagerFrame, PAGE as C, panel, mono, postJson } from "../ManagerShell";

/* 6 · Meeting results (33 · naming room voices and 34 · the private-meeting PIN are part of it). */

type Line = { ms: number; clockinId: number; speaker: number; text: string; name: string };
type Task = { id: string; title: string; ownerId: number; owner: string; dueDate: string; status: string; quote: string; quoteBy: string; quoteMs: number | null };
type Rec = { clockinId: number; seq: number; startMs: number; status: string; url: string };
type Attendee = { id: number; name: string; invited: boolean; presence: string; joinedAt: string; leftAt: string; seconds: number; onShift: boolean; inRoom: boolean };
type Detail = {
  meeting: { id: string; title: string; kind: string; status: string; date: string; time: string; minutes: number; private: boolean; liveNotes: boolean; startedAt: string; endedAt: string };
  me: { id: number; manager: boolean };
  attendees: Attendee[];
  people: { id: number; name: string }[];
  locked: boolean;
  notes: { summary: string; decisions: string[]; notesBy: string; error: string; transcript: Line[]; speakerIds: Record<string, number>; tasks: Task[]; recordings: Rec[] } | null;
  ready: { transcription: boolean; summary: boolean };
};

const DAY = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const SHORT = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const clock = (ms: number) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const card: CSSProperties = { borderRadius: 24, background: "#ffffff", padding: 22, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" };
const pillBtn: CSSProperties = { height: 40, padding: "0 12px", border: 0, borderRadius: 20, background: "#ffffff", fontSize: 13, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, color: C.ink };
const black: CSSProperties = { height: 40, padding: "0 18px", border: 0, borderRadius: 20, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" };

function Avatar({ id, name, size = 32 }: { id: number; name: string; size?: number }) {
  const c = personColourLight(id);
  return <span style={{ width: size, height: size, borderRadius: "50%", background: c.bg, color: c.fg, fontSize: size > 28 ? 12 : 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{initial(name)}</span>;
}

function highlight(text: string, q: string): ReactNode {
  if (!q.trim()) return text;
  const i = text.toLowerCase().indexOf(q.trim().toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark style={{ background: "#ffe4da", color: "inherit", borderRadius: 4, padding: "0 2px" }}>{text.slice(i, i + q.trim().length)}</mark>{text.slice(i + q.trim().length)}</>;
}

export default function ResultsPage({ id }: { id: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState("");
  const unlocked = useRef<Detail | null>(null);
  const pin = useRef("");

  const load = useCallback(async () => {
    if (unlocked.current) return; // private notes stay open once the PIN is in
    const res = await fetch(`/api/meet/meetings/${id}`, { cache: "no-store" }).catch(() => null);
    if (!res) return setError("Can't connect right now");
    if (res.status === 401) { window.location.replace(`/meet?back=${encodeURIComponent(window.location.pathname)}`); return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(res.status === 403 ? "Meeting notes are for managers." : data.error || "Meeting not found");
    setD(data);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // A meeting that has just ended: keep making the notes until they're ready.
  useEffect(() => {
    if (d?.meeting.status !== "ended" || !d?.me.manager) return;
    let stop = false;
    (async () => {
      while (!stop) {
        setProgress("Writing the notes from the recording…");
        const r = await postJson(`/api/meet/meetings/${id}`, { action: "process" });
        if (stop) return;
        if (!r.ok) { setProgress(""); return; }
        if (r.data.status === "ready") { setProgress(""); refresh(); return; }
        setProgress(`Writing the notes… ${r.data.pending ? `${r.data.pending} recording piece${r.data.pending === 1 ? "" : "s"} left to transcribe` : ""}`);
        await new Promise((ok) => setTimeout(ok, 3000));
      }
    })();
    return () => { stop = true; };
    // Runs while the meeting is "ended"; refresh is stable enough for this loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.meeting.status, d?.me.manager, id]);

  // After a save: private notes are reopened with the PIN already entered on this page.
  const refresh = async () => {
    if (!unlocked.current || !pin.current) return load();
    const r = await postJson(`/api/meet/meetings/${id}`, { action: "unlock", pin: pin.current });
    if (r.ok) { unlocked.current = r.data as unknown as Detail; setD(unlocked.current); }
  };

  if (error) return <ManagerFrame current="notes"><p style={{ ...panel, margin: 0, color: C.sub }}>{error}</p></ManagerFrame>;
  if (!d) return <ManagerFrame current="notes"><p style={{ ...panel, margin: 0, color: C.sub }}>Loading the notes…</p></ManagerFrame>;
  const m = d.meeting;
  const came = d.attendees.filter((a) => a.joinedAt || a.inRoom).length;
  const invited = d.attendees.filter((a) => a.invited).length;

  async function share() {
    const n = d!.notes;
    const text = [`${m.title} · ${DAY(m.date)}`, n?.summary || "", n?.decisions.length ? `Decided:\n${n.decisions.map((x) => `• ${x}`).join("\n")}` : "", n?.tasks.filter((t) => t.status !== "suggested").length ? `Tasks:\n${n.tasks.filter((t) => t.status !== "suggested").map((t) => `• ${t.title} (${firstName(t.owner)}${t.dueDate ? `, ${SHORT(t.dueDate)}` : ""})`).join("\n")}` : ""].filter(Boolean).join("\n\n");
    if (navigator.share) await navigator.share({ title: m.title, text }).catch(() => {});
    else { await navigator.clipboard?.writeText(text); setNote("Notes copied. Paste them into WhatsApp or an email."); }
  }

  return (
    <ManagerFrame current="notes">
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "4px 4px 0" }}>
        <a href="/meet/notes" aria-label="Back" style={{ width: 40, height: 40, borderRadius: 20, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.08)", color: C.ink }}><Icon name="arrow_back" size={20} /></a>
        <div style={{ flex: "1 1 260px" }}>
          <p style={{ margin: 0, fontSize: 13, color: C.sub }}>{DAY(m.date)} · {m.startedAt ? `${hm(m.startedAt)} – ${m.endedAt ? hm(m.endedAt) : "now"}` : m.time} · {m.kind === "room" ? "Room recording" : "Video call"} · {came} of {invited || came} came</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", display: "flex", alignItems: "center", gap: 8 }}>{m.private && <Icon name="lock" size={22} />}{m.title}</h1>
        </div>
        {d.notes && <button onClick={share} style={{ ...pillBtn, height: 40, padding: "0 16px", fontSize: 14, fontWeight: 500, boxShadow: "0 1px 2px rgba(20,20,20,0.08)", cursor: "pointer" }}><Icon name="ios_share" size={19} />Share notes</button>}
      </header>
      {note && <p role="status" style={{ margin: "0 4px", fontSize: 13, color: C.body }}>{note}</p>}
      {progress && <p role="status" style={{ margin: 0, padding: "12px 16px", borderRadius: 18, background: "#fef3c7", color: "#92400e", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><Icon name="hourglass_top" size={18} />{progress}</p>}
      {d.locked ? <PinDialog m={m} onOpen={(data, p) => { unlocked.current = data; pin.current = p; setD(data); }} /> : !d.notes ? (
        <p style={{ ...panel, margin: 0, color: C.sub }}>{m.status === "live" ? <>This meeting is still going. <a href={`/meet/live/${m.id}`} style={{ color: C.ink }}>See who&rsquo;s in</a>.</> : "Notes appear here once the meeting has ended."}</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flex: "999 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            <Summary d={d} onSaved={(msg) => { setNote(msg); refresh(); }} />
            <Tasks d={d} onSaved={(msg) => { setNote(msg); refresh(); }} />
            {m.kind === "room" && d.notes.transcript.length > 0 && <Voices d={d} onSaved={(msg) => { setNote(msg); refresh(); }} />}
            <Transcript lines={d.notes.transcript} />
          </div>
          <aside style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            <Recording recs={d.notes.recordings} people={d.people} ended={m.endedAt} />
            {d.notes.transcript.length > 0 && <Insights lines={d.notes.transcript} />}
            <section aria-labelledby="at-h" style={{ ...card, padding: 18, gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center" }}><h2 id="at-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Attendance</h2><a href="/meet/attendance" style={{ marginLeft: "auto", fontSize: 13, color: C.sub, textDecoration: "none" }}>History</a></div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                {d.attendees.filter((a) => a.invited || a.joinedAt || a.inRoom).map((a) => {
                  const here = a.joinedAt || a.inRoom;
                  const late = a.joinedAt && m.startedAt && new Date(a.joinedAt).getTime() - new Date(m.startedAt).getTime() > 5 * 60_000;
                  return (
                    <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: here ? (late ? "#f59e0b" : "#22c55e") : a.onShift ? "#ef4444" : "#a8a29e" }} />
                      {firstName(a.name)}{a.inRoom && <span style={{ color: C.sub }}>(room)</span>}{late && <span style={{ color: "#92400e" }}>late</span>}
                      {!here && <span style={{ color: C.sub }}>missed, {a.onShift ? "on" : "off"} shift</span>}
                      {a.seconds > 0 && <span style={{ marginLeft: "auto", color: C.sub }}>{Math.max(1, Math.round(a.seconds / 60))} min</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </ManagerFrame>
  );
}

/* ─── Summary and decisions (written by Claude, or by a manager) ─── */
function Summary({ d, onSaved }: { d: Detail; onSaved: (msg: string) => void }) {
  const n = d.notes!;
  const empty = !n.summary && n.decisions.length === 0;
  const [edit, setEdit] = useState(false);
  const [summary, setSummary] = useState(n.summary);
  const [decisions, setDecisions] = useState(n.decisions.join("\n"));
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const r = await postJson(`/api/meet/meetings/${d.meeting.id}`, { action: "notes", summary, decisions: decisions.split("\n").map((x) => x.trim()).filter(Boolean) });
    setBusy(false);
    if (r.ok) { setEdit(false); onSaved("Notes saved."); }
  }
  return (
    <section aria-labelledby="sum-h" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="auto_awesome" size={21} fill style={{ color: C.accent }} />
        <h2 id="sum-h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Summary</h2>
        {n.notesBy && n.notesBy !== "ai" && <span style={{ fontSize: 12, color: C.sub }}>by {firstName(n.notesBy)}</span>}
        {d.me.manager && !edit && d.meeting.status === "ready" && <button onClick={() => setEdit(true)} style={{ marginLeft: "auto", height: 34, padding: "0 14px", border: 0, borderRadius: 17, background: C.page, fontSize: 13, fontFamily: "inherit", color: C.ink, cursor: "pointer" }}>{empty ? "Write the notes" : "Edit"}</button>}
      </div>
      {n.error && empty && !edit && <p style={{ margin: 0, fontSize: 13, color: C.sub }}>{n.error}</p>}
      {edit ? (
        <>
          <textarea aria-label="Summary" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What was discussed and agreed, in a few sentences" style={{ border: `1px solid ${C.field}`, borderRadius: 14, padding: "10px 12px", fontFamily: "inherit", fontSize: 15, lineHeight: 1.6, color: C.ink, resize: "vertical" }} />
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.sub }}>Decided (one per line)
            <textarea rows={3} value={decisions} onChange={(e) => setDecisions(e.target.value)} style={{ border: `1px solid ${C.field}`, borderRadius: 14, padding: "10px 12px", fontFamily: "inherit", fontSize: 14, lineHeight: 1.5, color: C.ink, resize: "vertical" }} />
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setEdit(false)} style={{ ...black, background: C.page, color: C.ink }}>Cancel</button>
            <button onClick={save} disabled={busy} style={black}>{busy ? "Saving…" : "Save notes"}</button>
          </div>
        </>
      ) : (
        <>
          {n.summary && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#2b2925", whiteSpace: "pre-wrap" }}>{n.summary}</p>}
          {n.decisions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.sub }}>Decided</p>
              {n.decisions.map((x, i) => <p key={i} style={{ margin: 0, display: "flex", gap: 10, alignItems: "flex-start" }}><Icon name="check_circle" size={19} style={{ color: "#16a34a", flex: "none" }} />{x}</p>)}
            </div>
          )}
          {empty && !n.error && <p style={{ margin: 0, fontSize: 13, color: C.sub }}>No summary yet.</p>}
        </>
      )}
    </section>
  );
}

/* ─── Tasks to confirm ─── */
function Tasks({ d, onSaved }: { d: Detail; onSaved: (msg: string) => void }) {
  const n = d.notes!;
  const suggested = n.tasks.filter((t) => t.status === "suggested");
  const given = n.tasks.filter((t) => t.status !== "suggested");
  const [rows, setRows] = useState(suggested.map((t) => ({ ...t })));
  const [busy, setBusy] = useState("");
  const [adding, setAdding] = useState({ title: "", ownerId: 0, dueDate: "" });
  useEffect(() => { setRows(n.tasks.filter((t) => t.status === "suggested").map((t) => ({ ...t }))); }, [n.tasks]);

  async function confirm(ids: string[]) {
    setBusy("confirm");
    for (const r of rows.filter((x) => ids.includes(x.id))) {
      if (!r.ownerId) continue;
      await postJson("/api/meet/tasks", { id: r.id, action: "edit", title: r.title, ownerId: r.ownerId, dueDate: r.dueDate });
      await postJson("/api/meet/tasks", { id: r.id, action: "confirm" });
    }
    setBusy("");
    onSaved(ids.length > 1 ? "Tasks confirmed. Everyone's been told." : "Task confirmed.");
  }
  async function dismiss(id: string) {
    setBusy(id);
    await postJson("/api/meet/tasks", { id, action: "dismiss" });
    setBusy("");
    setRows((r) => r.filter((x) => x.id !== id));
  }
  async function add() {
    if (!adding.title.trim() || !adding.ownerId) return;
    setBusy("add");
    const r = await postJson("/api/meet/tasks", { action: "create", title: adding.title, ownerId: adding.ownerId, dueDate: adding.dueDate, meetingId: d.meeting.id });
    setBusy("");
    if (r.ok) { setAdding({ title: "", ownerId: 0, dueDate: "" }); onSaved("Task given out."); }
  }
  const set = (id: string, patch: Partial<Task>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const ready = rows.filter((r) => r.ownerId);

  if (!d.me.manager && given.length === 0) return null;
  return (
    <section aria-labelledby="t-h" style={{ ...card, gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 id="t-h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{rows.length ? "Tasks to confirm" : "Tasks"}</h2>
        {rows.length > 0 && <span style={{ height: 22, padding: "0 8px", borderRadius: 11, background: C.coralBg, color: C.coral, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center" }}>{rows.length}</span>}
        {rows.length > 1 && <button onClick={() => confirm(ready.map((r) => r.id))} disabled={!!busy || !ready.length} style={{ marginLeft: "auto", height: 38, padding: "0 16px", border: 0, borderRadius: 19, background: C.ink, color: "#ffffff", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>{busy === "confirm" ? "Confirming…" : "Confirm all"}</button>}
      </div>
      {rows.map((t) => (
        <div key={t.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: 12, borderRadius: 18, background: C.page, boxShadow: t.ownerId ? "none" : "inset 0 0 0 1.5px #f2643a" }}>
          <Icon name="radio_button_unchecked" size={20} style={{ color: C.sub }} />
          <input aria-label="Task" value={t.title} onChange={(e) => set(t.id, { title: e.target.value })} style={{ flex: "1 1 240px", height: 40, padding: "0 12px", border: 0, borderRadius: 12, background: "#ffffff", fontSize: 14, fontFamily: "inherit", color: C.ink }} />
          <label style={{ ...pillBtn, background: t.ownerId ? "#ffffff" : "#f2643a", color: t.ownerId ? C.ink : "#ffffff", position: "relative", cursor: "pointer" }}>
            {t.ownerId ? <Avatar id={t.ownerId} name={d.people.find((p) => p.id === t.ownerId)?.name || t.owner} size={24} /> : <Icon name="person_add" size={17} />}
            {t.ownerId ? firstName(d.people.find((p) => p.id === t.ownerId)?.name || t.owner) : "Pick someone"}
            <select aria-label="Who does it" value={t.ownerId || ""} onChange={(e) => set(t.id, { ownerId: Number(e.target.value) })} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", fontSize: 16 }}>
              <option value="">Pick someone</option>{d.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label style={{ ...pillBtn, position: "relative", cursor: "pointer" }}>
            <Icon name="event" size={17} />{t.dueDate ? SHORT(t.dueDate) : "No date"}
            <input type="date" aria-label="Due" value={t.dueDate} onChange={(e) => set(t.id, { dueDate: e.target.value })} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
          </label>
          {rows.length === 1 && <button onClick={() => confirm([t.id])} disabled={!t.ownerId || !!busy} style={{ ...black, height: 40, opacity: t.ownerId ? 1 : 0.45 }}>Confirm</button>}
          <button aria-label="Remove task" onClick={() => dismiss(t.id)} disabled={!!busy} style={{ width: 40, height: 40, border: 0, borderRadius: 20, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.sub }}><Icon name="close" size={19} /></button>
          {t.quote && <p style={{ flexBasis: "100%", margin: "0 0 0 30px", fontSize: 12, color: C.sub }}>&ldquo;{t.quote}&rdquo;{t.quoteBy ? ` · ${t.quoteBy}` : ""}</p>}
        </div>
      ))}
      {given.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.length > 0 && <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: C.sub }}>Given out</p>}
          {given.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <Icon name={t.status === "done" ? "check_circle" : "radio_button_unchecked"} size={19} fill={t.status === "done"} style={{ color: t.status === "done" ? "#16a34a" : C.sub }} />
              <span style={{ flex: 1, textDecoration: t.status === "done" ? "line-through" : "none", color: t.status === "done" ? C.sub : C.ink }}>{t.title}</span>
              <span style={{ fontSize: 13, color: C.sub }}>{firstName(t.owner)}{t.dueDate ? ` · ${SHORT(t.dueDate)}` : ""}</span>
            </div>
          ))}
        </div>
      )}
      {d.me.manager && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", paddingTop: rows.length || given.length ? 6 : 0, borderTop: rows.length || given.length ? `1px solid ${C.line}` : "none" }}>
          <input aria-label="New task" value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} placeholder="Add a task from this meeting" style={{ flex: "1 1 220px", height: 40, padding: "0 12px", border: `1px solid ${C.field}`, borderRadius: 12, fontSize: 14, fontFamily: "inherit", color: C.ink }} />
          <select aria-label="Who does it" value={adding.ownerId || ""} onChange={(e) => setAdding({ ...adding, ownerId: Number(e.target.value) })} style={{ height: 40, borderRadius: 20, border: `1px solid ${C.field}`, padding: "0 10px", fontFamily: "inherit", fontSize: 13, background: "#ffffff" }}>
            <option value="">Who?</option>{d.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" aria-label="Due" value={adding.dueDate} onChange={(e) => setAdding({ ...adding, dueDate: e.target.value })} style={{ height: 40, borderRadius: 20, border: `1px solid ${C.field}`, padding: "0 10px", fontFamily: "inherit", fontSize: 13 }} />
          <button onClick={add} disabled={!adding.title.trim() || !adding.ownerId || busy === "add"} style={{ ...black, opacity: adding.title.trim() && adding.ownerId ? 1 : 0.45 }}>{busy === "add" ? "Adding…" : "Add"}</button>
        </div>
      )}
    </section>
  );
}

/* ─── 33 · Who's who in the room ─── */
function Voices({ d, onSaved }: { d: Detail; onSaved: (msg: string) => void }) {
  const n = d.notes!;
  const voices = Array.from(new Set(n.transcript.map((l) => l.speaker))).sort((a, b) => a - b);
  const [map, setMap] = useState<Record<string, number>>(() => ({ ...n.speakerIds }));
  const [busy, setBusy] = useState(false);
  const roomPeople = d.attendees.filter((a) => a.inRoom).map((a) => ({ id: a.id, name: a.name }));
  const choices = roomPeople.length ? [...roomPeople, ...d.people.filter((p) => !roomPeople.some((r) => r.id === p.id))] : d.people;
  async function save() {
    setBusy(true);
    const r = await postJson(`/api/meet/meetings/${d.meeting.id}`, { action: "speakers", map });
    setBusy(false);
    if (r.ok) onSaved("Names saved. The transcript now shows who said what.");
  }
  return (
    <section aria-labelledby="sp-h" style={card}>
      <div>
        <h2 id="sp-h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Who&rsquo;s who in the room?</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: C.sub }}>One device heard {voices.length} voice{voices.length === 1 ? "" : "s"}.{Object.keys(n.speakerIds).length ? " We've guessed from the conversation; check and confirm." : " Pick who each voice is."}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {voices.map((v) => {
          const lines = n.transcript.filter((l) => l.speaker === v);
          const sample = lines.reduce((a, b) => (b.text.length > a.text.length && b.text.length < 140 ? b : a), lines[0]);
          const who = map[String(v)];
          const guess = n.speakerIds[String(v)] === who && who;
          const name = d.people.find((p) => p.id === who)?.name || "";
          return (
            <div key={v} style={{ padding: 14, borderRadius: 18, background: C.page, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 12, color: C.sub }}>Voice {v + 1} · {lines.length} line{lines.length === 1 ? "" : "s"}</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>&ldquo;{sample?.text.slice(0, 140)}&rdquo;</p>
              <label style={{ ...pillBtn, height: 38, alignSelf: "flex-start", position: "relative", cursor: "pointer" }}>
                {who ? <Avatar id={who} name={name} size={24} /> : <Icon name="person_add" size={17} />}{who ? firstName(name) : "Pick a person"}{guess && <span style={{ color: C.sub }}>(guess)</span>}<Icon name="expand_more" size={17} />
                <select aria-label={`Voice ${v + 1} is`} value={who || ""} onChange={(e) => setMap({ ...map, [String(v)]: Number(e.target.value) })} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", fontSize: 16 }}>
                  <option value="">Pick a person</option>{choices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            </div>
          );
        })}
      </div>
      {d.me.manager && <button onClick={save} disabled={busy} style={{ ...black, alignSelf: "flex-end" }}>{busy ? "Saving…" : "Confirm names"}</button>}
    </section>
  );
}

/* ─── Transcript with search ─── */
function Transcript({ lines }: { lines: Line[] }) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const shown = lines.filter((l) => !q.trim() || l.text.toLowerCase().includes(q.trim().toLowerCase()) || l.name.toLowerCase().includes(q.trim().toLowerCase()));
  const list = all || q ? shown : shown.slice(0, 12);
  return (
    <section aria-labelledby="tr-h" style={card}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <h2 id="tr-h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Transcript</h2>
        {lines.length > 0 && (
          <div style={{ marginLeft: "auto", position: "relative", flex: "0 1 260px" }}>
            <label htmlFor="tr-s" className="sr-only">Search the transcript</label>
            <Icon name="search" size={19} style={{ position: "absolute", left: 14, top: 11, color: C.sub }} />
            <input id="tr-s" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search what was said" style={{ width: "100%", boxSizing: "border-box", height: 42, padding: "0 14px 0 42px", border: 0, borderRadius: 21, background: C.page, fontSize: 14, fontFamily: "inherit" }} />
          </div>
        )}
      </div>
      {lines.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: C.sub }}>No transcript for this meeting.</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, lineHeight: 1.6 }}>
          {list.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <Avatar id={l.clockinId || 1000 + l.speaker} name={l.name} />
              <p style={{ margin: 0 }}><strong style={{ fontWeight: 600 }}>{l.name}</strong> <span style={{ fontFamily: mono, fontSize: 12, color: C.sub }}>{clock(l.ms)}</span><br /><span style={{ color: "#2b2925" }}>{highlight(l.text, q)}</span></p>
            </div>
          ))}
          {q && shown.length === 0 && <p style={{ margin: 0, fontSize: 13, color: C.sub }}>Nothing matches that.</p>}
        </div>
      )}
      {!all && !q && lines.length > 12 && <button onClick={() => setAll(true)} style={{ alignSelf: "flex-start", height: 38, padding: "0 16px", border: 0, borderRadius: 19, background: C.page, fontSize: 13, fontWeight: 500, fontFamily: "inherit", color: C.ink, cursor: "pointer" }}>Show full transcript ({lines.length} lines)</button>}
    </section>
  );
}

/* ─── Recording: each person's own track, played piece after piece ─── */
function Recording({ recs, people, ended }: { recs: Rec[]; people: { id: number; name: string }[]; ended: string }) {
  const tracks = Array.from(new Set(recs.map((r) => r.clockinId))).map((id) => ({ id, name: id === 0 ? "The room" : people.find((p) => p.id === id)?.name || "Someone", pieces: recs.filter((r) => r.clockinId === id && r.url).sort((a, b) => a.seq - b.seq) }));
  const [playing, setPlaying] = useState<{ id: number; i: number } | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!playing || !audio.current) return;
    const t = tracks.find((x) => x.id === playing.id);
    const piece = t?.pieces[playing.i];
    if (!piece) { setPlaying(null); return; }
    audio.current.src = piece.url;
    audio.current.play().catch(() => setPlaying(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  const deleteOn = ended ? new Date(new Date(ended).getTime() + 30 * 86400_000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }) : "";
  const minutes = (n: number) => `${Math.round((n * 30) / 60)} min`;
  return (
    <section aria-labelledby="rec-h" style={{ borderRadius: 24, background: C.ink, color: "#ffffff", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 id="rec-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Recording</h2>
      <audio ref={audio} onEnded={() => setPlaying((p) => (p ? { ...p, i: p.i + 1 } : null))} hidden />
      {tracks.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#c9c3bc" }}>Nothing was recorded.</p>}
      {tracks.map((t) => {
        const on = playing?.id === t.id;
        return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button aria-label={on ? `Pause ${t.name}` : `Play ${t.name}`} onClick={() => { if (on) { audio.current?.pause(); setPlaying(null); } else setPlaying({ id: t.id, i: 0 }); }} disabled={!t.pieces.length} style={{ width: 44, height: 44, flex: "none", border: 0, borderRadius: 22, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icon name={on ? "pause" : "play_arrow"} size={24} fill style={{ color: C.ink }} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{firstName(t.name)}</p>
              <div role="img" aria-label="Sound wave" style={{ marginTop: 4, height: 18, display: "flex", alignItems: "center", gap: 2 }}>
                {Array.from({ length: 24 }, (_, i) => <span key={i} style={{ flex: 1, height: `${30 + ((i * 37 + t.id) % 60)}%`, borderRadius: 2, background: on && playing && i / 24 <= (playing.i + 1) / Math.max(1, t.pieces.length) ? "#ffad8c" : "#57534e" }} />)}
              </div>
            </div>
            <span style={{ fontFamily: mono, fontSize: 12, color: "#c9c3bc" }}>{on && playing ? `${playing.i + 1}/${t.pieces.length}` : minutes(t.pieces.length)}</span>
          </div>
        );
      })}
      {deleteOn && tracks.length > 0 && <p style={{ margin: 0, fontSize: 12, color: "#a8a29e" }}>Audio is deleted on {deleteOn}. Notes stay.</p>}
    </section>
  );
}

/* ─── Insights: who spoke most ─── */
function Insights({ lines }: { lines: Line[] }) {
  const words = new Map<string, number>();
  for (const l of lines) words.set(l.name, (words.get(l.name) || 0) + l.text.split(/\s+/).length);
  const total = Array.from(words.values()).reduce((a, b) => a + b, 0) || 1;
  const rows = Array.from(words.entries()).map(([name, n]) => ({ name, pct: Math.round((n / total) * 100) })).sort((a, b) => b.pct - a.pct);
  return (
    <section aria-labelledby="ins-h" style={{ ...card, padding: 18 }}>
      <h2 id="ins-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Meeting insights</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.sub }}>Who spoke most</p>
        {rows.map((r) => (
          <Fragment key={r.name}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ width: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <span style={{ flex: 1, height: 8, borderRadius: 4, background: C.page }}><span style={{ display: "block", width: `${r.pct}%`, height: "100%", borderRadius: 4, background: C.ink }} /></span>
              <span style={{ width: 34, textAlign: "right" }}>{r.pct}%</span>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

/* ─── 34 · Private meeting: manager PIN to open the notes ─── */
function PinDialog({ m, onOpen }: { m: Detail["meeting"]; onOpen: (d: Detail, pin: string) => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  useEffect(() => { refs[0].current?.focus(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function open(pin: string) {
    setBusy(true);
    setErr("");
    const r = await postJson(`/api/meet/meetings/${m.id}`, { action: "unlock", pin });
    setBusy(false);
    if (!r.ok) { setErr(r.data.error || "That PIN isn't right"); setDigits(["", "", "", ""]); refs[0].current?.focus(); return; }
    onOpen(r.data as unknown as Detail, pin);
  }
  function type(i: number, v: string) {
    const x = v.replace(/\D/g, "").slice(-1);
    const next = digits.map((dg, j) => (j === i ? x : dg));
    setDigits(next);
    if (x && i < 3) refs[i + 1].current?.focus();
    if (next.every(Boolean)) open(next.join(""));
  }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(40,32,26,0.42)", padding: 36, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="pv-title" style={{ width: "100%", maxWidth: 460, marginTop: 90, boxSizing: "border-box", background: "#ffffff", borderRadius: 28, boxShadow: "0 30px 70px -20px rgba(20,20,20,0.45)", padding: "28px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center" }}>
        <span style={{ width: 64, height: 64, borderRadius: 20, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="lock" size={30} fill style={{ color: "#e8cc9c" }} /></span>
        <div>
          <h2 id="pv-title" style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>Private meeting</h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: C.sub, lineHeight: 1.5 }}>&ldquo;{m.title}&rdquo; · {DAY(m.date)}<br />Enter the manager PIN to read the notes and play the recording.</p>
        </div>
        <div role="group" aria-label="Manager PIN" style={{ display: "flex", gap: 10 }}>
          {digits.map((dg, i) => (
            <input key={i} ref={refs[i]} aria-label={`Digit ${i + 1}`} inputMode="numeric" type="password" value={dg} disabled={busy} onChange={(e) => type(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !dg && i > 0) refs[i - 1].current?.focus(); }}
              style={{ width: 52, height: 60, boxSizing: "border-box", border: dg || document.activeElement !== refs[i].current ? 0 : `2px solid ${C.ink}`, borderRadius: 16, background: C.page, textAlign: "center", fontSize: 26, fontFamily: "inherit", color: C.ink }} />
          ))}
        </div>
        {err ? <p role="alert" style={{ margin: "-4px 0 0", fontSize: 13, color: "#b91c1c" }}>{err}</p> : <p style={{ margin: "-4px 0 0", fontSize: 12, color: C.sub }}>The manager PIN is different from clock-in PINs. The first PIN entered becomes the manager PIN.</p>}
        <div style={{ width: "100%", display: "flex", gap: 8 }}>
          <a href="/meet/notes" style={{ flex: 1, height: 48, boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 24, background: C.page, fontSize: 15, fontWeight: 500, textDecoration: "none", color: C.ink }}>Cancel</a>
          <button onClick={() => digits.every(Boolean) && open(digits.join(""))} disabled={busy || !digits.every(Boolean)} style={{ flex: 1, height: 48, border: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 24, background: C.ink, color: "#ffffff", fontSize: 15, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}><Icon name="lock_open" size={19} />{busy ? "Opening…" : "Open notes"}</button>
        </div>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.sub }}><Icon name="history" size={16} />Opening it is logged with your name and the time.</p>
      </div>
    </div>
  );
}
