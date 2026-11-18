"use client";

import { useState, type CSSProperties } from "react";
import { Icon, personColourLight, initial, firstName } from "../ui";
import { ManagerFrame, PageHead, PAGE as C, panel, useJson, postJson } from "../ManagerShell";

/* 7 · Tasks. Values from the design canvas. */

type Step = { text: string; done: boolean };
type Task = {
  id: string; title: string; ownerId: number; owner: string; dueDate: string; status: string; steps: Step[]; stepsDone: number;
  meetingId: string | null; meeting: string; quote: string; quoteBy: string; note: string; helpNote: string; hasPhoto: boolean;
  createdBy: string; doneAt: string; nudgedAt: string; at: string;
};
type Data = { today: string; people: { id: number; name: string }[]; tasks: Task[] };

const DAY = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const DM = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
const addDays = (d: string, n: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
const field: CSSProperties = { height: 42, border: `1px solid ${C.field}`, borderRadius: 14, padding: "0 12px", fontFamily: "inherit", fontSize: 14, color: C.ink, background: "#ffffff", boxSizing: "border-box" };

type Status = "open" | "done" | "suggested";

export default function TasksPage() {
  const { data, error, reload, setData } = useJson<Data>("/api/meet/tasks?manage=1");
  const [status, setStatus] = useState<Status>("open");
  const [who, setWho] = useState<number | 0>(0);
  const [openId, setOpenId] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  const today = data?.today || "";
  const monday = today ? addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7)) : "";
  const sunday = monday ? addDays(monday, 6) : "";
  const all = data?.tasks || [];
  const open = all.filter((t) => t.status === "open" || t.status === "help");
  const stats = {
    open: open.length,
    overdue: open.filter((t) => t.dueDate && t.dueDate < today).length,
    dueWeek: open.filter((t) => t.dueDate >= today && t.dueDate <= sunday).length,
    doneWeek: all.filter((t) => t.status === "done" && t.doneAt && t.doneAt.slice(0, 10) >= monday).length,
  };
  const inStatus = all.filter((t) => (status === "open" ? t.status === "open" || t.status === "help" : t.status === status));
  const shown = inStatus.filter((t) => !who || t.ownerId === who);
  const chips = Array.from(new Map(inStatus.map((t) => [t.ownerId, t.owner])).entries()).map(([id, name]) => ({ id, name, n: inStatus.filter((t) => t.ownerId === id).length })).sort((a, b) => b.n - a.n);

  async function act(t: Task, action: string, extra: object = {}, done = "") {
    setBusy(t.id + action);
    setNote("");
    const r = await postJson("/api/meet/tasks", { id: t.id, action, ...extra });
    setBusy("");
    if (!r.ok) { setNote(r.data.error || "Couldn't do that"); return false; }
    if (done) setNote(done);
    reload();
    return true;
  }

  // Ticking off shows straight away; the list refreshes after.
  function tick(t: Task, on: boolean) {
    setData((d) => (d ? { ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status: on ? "done" : "open", doneAt: on ? new Date().toISOString() : "" } : x)) } : d));
    act(t, on ? "done" : "reopen");
  }

  const groups: [string, Task[], string][] = status !== "open"
    ? [[status === "done" ? "Done in the last 30 days" : "Spotted in meetings, not given out yet", shown.sort((a, b) => (b.doneAt || b.at).localeCompare(a.doneAt || a.at)), C.sub]]
    : [
        ["Overdue", shown.filter((t) => t.dueDate && t.dueDate < today), C.coral],
        ["This week", shown.filter((t) => t.dueDate >= today && t.dueDate <= sunday), C.sub],
        ["Later", shown.filter((t) => t.dueDate > sunday), C.sub],
        ["No due date", shown.filter((t) => !t.dueDate), C.sub],
      ];

  const avatar = (id: number, name: string, size = 26) => {
    const col = personColourLight(id);
    return <span style={{ width: size, height: size, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{initial(name)}</span>;
  };
  const current = all.find((t) => t.id === openId) || null;

  return (
    <ManagerFrame current="tasks">
      <PageHead over="From every meeting" title="Tasks">
        <button onClick={() => setCreating(true)} disabled={!data} style={{ height: 40, boxSizing: "border-box", display: "inline-flex", alignItems: "center", gap: 7, padding: "0 18px", border: 0, borderRadius: 20, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}><Icon name="add" size={19} />New task</button>
      </PageHead>
      {note && <p role="status" style={{ margin: "0 4px", fontSize: 13, color: C.body }}>{note}</p>}
      {error ? <p style={{ ...panel, margin: 0, color: C.sub }}>{error}</p> : !data ? <p style={{ ...panel, margin: 0, color: C.sub }}>Loading tasks…</p> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[["Open", stats.open, false], ["Overdue", stats.overdue, stats.overdue > 0], ["Due this week", stats.dueWeek, false], ["Done this week", stats.doneWeek, false]].map(([l, v, hot]) => (
              <div key={String(l)} style={hot ? { borderRadius: 20, background: C.coralBg, padding: 16 } : { borderRadius: 20, background: "#ffffff", padding: 16, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
                <p style={{ margin: 0, fontSize: 13, color: hot ? "#9a3412" : C.sub }}>{l}</p>
                <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em", color: hot ? C.coral : C.ink }}>{v as number}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <div role="group" aria-label="Status" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 20, background: "#ebe7e2" }}>
              {([["open", "Open"], ["done", "Done"], ["suggested", `Waiting to confirm${all.some((t) => t.status === "suggested") ? ` · ${all.filter((t) => t.status === "suggested").length}` : ""}`]] as [Status, string][]).map(([k, l]) => (
                <button key={k} aria-pressed={status === k} onClick={() => { setStatus(k); setWho(0); }} style={{ height: 32, padding: "0 14px", border: 0, borderRadius: 16, background: status === k ? "#ffffff" : "transparent", fontSize: 13, fontWeight: status === k ? 600 : 500, fontFamily: "inherit", color: C.ink, boxShadow: status === k ? "0 1px 2px rgba(20,20,20,0.08)" : "none", cursor: "pointer" }}>{l}</button>
              ))}
            </div>
            <span style={{ width: 1, height: 24, background: "#ddd7d0", margin: "0 4px" }} />
            <button aria-pressed={!who} onClick={() => setWho(0)} style={{ height: 36, padding: "0 14px", border: 0, borderRadius: 18, background: !who ? C.ink : "#ffffff", color: !who ? "#ffffff" : C.ink, fontSize: 13, fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap", cursor: "pointer" }}>Everyone</button>
            {chips.map((p) => (
              <button key={p.id} aria-pressed={who === p.id} onClick={() => setWho(who === p.id ? 0 : p.id)} style={{ height: 36, padding: "0 6px 0 4px", border: 0, borderRadius: 18, background: who === p.id ? C.ink : "#ffffff", color: who === p.id ? "#ffffff" : C.ink, fontSize: 13, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", cursor: "pointer" }}>
                {avatar(p.id, p.name, 28)}{firstName(p.name)}<span style={{ padding: "0 6px", color: who === p.id ? "#d6d3d1" : C.sub }}>{p.n}</span>
              </button>
            ))}
          </div>

          <section aria-label="Tasks" style={{ borderRadius: 24, background: "#ffffff", padding: 8, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
            {shown.length === 0 && <p style={{ margin: 0, padding: 14, color: C.sub, fontSize: 13 }}>{status === "suggested" ? "Nothing waiting. Tasks spotted in meeting notes appear here for you to confirm." : status === "done" ? "Nothing done in the last 30 days." : "No open tasks. Tap New task, or confirm ones from meeting notes."}</p>}
            {groups.filter(([, list]) => list.length).map(([title, list, colour], gi) => (
              <div key={title}>
                <p style={{ margin: 0, padding: gi === 0 ? "12px 12px 6px" : "16px 12px 6px", fontSize: 12, fontWeight: 600, color: colour }}>{title}</p>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  {list.map((t) => {
                    const late = (t.status === "open" || t.status === "help") && t.dueDate && t.dueDate < today;
                    const meta = [t.meeting, t.meetingId ? "" : "", DM(t.at), t.steps.length ? `${t.stepsDone} of ${t.steps.length} steps done` : "", t.status === "help" ? "asked for help or more time" : ""].filter(Boolean).join(" · ");
                    return (
                      <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, borderRadius: 16, background: late ? "#fff8f5" : "transparent", flexWrap: "wrap" }}>
                        {t.status === "suggested" ? <Icon name="auto_awesome" size={20} fill style={{ color: C.accent }} />
                          : <input type="checkbox" checked={t.status === "done"} onChange={(e) => tick(t, e.target.checked)} aria-label={`Mark done: ${t.title}`} style={{ width: 22, height: 22, accentColor: C.ink, flex: "none" }} />}
                        <button onClick={() => setOpenId(t.id)} style={{ flex: "1 1 220px", minWidth: 0, border: 0, background: "transparent", padding: 0, textAlign: "left", fontFamily: "inherit", color: C.ink, cursor: "pointer" }}>
                          <span style={{ display: "block", fontWeight: 500, textDecoration: t.status === "done" ? "line-through" : "none", color: t.status === "done" ? C.sub : C.ink }}>{t.title}</span>
                          <span style={{ display: "block", marginTop: 2, fontSize: 12, color: t.status === "help" ? C.coral : C.sub }}>{meta}</span>
                        </button>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>{avatar(t.ownerId, t.owner)}{firstName(t.owner)}</span>
                        <span style={{ width: 110, textAlign: "right", fontSize: 13, color: late ? C.coral : C.body, fontWeight: late ? 500 : 400 }}>{t.dueDate ? DAY(t.dueDate) : "No date"}</span>
                        {t.status === "suggested" ? (
                          <span style={{ display: "inline-flex", gap: 6 }}>
                            <button onClick={() => act(t, "confirm", {}, `Given to ${firstName(t.owner)}.`)} disabled={!!busy} style={{ height: 34, padding: "0 12px", border: 0, borderRadius: 17, background: C.ink, color: "#ffffff", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>Confirm</button>
                            <button onClick={() => act(t, "dismiss")} disabled={!!busy} aria-label={`Dismiss ${t.title}`} style={{ width: 34, height: 34, border: 0, borderRadius: 17, background: C.page, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ink }}><Icon name="close" size={18} /></button>
                          </span>
                        ) : late ? (
                          <button aria-label={`Nudge ${firstName(t.owner)}`} title={t.nudgedAt ? `Nudged ${DM(t.nudgedAt)}` : "Send a nudge"} onClick={() => act(t, "nudge", {}, `Nudge sent to ${firstName(t.owner)}.`)} disabled={!!busy} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ink, boxShadow: "0 1px 2px rgba(20,20,20,0.08)" }}><Icon name="notifications" size={18} /></button>
                        ) : <span style={{ width: 36 }} />}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
      <p style={{ margin: "0 4px", fontSize: 12, color: C.sub }}>Staff tick tasks off on their phone; you see it here straight away.</p>
      {creating && data && <TaskDialog people={data.people} today={today} onClose={() => setCreating(false)} onSaved={(m) => { setCreating(false); setNote(m); reload(); }} />}
      {current && data && <TaskDialog task={current} people={data.people} today={today} onClose={() => setOpenId("")} onSaved={(m) => { setOpenId(""); setNote(m); reload(); }} />}
    </ManagerFrame>
  );
}

/** New task, or open one: edit it, see the meeting quote and what the person added. */
function TaskDialog({ task, people, today, onClose, onSaved }: { task?: Task; people: { id: number; name: string }[]; today: string; onClose: () => void; onSaved: (msg: string) => void }) {
  const [title, setTitle] = useState(task?.title || "");
  const [owner, setOwner] = useState<number | "">(task?.ownerId || "");
  const [due, setDue] = useState(task?.dueDate || "");
  const [steps, setSteps] = useState(task ? task.steps.map((s) => s.text).join("\n") : "");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const detail = useJson<{ task: Task & { photo: string } }>(task ? `/api/meet/tasks?id=${task.id}` : null).data?.task;

  async function save() {
    setBusy("save");
    setErr("");
    const list = steps.split("\n").map((s) => s.trim()).filter(Boolean);
    const r = task
      ? await postJson("/api/meet/tasks", { id: task.id, action: "edit", title, ownerId: owner, dueDate: due, ...(steps !== task.steps.map((s) => s.text).join("\n") ? { steps: list } : {}) })
      : await postJson("/api/meet/tasks", { action: "create", title, ownerId: owner, dueDate: due, steps: list });
    setBusy("");
    if (!r.ok) return setErr(r.data.error || "Couldn't save that");
    const name = firstName(people.find((p) => p.id === owner)?.name || "");
    onSaved(task ? "Task saved." : `Task given to ${name}. They've been told.`);
  }
  async function remove() {
    if (!task || !confirm(`Delete "${task.title}"?`)) return;
    setBusy("delete");
    const r = await postJson("/api/meet/tasks", { id: task.id, action: "delete" });
    setBusy("");
    if (!r.ok) return setErr(r.data.error || "Couldn't delete it");
    onSaved("Task deleted.");
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="td-h" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(40,32,26,0.42)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "50px 16px", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 520, background: "#ffffff", borderRadius: 28, boxShadow: "0 30px 70px -20px rgba(20,20,20,0.45)", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name={task ? "check_circle" : "add_task"} size={22} />
          <h2 id="td-h" style={{ margin: 0, flex: 1, fontSize: 18, fontWeight: 600 }}>{task ? "Task" : "New task"}</h2>
          <button aria-label="Close" onClick={onClose} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: C.page, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ink }}><Icon name="close" size={20} /></button>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.sub }}>What needs doing
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Book the Streatham deep clean" style={field} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.sub }}>Who
            <select value={owner} onChange={(e) => setOwner(e.target.value ? Number(e.target.value) : "")} style={field}>
              <option value="">Pick a person</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.sub }}>Due
            <input type="date" value={due} min={task ? undefined : today} onChange={(e) => setDue(e.target.value)} style={field} />
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.sub }}>Steps (one per line, optional)
          <textarea rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={"Count the dry store\nCount the freezer and fridge\nSend the sheet to Ada"} style={{ ...field, height: "auto", padding: "10px 12px", lineHeight: 1.5, resize: "vertical" }} />
        </label>
        {task && (task.quote || task.helpNote || task.note || detail?.photo) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 16, background: C.page, fontSize: 13 }}>
            {task.quote && <p style={{ margin: 0 }}><span style={{ color: C.sub }}>Said in {task.meeting || "the meeting"}{task.quoteBy ? ` by ${task.quoteBy}` : ""}:</span> &ldquo;{task.quote}&rdquo;</p>}
            {task.helpNote && <p style={{ margin: 0, color: C.coral }}><strong style={{ fontWeight: 600 }}>Asked for help:</strong> {task.helpNote}</p>}
            {task.note && <p style={{ margin: 0 }}><span style={{ color: C.sub }}>Their note:</span> {task.note}</p>}
            {detail?.photo && <a href={detail.photo} target="_blank" rel="noreferrer"><img src={detail.photo} alt="Photo added to the task" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12 }} /></a>}
          </div>
        )}
        {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{err}</p>}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {task && <button onClick={remove} disabled={!!busy} style={{ height: 44, padding: "0 16px", border: 0, borderRadius: 22, background: C.page, color: "#b91c1c", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>Delete</button>}
          <button onClick={onClose} style={{ marginLeft: "auto", height: 44, padding: "0 18px", border: 0, borderRadius: 22, background: C.page, color: C.ink, fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>Cancel</button>
          <button onClick={save} disabled={!!busy || !title.trim() || !owner} style={{ height: 44, padding: "0 20px", border: 0, borderRadius: 22, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", opacity: !title.trim() || !owner ? 0.45 : 1, cursor: "pointer" }}>{busy === "save" ? "Saving…" : task ? "Save" : "Give task"}</button>
        </div>
      </div>
    </div>
  );
}
