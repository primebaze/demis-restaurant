"use client";

import { useRef, useState } from "react";
import { Icon, personColour, initial, firstName, BRANCH, uploadFile } from "../ui";
import { D, Screen, Back, Chip, bigWhite, dashedBtn, field, mono, useData, send, dayShort, dayNum, dayFull, londonToday, addDays, fmtHM } from "./kit";

/* 18 · Me and my hours, 23 · fix my hours, 21 · report a problem, 22 · a concern about a colleague. */

type Hours = {
  today: string;
  week: { date: string; hours: number; future: boolean; today: boolean; planned: { start: string; end: string; branch: string }[] }[];
  weekTotal: number; lastWeek: number; weeks: { monday: string; hours: number }[];
  recent: { date: string; in: string; out: string | null; hours: number; adjusted: boolean; branch: string; fix: { status: string; start: string; end: string; by: string } | null }[];
};
export type FixTarget = { date: string; in: string; out: string | null; branch: string };

const LETTER = ["M", "T", "W", "T", "F", "S", "S"];

export function MeScreen({ me, onSettings, onFix, onNotes, onReport }: {
  me: { person: { id: number; name: string; role: string }; branch: string };
  onSettings: () => void; onFix: (t: FixTarget) => void; onNotes: () => void; onReport: () => void;
}) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const { data, error } = useData<Hours>("/api/meet/hours");
  const col = personColour(me.person.id);
  const role = me.person.role ? me.person.role[0].toUpperCase() + me.person.role.slice(1) : "";

  const bars = period === "week"
    ? (data?.week || []).map((d, i) => ({ key: d.date, label: LETTER[i], value: d.hours, planned: d.future && d.planned.length > 0, plannedHours: d.planned.reduce((n, s) => n + spanH(s.start, s.end), 0), today: d.today, aria: `${dayShort(d.date)} ${d.future ? (d.planned.length ? "on the rota" : "nothing yet") : `${Math.round(d.hours * 10) / 10} hours`}` }))
    : (data?.weeks || []).map((w) => ({ key: w.monday, label: `${dayNum(w.monday)}`, value: w.hours, planned: false, plannedHours: 0, today: w.monday === data?.week[0]?.date, aria: `Week of ${dayNum(w.monday)}: ${Math.round(w.hours)} hours` }));
  const max = Math.max(period === "week" ? 9 : 45, ...bars.map((b) => Math.max(b.value, b.plannedHours)));
  const total = period === "week" ? data?.weekTotal || 0 : (data?.weeks || []).reduce((n, w) => n + w.hours, 0);
  const nextPlanned = (data?.week || []).find((d) => d.future && d.planned.length);
  const foot = [nextPlanned ? `${dayFull(nextPlanned.date).split(" ")[0]} ${nextPlanned.planned[0].start} – ${nextPlanned.planned[0].end} is on the rota.` : "", data ? `Last week: ${Math.round(data.lastWeek * 10) / 10}h.` : ""].filter(Boolean).join(" ");

  return (
    <Screen gap={14}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 6 }}>
        <span style={{ width: 52, height: 52, borderRadius: "50%", background: col.bg, color: col.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600 }}>{initial(me.person.name)}</span>
        <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>{firstName(me.person.name)}</p><p style={{ margin: "2px 0 0", fontSize: 13, color: D.muted }}>{[role, BRANCH[me.branch]].filter(Boolean).join(" · ")}</p></div>
        <button aria-label="Settings" onClick={onSettings} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: D.chip, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="settings" size={22} /></button>
      </div>

      <section aria-labelledby="hrs-h" style={{ borderRadius: 22, background: D.card, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <h2 id="hrs-h" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: D.muted }}>{period === "week" ? "Hours this week" : "Hours, last 5 weeks"}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em" }}>{data ? fmtHM(total) : "–"}</p>
          </div>
          <div role="group" aria-label="Period" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 16, background: D.raised }}>
            {(["week", "month"] as const).map((p) => <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)} style={{ height: 28, padding: "0 10px", border: 0, borderRadius: 13, background: period === p ? "#ffffff" : "transparent", color: period === p ? D.bg : "#ffffff", fontSize: 12, fontWeight: period === p ? 600 : 400, fontFamily: "inherit", cursor: "pointer" }}>{p === "week" ? "Week" : "Month"}</button>)}
          </div>
        </div>
        <div role="img" aria-label={`Hours: ${bars.map((b) => b.aria).join(", ")}`} style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))`, gap: 8, alignItems: "end", height: 96 }}>
          {bars.map((b) => (
            <div key={b.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              {b.planned ? <span style={{ width: "100%", height: Math.max(8, Math.round((b.plannedHours / max) * 72)), borderRadius: 8, border: "1.5px dashed #404040", boxSizing: "border-box" }} />
                : b.value > 0 ? <span style={{ width: "100%", height: Math.max(8, Math.round((b.value / max) * 72)), borderRadius: 8, background: b.today ? D.orange : "#3a3a3a" }} />
                : <span style={{ width: "100%", height: 4, borderRadius: 4, background: "#2a2a2a" }} />}
              <span style={{ fontSize: 11, color: b.today ? "#ffffff" : D.muted, fontWeight: b.today ? 600 : 400 }}>{b.label}</span>
            </div>
          ))}
        </div>
        {error ? <p style={{ margin: 0, fontSize: 12, color: D.muted }}>{error}</p> : foot && <p style={{ margin: 0, fontSize: 12, color: D.muted }}>{foot}</p>}
      </section>

      <section aria-labelledby="sh-h" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline" }}><h2 id="sh-h" style={{ margin: 0, fontSize: 15, fontWeight: 500, color: D.soft }}>Recent shifts</h2><a href="/meet?tab=rota" style={{ marginLeft: "auto", fontSize: 13, color: D.muted, textDecoration: "none" }}>Rota</a></div>
        {data && data.recent.length === 0 && <p style={{ margin: 0, padding: "12px 14px", borderRadius: 18, background: D.card, color: D.muted, fontSize: 13 }}>No clock-ins in the last three weeks.</p>}
        {(data?.recent || []).slice(0, 6).map((r) => {
          const missed = !r.out && r.date < (data?.today || londonToday()) && !r.adjusted;
          const line = r.fix?.status === "asked" ? { text: "Fix sent, waiting for a manager", colour: D.amber }
            : r.fix?.status === "approved" ? { text: `${missed || !r.out ? "Missed clock-out, f" : "F"}ixed by ${r.fix.by || "a manager"}`, colour: D.amber }
            : r.fix?.status === "declined" ? { text: "Fix not approved", colour: D.red }
            : missed ? { text: "No clock-out · tap to fix", colour: D.red }
            : { text: BRANCH[r.branch] || "Tap if the times are wrong", colour: D.muted };
          const shown = r.fix?.status === "approved" ? `${r.fix.start} – ${r.fix.end}` : `${r.in || "–"} – ${r.out || "none"}`;
          return (
            <button key={r.date + r.in} onClick={() => onFix({ date: r.date, in: r.in, out: r.out, branch: r.branch })} disabled={r.fix?.status === "asked"} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: 0, borderRadius: 18, background: D.card, color: "#ffffff", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
              <div style={{ width: 44, textAlign: "center" }}><p style={{ margin: 0, fontSize: 11, color: D.muted }}>{dayShort(r.date)}</p><p style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{dayNum(r.date)}</p></div>
              <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontFamily: mono, fontSize: 13 }}>{shown}</p><p style={{ margin: "2px 0 0", fontSize: 12, color: line.colour }}>{line.text}</p></div>
              <span style={{ fontWeight: 600 }}>{missed && !r.fix ? "–" : fmtHM(r.hours)}</span>
            </button>
          );
        })}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <button onClick={onNotes} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 14, border: 0, borderRadius: 18, background: D.card, color: "#ffffff", fontFamily: "inherit", cursor: "pointer" }}><Icon name="auto_stories" size={22} /><span style={{ fontSize: 14, fontWeight: 500 }}>Meeting notes</span></button>
        <button onClick={onReport} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 14, border: 0, borderRadius: 18, background: D.card, color: "#ffffff", fontFamily: "inherit", cursor: "pointer" }}><Icon name="report" size={22} style={{ color: D.peach }} /><span style={{ fontSize: 14, fontWeight: 500 }}>Report something</span></button>
      </div>
    </Screen>
  );
}

const spanH = (a: string, b: string) => { let m = Number(b.slice(0, 2)) * 60 + Number(b.slice(3)) - (Number(a.slice(0, 2)) * 60 + Number(a.slice(3))); if (m <= 0) m += 1440; return m / 60; };
const REASONS = ["Forgot to clock out", "Forgot to clock in", "Stayed late", "Tablet not working"];

/** 23 · Fix my hours. */
export function HoursFixScreen({ target, onBack }: { target: FixTarget; onBack: () => void }) {
  const [start, setStart] = useState(target.in || "");
  const [end, setEnd] = useState(target.out || "");
  const [reason, setReason] = useState(!target.out ? REASONS[0] : !target.in ? REASONS[1] : "");
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const ok = /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && start !== end;
  const total = ok ? spanH(start, end) : 0;
  const changed = start !== target.in || end !== (target.out || "");

  async function submit() {
    setBusy(true);
    setErr("");
    const r = await send("/api/meet/hours", { date: target.date, start, end, wasStart: target.in, reason: [reason, extra.trim()].filter(Boolean).join(". ") });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error || "Couldn't send that");
    setSent(true);
  }
  if (sent) {
    return (
      <Screen>
        <Back onBack={onBack} title="Fix my hours" />
        <div style={{ padding: "18px 16px", borderRadius: 20, background: "#172e2a", color: "#ccfbf1", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Icon name="task_alt" size={22} style={{ color: "#5eead4" }} />
          <p style={{ margin: 0, lineHeight: 1.5 }}>Sent. A manager checks it, and you&rsquo;ll get a notification when it&rsquo;s approved.</p>
        </div>
        <button onClick={onBack} style={{ ...bigWhite, marginTop: "auto" }}>Done</button>
      </Screen>
    );
  }
  const timeBox = (label: string, value: string, set: (v: string) => void, hot: boolean) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 14px", borderRadius: 18, background: D.card, boxShadow: hot ? `inset 0 0 0 1.5px ${D.orange}` : "none" }}>
      <span style={{ fontSize: 12, color: hot ? D.peach : D.muted }}>{label}</span>
      <input type="time" value={value} onChange={(e) => set(e.target.value)} aria-label={label} style={{ border: 0, background: "transparent", color: "#ffffff", fontFamily: mono, fontSize: 22, padding: 0, colorScheme: "dark", width: "100%" }} />
    </label>
  );
  return (
    <Screen>
      <Back onBack={onBack} title="Fix my hours" sub={`${dayFull(target.date)}${BRANCH[target.branch] ? ` · ${BRANCH[target.branch]}` : ""}`} />
      <section aria-labelledby="rec-h" style={{ borderRadius: 20, background: D.card, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 id="rec-h" style={{ margin: 0, fontSize: 12, fontWeight: 500, color: D.muted }}>What the clock-in recorded</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: mono, fontSize: 18, color: target.in ? "#ffffff" : D.red }}>{target.in || "No clock-in"}</span><Icon name="arrow_forward" size={18} style={{ color: D.faint }} />
          <span style={{ fontFamily: mono, fontSize: 18, color: target.out ? "#ffffff" : D.red }}>{target.out || "No clock-out"}</span>
        </div>
      </section>
      <section aria-labelledby="fix-h" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="fix-h" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: D.muted }}>What it should be</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {timeBox("Clocked in", start, setStart, !target.in || start !== target.in)}
          {timeBox("Clocked out", end, setEnd, !target.out || end !== (target.out || ""))}
        </div>
        <p style={{ margin: 0, display: "flex", justifyContent: "space-between", padding: "0 4px", fontSize: 14 }}><span style={{ color: D.muted }}>New total</span><strong style={{ fontWeight: 600 }}>{ok ? fmtHM(total) : "–"}</strong></p>
      </section>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="hf-why" style={{ fontSize: 13, color: D.muted }}>Why?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{REASONS.map((r) => <Chip key={r} on={reason === r} onClick={() => setReason(reason === r ? "" : r)} style={{ fontSize: 13 }}>{r}</Chip>)}</div>
        <input id="hf-why" value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={200} placeholder="Anything else? (optional)" style={{ height: 48, boxSizing: "border-box", padding: "0 14px", border: 0, borderRadius: 16, background: D.card, color: "#ffffff", fontSize: 14, fontFamily: "inherit" }} />
      </div>
      {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: D.red }}>{err}</p>}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={submit} disabled={busy || !ok || !changed || !(reason || extra.trim())} style={{ ...bigWhite, opacity: ok && changed && (reason || extra.trim()) ? 1 : 0.5 }}>{busy ? "Sending…" : "Send for approval"}</button>
        <p style={{ margin: 0, textAlign: "center", fontSize: 12, color: D.muted }}>A manager checks it. You&rsquo;ll see &ldquo;fixed&rdquo; on this shift once it&rsquo;s approved.</p>
      </div>
    </Screen>
  );
}

const PROBLEMS: [string, string, string][] = [["equipment", "Equipment", "build"], ["stock", "Stock", "inventory_2"], ["safety", "Safety", "health_and_safety"], ["customer", "Customer", "sentiment_dissatisfied"], ["hours", "My hours", "schedule"], ["other", "Other", ""]];

/** 21 · Report a problem (with the switch to 22 · a colleague). */
export function ReportScreen({ branch, onBack, onPerson }: { branch: string; onBack: () => void; onPerson: () => void }) {
  const [cat, setCat] = useState("equipment");
  const [text, setText] = useState("");
  const [where, setWhere] = useState(branch === "streatham" || branch === "cricklewood" ? branch : "cricklewood");
  const [urgent, setUrgent] = useState(false);
  const [photo, setPhoto] = useState<{ path: string; preview: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function addPhoto(f: File | undefined) {
    if (!f) return;
    setBusy("photo");
    try { const up = await uploadFile("reports", f); setPhoto({ path: up.path, preview: URL.createObjectURL(f) }); } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't add the photo"); }
    setBusy("");
  }
  async function submit() {
    setBusy("send");
    setErr("");
    const r = await send("/api/meet/reports", { kind: "problem", category: cat, body: text, urgent, branch: where, photoPath: photo?.path || "" });
    setBusy("");
    if (!r.ok) return setErr(r.data.error || "Couldn't send that");
    setSent(true);
  }
  if (sent) return <Sent onBack={onBack} text="Sent to the managers. You'll get an update here when it's sorted." />;
  return (
    <Screen>
      <Back onBack={onBack} title="Report something" />
      <div role="radiogroup" aria-label="What are you reporting?" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <button role="radio" aria-checked="true" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 14, border: 0, borderRadius: 20, background: "#ffffff", color: D.bg, textAlign: "left", fontFamily: "inherit" }}>
          <Icon name="report" size={24} fill style={{ color: "#e2552b" }} /><span style={{ fontSize: 15, fontWeight: 600 }}>A problem</span><span style={{ fontSize: 12, color: "#57534e" }}>Equipment, stock, safety, a customer</span>
        </button>
        <button role="radio" aria-checked="false" onClick={onPerson} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 14, border: 0, borderRadius: 20, background: D.card, color: "#ffffff", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
          <Icon name="shield_person" size={24} style={{ color: "#c4b5fd" }} /><span style={{ fontSize: 15, fontWeight: 600 }}>A colleague</span><span style={{ fontSize: 12, color: D.muted }}>Private, managers only</span>
        </button>
      </div>
      <fieldset style={{ margin: 0, padding: 0, border: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <legend style={{ fontSize: 13, color: D.muted, marginBottom: 8 }}>What kind of problem?</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{PROBLEMS.map(([k, l, i]) => <Chip key={k} on={cat === k} onClick={() => setCat(k)} style={{ fontSize: 13, padding: "0 14px" }}>{i && <Icon name={i} size={17} />}{l}</Chip>)}</div>
      </fieldset>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="r-what" style={{ fontSize: 13, color: D.muted }}>What&rsquo;s wrong?</label>
        <textarea id="r-what" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder={cat === "hours" ? "Which day, and what's wrong with your hours?" : "Say what's wrong and where"} style={field} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => (photo ? setPhoto(null) : ref.current?.click())} disabled={busy === "photo"} style={dashedBtn}>
          {photo ? <img src={photo.preview} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} /> : <Icon name="photo_camera" size={20} />}{busy === "photo" ? "Adding…" : photo ? "Remove photo" : "Add photo"}
        </button>
        <button onClick={() => setWhere(where === "cricklewood" ? "streatham" : "cricklewood")} aria-label={`Branch: ${BRANCH[where]}. Tap to change`} style={{ flex: 1, height: 48, border: 0, borderRadius: 16, background: D.card, color: "#ffffff", fontSize: 14, fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}><Icon name="storefront" size={20} />{BRANCH[where]}</button>
        <input ref={ref} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "0 14px", borderRadius: 18, background: "#24160f", cursor: "pointer" }}>
        <Icon name="priority_high" size={22} fill style={{ color: "#fb923c" }} />
        <span style={{ flex: 1, fontSize: 14 }}>Urgent: needs fixing today</span>
        <input type="checkbox" role="switch" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} style={{ width: 22, height: 22, accentColor: D.orange }} />
      </label>
      {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: D.red }}>{err}</p>}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={submit} disabled={!!busy || text.trim().length < 3} style={{ ...bigWhite, opacity: text.trim().length < 3 ? 0.5 : 1 }}>{busy === "send" ? "Sending…" : "Send to managers"}</button>
        <p style={{ margin: 0, textAlign: "center", fontSize: 12, color: D.muted }}>You&rsquo;ll get an update here when it&rsquo;s sorted.</p>
      </div>
    </Screen>
  );
}

const CONCERNS: [string, string][] = [["behaviour", "Behaviour"], ["bullying", "Bullying or harassment"], ["safety", "Safety or hygiene"], ["timekeeping", "Timekeeping"], ["other", "Something else"]];

/** 22 · A concern about a colleague. */
export function ReportPersonScreen({ meId, branch, onBack }: { meId: number; branch: string; onBack: () => void }) {
  const { data } = useData<{ people: { id: number; name: string }[] }>("/api/meet/requests?people=1");
  const [who, setWho] = useState("");
  const [cat, setCat] = useState("");
  const [when, setWhen] = useState(londonToday());
  const [where, setWhere] = useState(branch === "streatham" || branch === "cricklewood" ? branch : "cricklewood");
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const people = (data?.people || []).filter((p) => p.id !== meId);

  async function submit() {
    setBusy(true);
    setErr("");
    const r = await send("/api/meet/reports", { kind: "person", aboutId: Number(who), category: cat, happenedOn: when, branch: where, body: text, anonymous: anon });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error || "Couldn't send that");
    setSent(true);
  }
  if (sent) return <Sent onBack={onBack} text={anon ? "Sent privately without your name. Only managers and the owner can read it." : "Sent privately. Only managers and the owner can read it, and they may speak to you about it."} />;
  const ready = who && cat && text.trim().length >= 3;
  return (
    <Screen gap={14}>
      <Back onBack={onBack} title="A concern about a colleague" />
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 20, background: "#1e1b2e" }}>
        <Icon name="lock" size={22} fill style={{ color: "#c4b5fd", flex: "none" }} />
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#e9e5ff" }}>Only the owner and managers can read this. The person you report will never see your name or this report.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="rp-who" style={{ fontSize: 13, color: D.muted }}>Who is it about?</label>
        <div style={{ position: "relative" }}>
          <select id="rp-who" value={who} onChange={(e) => setWho(e.target.value)} style={{ width: "100%", height: 52, boxSizing: "border-box", padding: "0 16px", border: 0, borderRadius: 18, background: D.card, color: "#ffffff", fontSize: 15, fontFamily: "inherit", appearance: "none" }}>
            <option value="">Choose a person</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Icon name="expand_more" size={22} style={{ position: "absolute", right: 14, top: 15, color: D.muted, pointerEvents: "none" }} />
        </div>
      </div>
      <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
        <legend style={{ fontSize: 13, color: D.muted, marginBottom: 8 }}>What&rsquo;s it about?</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{CONCERNS.map(([k, l]) => <Chip key={k} on={cat === k} onClick={() => setCat(k)} style={{ fontSize: 13, padding: "0 14px" }}>{l}</Chip>)}</div>
      </fieldset>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <label style={{ position: "relative", height: 48, borderRadius: 16, background: D.card, color: "#ffffff", fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
          <Icon name="event" size={19} />{when === londonToday() ? "Today" : `${dayShort(when)} ${dayNum(when)}`}
          <input type="date" aria-label="When" value={when} max={londonToday()} min={addDays(londonToday(), -120)} onChange={(e) => setWhen(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
        </label>
        <button onClick={() => setWhere(where === "cricklewood" ? "streatham" : "cricklewood")} aria-label={`Where: ${BRANCH[where]}. Tap to change`} style={{ height: 48, border: 0, borderRadius: 16, background: D.card, color: "#ffffff", fontSize: 14, fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}><Icon name="storefront" size={19} />{BRANCH[where]}</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="rp-what" style={{ fontSize: 13, color: D.muted }}>What happened?</label>
        <textarea id="rp-what" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Describe what happened. Include anyone else who saw it." style={field} />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "0 14px", borderRadius: 18, background: D.card, cursor: "pointer" }}>
        <Icon name="visibility_off" size={22} />
        <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 14 }}>Send without my name</span><span style={{ display: "block", fontSize: 12, color: D.muted }}>Managers can&rsquo;t reply to you if you do</span></span>
        <input type="checkbox" role="switch" checked={anon} onChange={(e) => setAnon(e.target.checked)} style={{ width: 22, height: 22, accentColor: "#a78bfa" }} />
      </label>
      {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: D.red }}>{err}</p>}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={submit} disabled={busy || !ready} style={{ ...bigWhite, opacity: ready ? 1 : 0.5 }}>{busy ? "Sending…" : "Send privately"}</button>
        <p style={{ margin: 0, textAlign: "center", fontSize: 12, color: D.muted }}>In an emergency, speak to a manager or call 999.</p>
      </div>
    </Screen>
  );
}

function Sent({ onBack, text }: { onBack: () => void; text: string }) {
  return (
    <Screen>
      <Back onBack={onBack} title="Report something" />
      <div style={{ padding: "18px 16px", borderRadius: 20, background: "#172e2a", color: "#ccfbf1", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Icon name="task_alt" size={22} style={{ color: "#5eead4", flex: "none" }} />
        <p style={{ margin: 0, lineHeight: 1.5 }}>{text}</p>
      </div>
      <button onClick={onBack} style={{ ...bigWhite, marginTop: "auto" }}>Done</button>
    </Screen>
  );
}
