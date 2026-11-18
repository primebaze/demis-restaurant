"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon, personColourLight, initial, firstName, BRANCH } from "../ui";
import { ManagerFrame, PageHead, PAGE as C, panel, useJson, postJson } from "../ManagerShell";

/* 28 · Admin: reports inbox. Values from the design canvas. */

type Report = {
  id: string; kind: "problem" | "person"; category: string; body: string; urgent: boolean; branch: string; happenedOn: string; photo: string;
  from: string; fromId: number; about: string; aboutId: number; status: string; reply: string; handledBy: string; handledAt: string; at: string;
};
type Person = { id: number; name: string };

const CATEGORY: Record<string, string> = {
  equipment: "Equipment", stock: "Stock", safety: "Safety", customer: "Customer", hours: "Hours", other: "Other",
  behaviour: "Behaviour", bullying: "Bullying or harassment", timekeeping: "Timekeeping",
};
const catLabel = (r: Report) => (r.kind === "person" && r.category === "safety" ? "Safety or hygiene" : r.kind === "person" && r.category === "other" ? "Something else" : CATEGORY[r.category] || r.category);
/** The first sentence is the headline, as staff don't type a separate title on the phone. */
function headline(body: string) {
  const first = body.split(/(?<=[.!?])\s|\n/)[0].trim();
  return first.length > 90 ? first.slice(0, 87).trimEnd() + "…" : first;
}
function when(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  if (day(d) === day(new Date())) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  if (day(d) === day(new Date(Date.now() - 86400_000))) return "Yesterday";
  if (Date.now() - d.getTime() < 6 * 86400_000) return d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/London" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
}
const full = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const pill = (bg: string, fg: string): CSSProperties => ({ padding: "3px 9px", borderRadius: 999, background: bg, color: fg, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" });
const soft: CSSProperties = { height: 40, padding: "0 16px", border: 0, borderRadius: 20, background: C.page, color: C.ink, fontSize: 14, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" };

type Filter = "open" | "problem" | "person" | "closed";

export default function ReportsPage() {
  const { data, error, reload } = useJson<{ reports: Report[] }>("/api/meet/reports?manage=1");
  const people = useJson<{ people: Person[] }>("/api/meet/tasks?manage=1").data?.people || [];
  const [filter, setFilter] = useState<Filter>("open");
  const [openId, setOpenId] = useState("");
  const [reply, setReply] = useState("");
  const [taskFor, setTaskFor] = useState<number | "">("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const all = data?.reports || [];
  const shown = all.filter((r) => (filter === "closed" ? r.status === "closed" : r.status !== "closed" && (filter === "open" || r.kind === filter)))
    .sort((a, b) => Number(b.urgent && b.status !== "closed") - Number(a.urgent && a.status !== "closed") || b.at.localeCompare(a.at));
  const current = shown.find((r) => r.id === openId) || shown[0] || null;

  // Opening a report marks it as seen.
  useEffect(() => {
    if (!current) return;
    setReply(current.reply || "");
    setTaskOpen(false);
    if (current.status === "new") postJson("/api/meet/reports", { id: current.id, action: "seen" }).then(() => reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  async function act(action: "close" | "reopen") {
    if (!current) return;
    setBusy(action);
    const r = await postJson("/api/meet/reports", { id: current.id, action, reply });
    setBusy("");
    if (!r.ok) return setNote(r.data.error || "Couldn't save that");
    setNote(action === "close" ? (current.fromId ? `Marked as sorted. ${firstName(current.from)} has been told.` : "Marked as sorted.") : "Opened again.");
    reload();
  }

  async function makeTask() {
    if (!current || !taskFor) return;
    setBusy("task");
    const r = await postJson("/api/meet/tasks", { action: "create", title: headline(current.body), ownerId: taskFor, steps: [] });
    setBusy("");
    if (!r.ok) return setNote(r.data.error || "Couldn't make the task");
    setTaskOpen(false);
    setNote(`Task given to ${firstName(people.find((p) => p.id === taskFor)?.name || "")}.`);
  }

  const counts = { open: all.filter((r) => r.status !== "closed").length };
  const tab = (key: Filter, label: string) => (
    <button key={key} aria-pressed={filter === key} onClick={() => { setFilter(key); setOpenId(""); }} style={{ height: 32, padding: "0 14px", border: 0, borderRadius: 16, background: filter === key ? C.ink : "transparent", color: filter === key ? "#ffffff" : C.body, fontSize: 13, fontWeight: filter === key ? 500 : 400, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
  );

  return (
    <ManagerFrame current="reports">
      <PageHead over="Sent from staff phones" title="Reports">
        <div role="group" aria-label="Show" style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 4, borderRadius: 20, background: "#ffffff", boxShadow: "0 1px 2px rgba(20,20,20,0.08)" }}>
          {tab("open", `Open · ${counts.open}`)}{tab("problem", "Problems")}{tab("person", "About a colleague")}{tab("closed", "Closed")}
        </div>
      </PageHead>
      {note && <p role="status" style={{ margin: "0 4px", fontSize: 13, color: C.body }}>{note}</p>}
      {error ? <p style={{ ...panel, margin: 0, color: C.sub }}>{error}</p> : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
          <section aria-label="Reports" style={{ flex: "1 1 320px", maxWidth: 400, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {!data && <p style={{ ...panel, margin: 0, color: C.sub }}>Loading…</p>}
            {data && shown.length === 0 && <p style={{ ...panel, margin: 0, color: C.sub }}>{filter === "closed" ? "Nothing closed yet." : "Nothing waiting. Reports from staff phones land here."}</p>}
            {shown.map((r) => {
              const on = current?.id === r.id;
              const sub = on ? "#bdb8b2" : C.sub;
              return (
                <button key={r.id} aria-current={on ? "true" : undefined} onClick={() => setOpenId(r.id)} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 14, border: 0, borderRadius: 20, background: on ? C.ink : "#ffffff", color: on ? "#ffffff" : C.ink, textAlign: "left", fontFamily: "inherit", cursor: "pointer", boxShadow: on ? "none" : "0 1px 2px rgba(20,20,20,0.05)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                    {r.kind === "person" ? <span style={pill("#ede9fe", "#5b21b6")}><Icon name="lock" size={13} />Private</span>
                      : r.urgent && r.status !== "closed" ? <span style={pill(C.accent, "#ffffff")}>Urgent</span>
                      : <span style={pill(on ? "#2a2723" : C.line, on ? "#e7e2dc" : C.body)}>{catLabel(r)}</span>}
                    <span style={{ fontSize: 12, color: sub, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[r.kind === "person" ? "About a colleague" : r.urgent ? catLabel(r) : "", BRANCH[r.branch] || ""].filter(Boolean).join(" · ")}
                    </span>
                    {r.status === "new" && <span aria-label="New" style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, flex: "none" }} />}
                    <span style={{ marginLeft: "auto", fontSize: 12, color: sub, whiteSpace: "nowrap" }}>{when(r.at)}</span>
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{headline(r.body)}</span>
                  <span style={{ fontSize: 12, color: sub }}>{r.from ? firstName(r.from) : "Sent without a name"}{r.photo ? " · with a photo" : ""}{r.status === "closed" && r.handledBy ? ` · sorted by ${firstName(r.handledBy)}` : ""}</span>
                </button>
              );
            })}
            <p style={{ margin: "4px 6px 0", fontSize: 12, color: C.sub, display: "flex", gap: 6 }}><Icon name="visibility_lock" size={16} />Reports about a colleague are seen only by managers and the owner. The person named never sees them.</p>
          </section>

          {current && (
            <article aria-labelledby="rp-h" style={{ flex: "999 1 440px", minWidth: 0, borderRadius: 24, background: "#ffffff", padding: 20, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                {current.urgent && <span style={{ padding: "4px 10px", borderRadius: 999, background: C.coralBg, color: C.coral, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="priority_high" size={15} fill />Urgent</span>}
                {current.kind === "person" && <span style={{ padding: "4px 10px", borderRadius: 999, background: "#ede9fe", color: "#5b21b6", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="lock" size={14} />Private</span>}
                <span style={{ padding: "4px 10px", borderRadius: 999, background: C.page, fontSize: 12 }}>{catLabel(current)}</span>
                {current.branch && <span style={{ padding: "4px 10px", borderRadius: 999, background: C.page, fontSize: 12 }}>{BRANCH[current.branch]}</span>}
                {current.happenedOn && <span style={{ padding: "4px 10px", borderRadius: 999, background: C.page, fontSize: 12 }}>Happened {new Date(`${current.happenedOn}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</span>}
                <span style={{ marginLeft: "auto", fontSize: 12, color: C.sub }}>{full(current.at)}</span>
              </div>
              <div>
                <h2 id="rp-h" style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{current.kind === "person" ? `About ${current.about}` : headline(current.body)}</h2>
                <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.55, color: C.body, whiteSpace: "pre-wrap" }}>{current.body}</p>
              </div>
              {current.photo && <a href={current.photo} target="_blank" rel="noreferrer"><img src={current.photo} alt={`Photo from ${current.from || "the sender"}`} style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 18, display: "block" }} /></a>}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, background: C.page }}>
                {current.fromId ? (() => { const col = personColourLight(current.fromId); return <span style={{ width: 32, height: 32, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(current.from)}</span>; })()
                  : <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#ede9fe", color: "#5b21b6", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="visibility_off" size={17} /></span>}
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 500 }}>{current.from || "Sent without a name"}</span>
                  <span style={{ display: "block", fontSize: 12, color: C.sub }}>{current.fromId ? "Gets your note when you mark it sorted" : "They can't be replied to"}</span>
                </span>
                {current.fromId > 0 && current.status !== "closed" && <button onClick={() => replyRef.current?.focus()} style={{ height: 34, padding: "0 14px", border: 0, borderRadius: 17, background: "#ffffff", fontSize: 13, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", color: C.ink }}><Icon name="chat" size={17} />Reply</button>}
              </div>
              {current.status === "closed" ? (
                <p style={{ margin: 0, padding: 12, borderRadius: 16, background: "#ecfdf5", color: "#065f46", fontSize: 14 }}>
                  Sorted by {firstName(current.handledBy) || "a manager"}{current.handledAt ? ` · ${full(current.handledAt)}` : ""}{current.reply ? `: ${current.reply}` : ""}
                </p>
              ) : (
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.sub }}>{current.fromId ? `Note for the team (${firstName(current.from)} sees it)` : "Note for the team"}
                  <textarea ref={replyRef} rows={2} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={1000} placeholder="What's been done about it?" style={{ border: `1px solid ${C.field}`, borderRadius: 14, padding: "10px 12px", fontFamily: "inherit", fontSize: 14, color: C.ink, resize: "vertical" }} />
                </label>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {current.kind === "problem" && current.status !== "closed" && (
                  taskOpen ? (
                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <select value={taskFor} onChange={(e) => setTaskFor(e.target.value ? Number(e.target.value) : "")} aria-label="Who does it" style={{ height: 40, borderRadius: 20, border: `1px solid ${C.field}`, padding: "0 12px", fontFamily: "inherit", fontSize: 14, background: "#ffffff" }}>
                        <option value="">Who does it?</option>
                        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button onClick={makeTask} disabled={!taskFor || busy === "task"} style={{ ...soft, background: C.ink, color: "#ffffff", opacity: taskFor ? 1 : 0.45 }}>{busy === "task" ? "Giving…" : "Give task"}</button>
                    </span>
                  ) : <button onClick={() => setTaskOpen(true)} style={soft}><Icon name="add_task" size={19} />Make it a task</button>
                )}
                {current.status === "closed"
                  ? <button onClick={() => act("reopen")} disabled={!!busy} style={{ ...soft, marginLeft: "auto" }}>Open again</button>
                  : <button onClick={() => act("close")} disabled={!!busy} style={{ marginLeft: "auto", height: 40, padding: "0 18px", border: 0, borderRadius: 20, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}><Icon name="check" size={19} />{busy === "close" ? "Saving…" : "Mark as sorted"}</button>}
              </div>
            </article>
          )}
        </div>
      )}
      <p style={{ margin: "0 4px", fontSize: 12, color: C.sub }}>Every report sends a notification to the managers. Reports about a manager are never shown to that manager.</p>
    </ManagerFrame>
  );
}
