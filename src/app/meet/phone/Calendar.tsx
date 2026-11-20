"use client";

import { useRef, useState } from "react";
import { Icon, BRANCH } from "../ui";
import { D, Screen, Back, mono, useData, dayShort, dayNum, addDays, mondayOf, londonToday, type Meeting, type Task } from "./kit";

/* 13 · My calendar, and 15 · meeting notes (with the list of my past meetings). */

type Shift = { date: string; start: string; end: string; branch: string };

export function CalendarScreen({ shifts, onTask, onRota, onNotes }: { shifts: Shift[]; onTask: (id: string) => void; onRota: () => void; onNotes: (id: string) => void }) {
  const today = londonToday();
  const [day, setDay] = useState(today);
  const monday = mondayOf(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const meetings = useData<{ meetings: Meeting[] }>(`/api/meet/meetings?from=${monday}&to=${addDays(monday, 6)}`).data?.meetings || [];
  const tasks = (useData<{ tasks: Task[] }>("/api/meet/tasks").data?.tasks || []).filter((t) => t.status !== "done" && t.dueDate);
  const startX = useRef(0);

  const onDay = (d: string) => ({
    meets: meetings.filter((m) => m.date === d || (m.status === "live" && d === today)),
    tasks: tasks.filter((t) => t.dueDate === d),
    shift: shifts.filter((s) => s.date === d),
  });
  const sel = onDay(day);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  const dot = (d: string) => { const x = onDay(d); return x.meets.length ? D.orange : x.tasks.length || x.shift.length ? D.faint : "transparent"; };

  return (
    <Screen gap={18}>
      <div style={{ display: "flex", alignItems: "center", paddingTop: 6, gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>{month}</h1>
        <button aria-label="Previous week" onClick={() => setDay(addDays(day, -7))} style={{ marginLeft: "auto", width: 40, height: 40, border: 0, borderRadius: 20, background: D.chip, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="chevron_left" size={22} /></button>
        <button aria-label="Next week" onClick={() => setDay(addDays(day, 7))} style={{ width: 40, height: 40, border: 0, borderRadius: 20, background: D.chip, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="chevron_right" size={22} /></button>
        {day !== today && <button onClick={() => setDay(today)} style={{ height: 40, padding: "0 16px", border: 0, borderRadius: 20, background: D.chip, color: "#ffffff", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>Today</button>}
      </div>
      <div role="group" aria-label="Pick a day" onTouchStart={(e) => { startX.current = e.touches[0].clientX; }} onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - startX.current; if (Math.abs(dx) > 60) setDay(addDays(day, dx < 0 ? 7 : -7)); }} style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
        {days.map((d) => {
          const on = d === day;
          return (
            <button key={d} aria-pressed={on} onClick={() => setDay(d)} style={{ height: 64, border: 0, borderRadius: 18, background: on ? "#ffffff" : "transparent", color: on ? D.bg : D.muted, fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer" }}>
              <span style={{ fontSize: 11, fontWeight: on ? 500 : 400 }}>{dayShort(d)}</span>
              <span style={{ fontSize: 17, fontWeight: on ? 600 : 400, color: on ? D.bg : d === today ? D.orange : "#ffffff" }}>{dayNum(d)}</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: dot(d) }} />
            </button>
          );
        })}
      </div>
      {sel.shift.length > 0 ? (
        <button onClick={onRota} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: 0, borderRadius: 18, background: "#172e2a", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
          <Icon name="badge" size={20} style={{ color: "#5eead4" }} />
          <span style={{ flex: 1, fontSize: 13, color: "#ccfbf1" }}>On shift {sel.shift.map((s) => `${s.start} – ${s.end}`).join(", ")}{BRANCH[sel.shift[0].branch] ? ` · ${BRANCH[sel.shift[0].branch]}` : ""}</span>
          <Icon name="chevron_right" size={18} style={{ color: "#5eead4" }} />
        </button>
      ) : <p style={{ margin: 0, padding: "12px 14px", borderRadius: 18, background: D.card, fontSize: 13, color: D.muted }}>Not on the rota{day < today ? " that day" : ""}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sel.meets.map((m) => {
          const live = m.status === "live";
          const past = m.status === "ended" || m.status === "ready" || m.status === "missed";
          const sub = `${m.kind === "room" ? "Room recording" : "Video call"} · ${m.minutes} min${live ? " · tap to join" : m.status === "missed" ? " · missed, not started" : past ? (m.mineJoined ? " · tap for the notes" : " · you weren't there") : m.invited.length ? ` · ${m.invited.slice(0, 2).map((p) => p.name.split(" ")[0]).join(", ")}${m.invited.length > 2 ? ` and ${m.invited.length - 2} more` : ""}` : ""}`;
          const body = (
            <>
              {live && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff" }} />Live now</span>}
              <span style={{ fontSize: 16, fontWeight: live ? 600 : 500 }}>{m.title}</span>
              <span style={{ fontSize: 12, color: live ? "rgba(255,255,255,0.9)" : D.muted }}>{sub}</span>
            </>
          );
          return (
            <div key={m.id} style={{ display: "flex", gap: 12 }}>
              <span style={{ width: 46, flex: "none", paddingTop: 14, fontFamily: mono, fontSize: 12, color: D.muted }}>{m.time}</span>
              {live ? <a href={`/meet/call/${m.id}`} style={{ flex: 1, padding: "14px 16px", borderRadius: 20, background: "linear-gradient(140deg, #ff7a45, #e0502f)", color: "#ffffff", textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}>{body}</a>
                : past && m.mineJoined && !m.private ? <button onClick={() => onNotes(m.id)} style={{ flex: 1, padding: "14px 16px", border: 0, borderRadius: 20, background: D.card, color: "#ffffff", textAlign: "left", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 6, cursor: "pointer" }}>{body}</button>
                : m.status === "scheduled" ? <a href={`/meet/call/${m.id}`} style={{ flex: 1, padding: "14px 16px", borderRadius: 20, background: D.card, color: "#ffffff", textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}>{body}</a>
                : <div style={{ flex: 1, padding: "14px 16px", borderRadius: 20, background: D.card, display: "flex", flexDirection: "column", gap: 6, opacity: 0.7 }}>{body}</div>}
            </div>
          );
        })}
        {sel.tasks.map((t) => (
          <div key={t.id} style={{ display: "flex", gap: 12 }}>
            <span style={{ width: 46, flex: "none", paddingTop: 14, fontFamily: mono, fontSize: 12, color: D.muted }}>All day</span>
            <button onClick={() => onTask(t.id)} style={{ flex: 1, padding: "14px 16px", borderRadius: 20, border: "1.5px dashed #404040", background: "transparent", color: "#ffffff", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <Icon name="task_alt" size={20} style={{ color: D.muted }} />
              <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{t.title}</span><span style={{ display: "block", fontSize: 12, color: t.dueDate < today ? D.red : D.muted }}>{t.dueDate < today ? "Overdue" : t.dueDate === today ? "Task due today" : "Task due"}</span></span>
            </button>
          </div>
        ))}
        {sel.meets.length === 0 && sel.tasks.length === 0 && <p style={{ margin: 0, color: D.muted, fontSize: 14 }}>No meetings or tasks on this day.</p>}
      </div>
    </Screen>
  );
}

/** The meetings I was in, newest first, for "Meeting notes" on the Me screen. */
export function NotesListScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const today = londonToday();
  const { data, error } = useData<{ meetings: Meeting[] }>(`/api/meet/meetings?from=${addDays(today, -120)}&to=${today}`);
  const list = (data?.meetings || []).filter((m) => (m.status === "ready" || m.status === "ended") && m.mineJoined && !m.private).reverse();
  return (
    <Screen>
      <Back onBack={onBack} title="Meeting notes" sub="Meetings you were in" />
      {error && <p style={{ margin: 0, color: D.muted }}>{error}</p>}
      {!data && !error && <div style={{ height: 70, borderRadius: 20, background: D.card }} />}
      {data && list.length === 0 && <p style={{ margin: 0, padding: "14px 16px", borderRadius: 20, background: D.card, color: D.muted, lineHeight: 1.5 }}>No notes yet. After a meeting you were in, its summary, decisions and your tasks appear here.</p>}
      {list.map((m) => (
        <button key={m.id} onClick={() => onOpen(m.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: 0, borderRadius: 20, background: D.card, color: "#ffffff", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
          <span style={{ width: 40, height: 40, flex: "none", borderRadius: 14, background: D.raised, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="auto_stories" size={21} /></span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{m.title}</span><span style={{ display: "block", marginTop: 2, fontSize: 12, color: D.muted }}>{dayShort(m.date)} {dayNum(m.date)} · {m.status === "ready" ? "Notes ready" : "Notes being written"}</span></span>
          <Icon name="chevron_right" size={20} style={{ color: D.faint }} />
        </button>
      ))}
    </Screen>
  );
}

type Detail = {
  meeting: { id: string; title: string; kind: string; status: string; date: string; startedAt: string; endedAt: string };
  me: { id: number };
  attendees: { id: number; joinedAt: string; inRoom: boolean }[];
  notes: { summary: string; decisions: string[]; error: string; transcript: { ms: number; name: string; text: string; clockinId: number }[]; tasks: { id: string; title: string; ownerId: number; owner: string; dueDate: string; status: string }[]; recordings: { clockinId: number; seq: number; url: string }[] } | null;
};

/** 15 · Meeting notes on the phone. */
export function NotesScreen({ id, onBack, onTask }: { id: string; onBack: () => void; onTask: (id: string) => void }) {
  const { data, error } = useData<Detail>(`/api/meet/meetings/${id}`);
  const [tab, setTab] = useState<"summary" | "transcript" | "tasks">("summary");
  const [playing, setPlaying] = useState<number>(-1);
  const audio = useRef<HTMLAudioElement>(null);

  if (error) return <Screen><Back onBack={onBack} /><p style={{ margin: 0, color: D.muted }}>{error}</p></Screen>;
  if (!data) return <Screen><Back onBack={onBack} /><div style={{ height: 140, borderRadius: 22, background: D.card }} /></Screen>;
  const m = data.meeting;
  const n = data.notes;
  const mins = m.startedAt && m.endedAt ? Math.round((new Date(m.endedAt).getTime() - new Date(m.startedAt).getTime()) / 60_000) : 0;
  const came = data.attendees.filter((a) => a.joinedAt || a.inRoom).length;
  const tasks = (n?.tasks || []).filter((t) => t.status !== "suggested");
  const mine = tasks.filter((t) => t.ownerId === data.me.id);
  const pieces = (n?.recordings || []).filter((r) => r.url).sort((a, b) => a.clockinId - b.clockinId || a.seq - b.seq);

  function play() {
    if (playing >= 0) { audio.current?.pause(); setPlaying(-1); return; }
    if (!pieces.length || !audio.current) return;
    audio.current.src = pieces[0].url;
    audio.current.play().then(() => setPlaying(0)).catch(() => {});
  }
  function next() {
    const i = playing + 1;
    if (i >= pieces.length || !audio.current) return setPlaying(-1);
    audio.current.src = pieces[i].url;
    audio.current.play().then(() => setPlaying(i)).catch(() => setPlaying(-1));
  }
  async function share() {
    const text = [`${m.title} · ${dayShort(m.date)} ${dayNum(m.date)}`, n?.summary || "", n?.decisions.length ? `Decided:\n${n.decisions.map((d) => `• ${d}`).join("\n")}` : ""].filter(Boolean).join("\n\n");
    if (navigator.share) await navigator.share({ title: m.title, text }).catch(() => {});
    else await navigator.clipboard?.writeText(text);
  }

  return (
    <Screen bottom={18}>
      <Back onBack={onBack} right={n ? <button aria-label="Share notes" onClick={share} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: D.chip, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="ios_share" size={21} /></button> : null} />
      <div>
        <p style={{ margin: 0, fontSize: 13, color: D.muted }}>{dayShort(m.date)} {dayNum(m.date)} {new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${m.date}T12:00:00Z`))}{mins ? ` · ${mins} min` : ""} · {came} {came === 1 ? "person" : "people"}</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.02em" }}>{m.title}</h1>
      </div>
      {!n ? <p style={{ margin: 0, color: D.muted }}>The notes appear here once the meeting has ended.</p> : (
        <>
          <div role="tablist" aria-label="Notes" style={{ display: "flex", gap: 8 }}>
            {([["summary", "Summary"], ["transcript", "Transcript"], ["tasks", `Tasks · ${tasks.length}`]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ height: 40, padding: "0 18px", border: 0, borderRadius: 20, background: tab === k ? "#ffffff" : D.pill, color: tab === k ? D.bg : "#ffffff", fontSize: 14, fontWeight: tab === k ? 500 : 400, fontFamily: "inherit", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          {tab === "summary" && (
            <>
              <section aria-label="Summary" style={{ borderRadius: 22, background: D.card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: D.peach }}><Icon name="auto_awesome" size={17} fill />{m.status === "ready" ? "Written from the meeting" : "Being written now"}</p>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#e5e5e5", whiteSpace: "pre-wrap" }}>{n.summary || (m.status === "ready" ? "No summary for this meeting." : "Check back in a few minutes.")}</p>
              </section>
              {n.decisions.length > 0 && (
                <section aria-labelledby="dec-h" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h2 id="dec-h" style={{ margin: 0, fontSize: 15, fontWeight: 500, color: D.soft }}>Decided</h2>
                  {n.decisions.map((d, i) => <p key={i} style={{ margin: 0, display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 18, background: D.card }}><Icon name="check_circle" size={20} style={{ color: "#4ade80", flex: "none" }} />{d}</p>)}
                </section>
              )}
              {mine.length > 0 && (
                <button onClick={() => onTask(mine[0].id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: 0, borderRadius: 20, background: "linear-gradient(140deg, #ff7a45, #e0502f)", color: "#ffffff", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
                  <Icon name="assignment_ind" size={24} fill />
                  <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{mine.length} task{mine.length === 1 ? "" : "s"} for you</span><span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.9)" }}>{mine[0].title}{mine[0].dueDate ? ` · ${dayShort(mine[0].dueDate)} ${dayNum(mine[0].dueDate)}` : ""}</span></span>
                  <Icon name="chevron_right" size={20} />
                </button>
              )}
            </>
          )}
          {tab === "transcript" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {n.transcript.length === 0 && <p style={{ margin: 0, color: D.muted }}>No transcript for this meeting.</p>}
              {n.transcript.map((l, i) => <p key={i} style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}><strong style={{ fontWeight: 600 }}>{l.name}</strong> <span style={{ fontFamily: mono, fontSize: 11, color: D.muted }}>{String(Math.floor(l.ms / 60000)).padStart(2, "0")}:{String(Math.floor((l.ms % 60000) / 1000)).padStart(2, "0")}</span><br /><span style={{ color: "#e5e5e5" }}>{l.text}</span></p>)}
            </div>
          )}
          {tab === "tasks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.length === 0 && <p style={{ margin: 0, color: D.muted }}>No tasks came out of this meeting.</p>}
              {tasks.map((t) => {
                const mineT = t.ownerId === data.me.id;
                return (
                  <button key={t.id} onClick={() => mineT && onTask(t.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: 0, borderRadius: 20, background: D.card, color: "#ffffff", textAlign: "left", fontFamily: "inherit", cursor: mineT ? "pointer" : "default" }}>
                    <Icon name={t.status === "done" ? "check_circle" : "radio_button_unchecked"} size={22} fill={t.status === "done"} style={{ color: t.status === "done" ? "#4ade80" : D.ring }} />
                    <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{t.title}</span><span style={{ display: "block", marginTop: 2, fontSize: 12, color: D.muted }}>{mineT ? "You" : t.owner.split(" ")[0]}{t.dueDate ? ` · ${dayShort(t.dueDate)} ${dayNum(t.dueDate)}` : ""}</span></span>
                  </button>
                );
              })}
            </div>
          )}
          {pieces.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 22, background: D.card, marginTop: "auto" }}>
              <button aria-label={playing >= 0 ? "Pause the recording" : "Play the recording"} onClick={play} style={{ width: 44, height: 44, flex: "none", border: 0, borderRadius: 22, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name={playing >= 0 ? "pause" : "play_arrow"} size={26} fill style={{ color: D.bg }} /></button>
              <div role="img" aria-label="Recording" style={{ flex: 1, height: 26, display: "flex", alignItems: "center", gap: 2 }}>
                {Array.from({ length: 12 }, (_, i) => <span key={i} style={{ flex: 1, height: `${[40, 70, 50, 90, 35, 75, 55, 85, 40, 65, 30, 60][i]}%`, borderRadius: 2, background: playing >= 0 && i / 12 <= (playing + 1) / pieces.length ? D.peach : D.ring }} />)}
              </div>
              <span style={{ fontFamily: mono, fontSize: 12, color: D.muted }}>{playing >= 0 ? `${playing + 1}/${pieces.length}` : `${Math.round((pieces.length * 30) / 60)} min`}</span>
              <audio ref={audio} onEnded={next} hidden />
            </div>
          )}
        </>
      )}
    </Screen>
  );
}
