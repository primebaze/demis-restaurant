"use client";

import { useRef, useState } from "react";
import { Icon, personColour, initial, uploadFile } from "../ui";
import { D, Screen, Back, Chip, bigWhite, dashedBtn, field, useData, send, dayLong, dayShort, dayNum, addDays, mondayOf, type Task } from "./kit";

/* 14 · All my tasks, and 10 · doing a task. Values from the design canvas. */

type List = { today: string; stats: { open: number; doneThisMonth: number; ofThisMonth: number; onTime: number }; tasks: Task[] };

export function TasksScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, error } = useData<List>("/api/meet/tasks");
  const [show, setShow] = useState<"todo" | "done">("todo");
  const today = data?.today || "";
  const open = (data?.tasks || []).filter((t) => t.status !== "done");
  const done = (data?.tasks || []).filter((t) => t.status === "done").sort((a, b) => b.doneAt.localeCompare(a.doneAt));
  const sunday = today ? addDays(mondayOf(today), 6) : "";
  const groups: [string, Task[], string][] = [
    ["Overdue", open.filter((t) => t.dueDate && t.dueDate < today), D.red],
    ["This week", open.filter((t) => t.dueDate >= today && t.dueDate <= sunday), D.muted],
    ["Later", open.filter((t) => t.dueDate > sunday || !t.dueDate), D.muted],
  ];
  const s = data?.stats;
  const pct = s && s.ofThisMonth ? Math.round((s.doneThisMonth / s.ofThisMonth) * 100) : 0;
  const praise = !s || s.doneThisMonth === 0 ? "Your tasks this month" : pct >= 75 ? "Nice work this month" : "Keep going this month";
  const sub = !s || s.doneThisMonth === 0 ? "Tasks from meetings and managers show here" : s.onTime === s.doneThisMonth ? "Everything done on time" : s.onTime >= s.doneThisMonth / 2 ? "Most tasks done on time" : "Some tasks were late";

  return (
    <Screen>
      <div style={{ paddingTop: 6 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>My tasks</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: D.muted }}>{s ? `${s.open} to do · ${s.doneThisMonth} done this month` : " "}</p>
      </div>
      {error && <p style={{ margin: 0, color: D.muted }}>{error}</p>}
      <div role="img" aria-label={`${s?.doneThisMonth || 0} of ${s?.ofThisMonth || 0} tasks done this month`} style={{ borderRadius: 20, background: D.card, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: `conic-gradient(${D.orange} 0 ${pct}%, #2a2a2a ${pct}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: D.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>{pct}%</div>
        </div>
        <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{praise}</p><p style={{ margin: "2px 0 0", fontSize: 12, color: D.muted }}>{sub}</p></div>
      </div>
      <div role="group" aria-label="Show" style={{ display: "flex", gap: 8 }}>
        <Chip h={40} on={show === "todo"} onClick={() => setShow("todo")}>To do · {open.length}</Chip>
        <Chip h={40} on={show === "done"} onClick={() => setShow("done")}>Done · {done.length}</Chip>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {!data && !error && <div style={{ height: 70, borderRadius: 20, background: D.card }} />}
        {show === "todo" && data && open.length === 0 && <p style={{ margin: 0, padding: "14px 16px", borderRadius: 20, background: D.card, color: D.muted, lineHeight: 1.5 }}>Nothing to do. New tasks from meetings and managers land here, and you get a notification.</p>}
        {show === "todo" && groups.filter(([, l]) => l.length).map(([title, list, colour], gi) => (
          <div key={title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: gi ? "6px 0 0" : 0, fontSize: 12, fontWeight: 600, color: colour }}>{title}</p>
            {list.map((t) => {
              const late = t.dueDate && t.dueDate < today;
              const meta = [t.steps.length ? `${t.stepsDone} of ${t.steps.length} steps` : "", t.meeting || (t.createdBy ? `From ${t.createdBy}` : ""), t.status === "help" ? "asked for help" : ""].filter(Boolean).join(" · ");
              return (
                <button key={t.id} onClick={() => onOpen(t.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: 0, borderRadius: 20, background: D.card, color: "#ffffff", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${late ? D.red : D.ring}`, boxSizing: "border-box", flex: "none" }} />
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{t.title}</span>{meta && <span style={{ display: "block", marginTop: 3, fontSize: 12, color: D.muted }}>{meta}</span>}</span>
                  {t.dueDate && <span style={{ fontSize: 12, color: late ? D.red : D.muted, whiteSpace: "nowrap" }}>{dayShort(t.dueDate)} {dayNum(t.dueDate)}</span>}
                </button>
              );
            })}
          </div>
        ))}
        {show === "done" && (done.length === 0 ? <p style={{ margin: 0, color: D.muted }}>Nothing done in the last few weeks yet.</p> : (
          <>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: D.muted }}>Done recently</p>
            {done.map((t) => (
              <button key={t.id} onClick={() => onOpen(t.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: 0, borderRadius: 20, background: D.done, color: "#ffffff", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#16a34a", flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={18} style={{ fontVariationSettings: '"wght" 600' }} /></span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: D.faint, textDecoration: "line-through" }}>{t.title}</span>
                <span style={{ fontSize: 12, color: D.faint }}>{dayShort(t.doneAt.slice(0, 10))}</span>
              </button>
            ))}
          </>
        ))}
      </div>
    </Screen>
  );
}

type One = { today: string; task: Task & { photo: string; meetingDate: string } };

export function TaskScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, error, reload, setData } = useData<One>(`/api/meet/tasks?id=${id}`);
  const [busy, setBusy] = useState("");
  const [sheet, setSheet] = useState<"" | "note" | "help">("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  if (error) return <Screen><Back onBack={onBack} /><p style={{ margin: 0, color: D.muted }}>{error}</p></Screen>;
  if (!data) return <Screen><Back onBack={onBack} /><div style={{ height: 120, borderRadius: 20, background: D.card }} /></Screen>;
  const t = data.task;
  const today = data.today;
  const lateDays = t.dueDate && t.dueDate < today ? Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${t.dueDate}T12:00:00Z`).getTime()) / 86400_000) : 0;
  const done = t.status === "done";

  async function act(action: string, extra: object = {}, after = "") {
    setBusy(action);
    const r = await send("/api/meet/tasks", { id, action, ...extra });
    setBusy("");
    if (!r.ok) { setMsg(r.data.error || "Couldn't save that"); return false; }
    if (after) setMsg(after);
    reload();
    return true;
  }
  function step(i: number, on: boolean) {
    setData((d) => (d ? { ...d, task: { ...d.task, steps: d.task.steps.map((s, j) => (j === i ? { ...s, done: on } : s)) } } : d));
    send("/api/meet/tasks", { id, action: "step", index: i, done: on });
  }
  async function photo(f: File | undefined) {
    if (!f) return;
    setBusy("photo");
    setMsg("");
    try {
      const up = await uploadFile("tasks", f);
      await act("photo", { photoPath: up.path }, "Photo added.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't add the photo");
    }
    setBusy("");
  }
  async function saveSheet() {
    const ok = sheet === "help" ? await act("help", { note: text }, "Sent. A manager will get back to you.") : await act("note", { note: text }, "Note saved.");
    if (ok) { setSheet(""); setText(""); }
  }
  const by = t.quoteBy || t.createdBy;
  const byCol = personColour(by.length);

  return (
    <Screen>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
        <button onClick={onBack} aria-label="Back to my tasks" style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: D.chip, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="arrow_back" size={22} /></button>
        {done ? <span style={{ marginLeft: "auto", height: 30, padding: "0 12px", borderRadius: 15, background: "rgba(22,163,74,0.18)", color: "#86efac", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="check_circle" size={16} fill />Done</span>
          : lateDays > 0 ? <span style={{ marginLeft: "auto", height: 30, padding: "0 12px", borderRadius: 15, background: D.redBg, color: D.red, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><Icon name="schedule" size={16} />Overdue by {lateDays} day{lateDays === 1 ? "" : "s"}</span>
          : t.dueDate ? <span style={{ marginLeft: "auto", height: 30, padding: "0 12px", borderRadius: 15, background: D.chip, color: D.soft, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="schedule" size={16} />Due {dayLong(t.dueDate)}</span> : null}
      </div>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.02em", textDecoration: done ? "line-through" : "none", color: done ? D.muted : "#ffffff" }}>{t.title}</h1>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: D.muted }}>{[t.dueDate ? `${lateDays ? "Was due" : "Due"} ${dayLong(t.dueDate)}` : "", t.meeting ? `from ${t.meeting}${t.meetingDate ? ` on ${dayLong(t.meetingDate.slice(0, 10))}` : ""}` : t.createdBy ? `from ${t.createdBy}` : ""].filter(Boolean).join(" · ")}</p>
      </div>
      {t.quote && (
        <figure style={{ margin: 0, borderRadius: 20, background: D.card, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <figcaption style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: D.muted }}><Icon name="format_quote" size={16} fill style={{ color: D.peach }} />What was said in the meeting</figcaption>
          <blockquote style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>&ldquo;{t.quote}&rdquo;</blockquote>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {by && <span style={{ width: 26, height: 26, borderRadius: "50%", background: byCol.bg, color: byCol.fg, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(by)}</span>}
            <span style={{ fontSize: 13 }}>{by}{t.quoteMs != null ? ` · ${Math.floor(t.quoteMs / 60000)}:${String(Math.floor((t.quoteMs % 60000) / 1000)).padStart(2, "0")} in` : ""}</span>
            {t.meetingId && <a href={`/meet?notes=${t.meetingId}`} style={{ marginLeft: "auto", height: 34, padding: "0 12px", borderRadius: 17, background: "#2a2a2a", color: "#ffffff", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}><Icon name="play_arrow" size={18} fill />Listen</a>}
          </div>
        </figure>
      )}
      {t.steps.length > 0 && (
        <section aria-labelledby="st-h" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 id="st-h" style={{ margin: 0, fontSize: 15, fontWeight: 500, color: D.soft }}>Steps</h2>
          {t.steps.map((s, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: "0 14px", borderRadius: 16, background: D.card, cursor: "pointer" }}>
              <input type="checkbox" checked={s.done} disabled={done} onChange={(e) => step(i, e.target.checked)} style={{ width: 20, height: 20, accentColor: D.orange }} />
              <span style={{ color: s.done ? D.muted : "#ffffff", textDecoration: s.done ? "line-through" : "none" }}>{s.text}</span>
            </label>
          ))}
        </section>
      )}
      {t.photo && <img src={t.photo} alt="Photo added to this task" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 18 }} />}
      {t.note && <p style={{ margin: 0, padding: "12px 14px", borderRadius: 16, background: D.card, fontSize: 14, color: D.soft }}><span style={{ color: D.muted }}>Your note: </span>{t.note}</p>}
      {t.status === "help" && <p style={{ margin: 0, padding: "12px 14px", borderRadius: 16, background: "#24160f", fontSize: 14, color: "#fed7aa" }}>You asked for help: {t.helpNote}</p>}
      {!done && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => photoRef.current?.click()} disabled={busy === "photo"} style={dashedBtn}><Icon name="photo_camera" size={20} />{busy === "photo" ? "Adding…" : t.photo ? "New photo" : "Add photo"}</button>
          <button onClick={() => { setText(t.note); setSheet("note"); }} style={dashedBtn}><Icon name="edit_note" size={20} />{t.note ? "Edit note" : "Add a note"}</button>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { photo(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      )}
      {msg && <p role="status" style={{ margin: 0, fontSize: 13, color: D.soft }}>{msg}</p>}
      {sheet && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 20, background: D.card }}>
          <label htmlFor="t-sheet" style={{ fontSize: 13, color: D.muted }}>{sheet === "help" ? "What do you need? (help, more time, something else)" : "Note for the manager"}</label>
          <textarea id="t-sheet" rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={sheet === "help" ? 500 : 1000} style={{ ...field, background: D.pill }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setSheet("")} style={{ flex: 1, height: 44, border: 0, borderRadius: 22, background: D.pill, color: "#ffffff", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>Cancel</button>
            <button onClick={saveSheet} disabled={!!busy || (sheet === "help" && !text.trim())} style={{ flex: 1, height: 44, border: 0, borderRadius: 22, background: "#ffffff", color: D.bg, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: sheet === "help" && !text.trim() ? 0.5 : 1 }}>{sheet === "help" ? "Send" : "Save note"}</button>
          </div>
        </div>
      )}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {done ? (
          <button onClick={() => act("reopen", {}, "Back on your list.")} disabled={!!busy} style={{ ...bigWhite, background: D.pill, color: "#ffffff" }}>Not done after all</button>
        ) : (
          <>
            <button onClick={async () => { if (await act("done")) onBack(); }} disabled={!!busy} style={bigWhite}><Icon name="check_circle" size={22} fill />{busy === "done" ? "Saving…" : "Mark as done"}</button>
            {!sheet && <button onClick={() => { setText(""); setSheet("help"); }} style={{ height: 44, border: 0, borderRadius: 22, background: "transparent", color: D.soft, fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>I need help or more time</button>}
          </>
        )}
      </div>
    </Screen>
  );
}
