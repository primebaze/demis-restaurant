"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Icon, IconFont, firstName } from "../ui";
import { Sidebar, TopBar } from "../ManagerShell";

/* 20 · Admin: build the rota. Values from the design canvas. */

const C = { page: "#f6f4f1", ink: "#141414", sub: "#6e6a65", body: "#3b3834", line: "#f0ece7", coral: "#c2410c", dash: "#e6e1db", plus: "#a19c96" };

// Shift colours by branch: yellow is Streatham, green is Cricklewood.
const BRANCH_COLOUR: Record<"cricklewood" | "streatham", { bg: string; fg: string; dot: string }> = {
  cricklewood: { bg: "#ecfdf5", fg: "#065f46", dot: "#34d399" },
  streatham: { bg: "#fef3c7", fg: "#92400e", dot: "#f59e0b" },
};
const roleLabel = (r: string) => (r ? r[0].toUpperCase() + r.slice(1) : "");

type Person = { id: number; name: string; role: string; branch: string };
type Shift = { id: number; staffId: number; date: string; start: string; end: string; notes: string | null; hours: number; branch: Branch };
type Branch = "cricklewood" | "streatham";
type Week = {
  week: string; weekLabel: string; days: string[]; today: string;
  people: Person[]; shifts: (Shift & { branch: Branch })[];
  published: { at: string; by: string; changedPeople: number[]; seen: number; onRota: number } | null;
  timeOff: { id: string; staffId: number; status: "asked" | "approved"; from: string; to: string }[];
  waitingRequests: number;
  costs: { days: { date: string; budget: number | null; cost: number }[]; totalCost: number } | null;
};
type Waiting = { id: string; kind: "swap" | "timeoff"; by: string; target: string; date: string; start: string; end: string; from: string; to: string };
type Edit = { id?: number; branch: Branch; person: Person; date: string; start: string; end: string; notes: string };

const BRANCH_NAME = { cricklewood: "Cricklewood", streatham: "Streatham" } as const;
// Demi's usual times: one tap under Start and Finish. A new shift starts as 11:50 – 00:00.
const START_TIMES = ["10:00", "11:50"];
const END_TIMES = ["17:00", "00:00"];
const NEW_SHIFT: [string, string] = ["11:50", "00:00"];
const short = (t: string) => (t.endsWith(":00") ? t.slice(0, 2) : t); // 09:00 → 09, 09:30 stays
const dayHead = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const dayLong = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const money = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const fmtHours = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1));
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

const btnWhite: CSSProperties = { height: 40, padding: "0 14px", border: 0, borderRadius: 20, background: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(20,20,20,0.08)", color: C.ink };
const btnBlack: CSSProperties = { height: 40, padding: "0 18px", border: 0, borderRadius: 20, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 };
const panel: CSSProperties = { borderRadius: 24, background: "#ffffff", padding: 16, display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" };

export default function RotaPage() {
  const [data, setData] = useState<Week | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState<Edit | null>(null);
  const openEdit = (e: Edit) => { setNote(""); setEdit(e); };

  const load = useCallback(async (w?: string) => {
    const res = await fetch(`/api/meet/rota${w ? `?week=${w}` : ""}`, { cache: "no-store" }).catch(() => null);
    if (!res) return setError("Can't connect right now");
    if (res.status === 401) { window.location.replace(`/meet?back=${encodeURIComponent(window.location.pathname)}`); return; }
    if (res.status === 401 || res.status === 403) return setError("This page is for managers.");
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error || "Can't load the rota right now");
    setError("");
    setData(d);
  }, []);

  const [waiting, setWaiting] = useState<Waiting[]>([]);
  const loadRequests = useCallback(async () => {
    const res = await fetch("/api/meet/requests/manage", { cache: "no-store" }).catch(() => null);
    if (res?.ok) setWaiting((await res.json()).waiting || []);
  }, []);

  useEffect(() => { load(); loadRequests(); }, [load, loadRequests]);

  async function decide(id: string, action: "approve" | "decline") {
    setBusy(id);
    setNote("");
    const res = await fetch("/api/meet/requests/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy("");
    if (!res?.ok) return setNote(d?.error || "Couldn't save that");
    setNote(action === "approve" ? "Approved and the rota is updated." : "Declined. They've been told.");
    await Promise.all([load(data?.week), loadRequests()]);
  }

  // Budget editor in This week: one box per day, saved together.
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [budgetMode, setBudgetMode] = useState<"week" | "day">("week");
  const [weekDraft, setWeekDraft] = useState("");
  const pounds = (v: string | undefined) => (v?.trim() ? Number(v.replace(/[£,\s]/g, "")) : null);
  function openBudget(focusDate?: string) {
    const d: Record<string, string> = {};
    for (const day of data?.days || []) { const b = costOf(day)?.budget; d[day] = b != null ? String(b) : ""; }
    setDraft(d);
    // Whole week unless the days were set to different amounts (or a day box was tapped).
    const set = Object.values(d).filter(Boolean);
    const even = set.length === 0 || (set.length === 7 && Math.abs(Math.max(...set.map(Number)) - Math.min(...set.map(Number))) <= 0.01);
    setBudgetMode(focusDate || !even ? "day" : "week");
    setWeekDraft(set.length ? String(Math.round(set.reduce((n, v) => n + Number(v), 0) * 100) / 100) : "");
    setBudgetOpen(true);
    setTimeout(() => {
      document.getElementById("budget-editor")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (focusDate) (document.getElementById(`budget-${focusDate}`) as HTMLInputElement | null)?.focus();
    }, 50);
  }
  /** A week's budget shared across the 7 days to the penny (any leftover pennies go to the first days). */
  function splitWeek(total: number | null): Record<string, number | null> {
    const days = data?.days || [];
    const out: Record<string, number | null> = {};
    if (total === null || total <= 0) { days.forEach((d) => (out[d] = null)); return out; }
    const pence = Math.round(total * 100);
    const base = Math.floor(pence / days.length);
    days.forEach((d, i) => (out[d] = (base + (i < pence - base * days.length ? 1 : 0)) / 100));
    return out;
  }
  async function saveBudgets() {
    const wanted: Record<string, number | null> = {};
    if (budgetMode === "week") {
      const total = pounds(weekDraft);
      if (total !== null && (!Number.isFinite(total) || total < 0)) return setNote("Enter the week's budget in pounds, like 3000");
      Object.assign(wanted, splitWeek(total));
    } else {
      for (const day of data?.days || []) {
        const amount = pounds(draft[day]);
        if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return setNote(`Enter an amount in pounds for ${dayHead(day)}, like 450`);
        wanted[day] = amount;
      }
    }
    const changed = (data?.days || []).filter((day) => (wanted[day] ?? null) !== (costOf(day)?.budget ?? null));
    setBusy("budget");
    setNote("");
    for (const day of changed) {
      const res = await fetch("/api/meet/rota", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "budget", date: day, amount: wanted[day] }) }).catch(() => null);
      if (!res?.ok) { setBusy(""); setNote("Couldn't save the budget. Try again."); await load(data?.week); return; }
    }
    setBusy("");
    setBudgetOpen(false);
    setNote(changed.length ? "Budget saved." : "");
    await load(data?.week);
  }

  const costOf = (date: string) => data?.costs?.days.find((d) => d.date === date);
  const budgetTotal = (data?.costs?.days || []).reduce((n, d) => n + (d.budget || 0), 0);
  const costTotal = data?.costs?.totalCost || 0;
  const hasBudget = (data?.costs?.days || []).some((d) => d.budget != null);

  const offOn = (staffId: number, date: string) => (data?.timeOff || []).find((t) => t.staffId === staffId && t.from <= date && t.to >= date);

  async function act(body: object, key: string, done?: string) {
    setBusy(key);
    setNote("");
    const res = await fetch("/api/meet/rota", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy("");
    if (!res?.ok) { setNote(d?.error || "Couldn't save that"); return false; }
    if (done) setNote(done.replace("{n}", String(d?.copied ?? d?.people ?? "")));
    await load(data?.week);
    return true;
  }

  // The filter narrows the one rota to a branch: its shifts, and the people who work there.
  const shifts = useMemo(() => data?.shifts || [], [data]);
  const people = useMemo(() => data?.people || [], [data]);

  const byCell = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of shifts) m.set(`${s.staffId}|${s.date}`, [...(m.get(`${s.staffId}|${s.date}`) || []), s]);
    return m;
  }, [shifts]);

  const totals = useMemo(() => {
    const perPerson = new Map<number, number>();
    const perDay = new Map<string, Set<number>>();
    let all = 0;
    for (const s of shifts) {
      perPerson.set(s.staffId, (perPerson.get(s.staffId) || 0) + s.hours);
      perDay.set(s.date, new Set([...Array.from(perDay.get(s.date) || []), s.staffId]));
      all += s.hours;
    }
    return { perPerson, perDay, all, people: perPerson.size };
  }, [shifts]);

  // Times already used this week, offered as one-tap choices in the editor.
  const common = useMemo(() => {
    const count = new Map<string, number>();
    for (const s of data?.shifts || []) count.set(`${s.start}-${s.end}`, (count.get(`${s.start}-${s.end}`) || 0) + 1);
    return Array.from(count.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k.split("-") as [string, string]);
  }, [data]);

  const pub = data?.published;
  const changed = pub?.changedPeople.length || 0;
  const status = !data ? null
    : !pub ? { dot: "#f59e0b", colour: "#92400e", text: "Draft · not seen by staff yet" }
    : changed ? { dot: "#f2643a", colour: C.coral, text: `Changed since it was sent · ${changed} ${changed === 1 ? "person" : "people"} affected` }
    : { dot: "#16a34a", colour: "#047857", text: `Sent ${when(pub.at)}${pub.by ? ` by ${firstName(pub.by)}` : ""} · ${pub.seen} of ${pub.onRota} have seen it` };

  async function publish() {
    if (!data) return;
    const n = new Set(data.shifts.map((s) => s.staffId)).size;
    const msg = pub
      ? `Send the changes to the ${changed} ${changed === 1 ? "person" : "people"} whose shifts changed?`
      : `Send the rota for ${data.weekLabel} to ${n} ${n === 1 ? "person" : "people"}? Each gets a notification and an email with their shifts at both branches.`;
    if (!confirm(msg)) return;
    await act({ action: "publish", week: data.week }, "publish", pub ? "Changes sent to {n}." : "Rota sent to {n} people.");
  }

  // A new shift goes to the person's branch, else the branch being shown, else Cricklewood.
  const branchFor = (p: Person): Branch => (p.branch === "cricklewood" || p.branch === "streatham" ? p.branch : "cricklewood");

  return (
    <div style={{ minHeight: "100dvh", background: C.page, color: C.ink, fontSize: 14, display: "flex", flexWrap: "wrap", alignContent: "flex-start", width: "100%", maxWidth: "100vw", overflowX: "clip" }}>
      <IconFont />
      <style>{`html,body{background:${C.page};overflow-x:clip;overscroll-behavior-x:none}`}</style>
      <Sidebar current="rota" badges={{ rota: waiting.length }} />
      <TopBar />

      <main className="px-4 pb-6 pt-[18px] md:pl-2 md:pr-6" style={{ flex: "999 1 560px", minWidth: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "4px 4px 0" }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            {status && (
              <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: status.colour }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: status.dot }} />{status.text}
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>Rota · {data?.weekLabel || "…"}</h1>
              <button aria-label="Previous week" disabled={!data || !!busy} onClick={() => data && load(addDays(data.week, -7))} style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.08)" }}><Icon name="chevron_left" size={20} /></button>
              <button aria-label="Next week" disabled={!data || !!busy} onClick={() => data && load(addDays(data.week, 7))} style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.08)" }}><Icon name="chevron_right" size={20} /></button>
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <button disabled={!data?.costs || !!busy} onClick={() => (budgetOpen ? setBudgetOpen(false) : openBudget())} style={btnWhite} aria-expanded={budgetOpen}>
              <Icon name="savings" size={19} />
              {hasBudget ? <>Budget <strong style={{ fontWeight: 600 }}>{money(budgetTotal)}</strong></> : "Set budget"}
              <Icon name="expand_more" size={18} />
            </button>
              {budgetOpen && (
                <div id="budget-editor" role="dialog" aria-label="Budget for the week" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 30, width: 290, maxWidth: "calc(100vw - 32px)", display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 18, background: "#ffffff", boxShadow: "0 12px 32px rgba(20,20,20,0.16), 0 1px 2px rgba(20,20,20,0.08)" }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Budget · {data?.weekLabel}</p>
                        <div role="tablist" aria-label="Budget by" style={{ display: "flex", padding: 3, borderRadius: 999, background: C.page }}>
                          {([["week", "Whole week"], ["day", "Each day"]] as const).map(([m, label]) => (
                            <button key={m} role="tab" aria-selected={budgetMode === m}
                              onClick={() => {
                                if (m === "day" && budgetMode === "week") {
                                  // Carry the week's amount over as an even split, so it can be adjusted day by day.
                                  const split = splitWeek(pounds(weekDraft));
                                  setDraft(Object.fromEntries(Object.entries(split).map(([d, v]) => [d, v != null ? String(v) : ""])));
                                }
                                if (m === "week" && budgetMode === "day") {
                                  const sum = (data?.days || []).reduce((n, d) => n + (pounds(draft[d]) || 0), 0);
                                  setWeekDraft(sum ? String(Math.round(sum * 100) / 100) : "");
                                }
                                setBudgetMode(m);
                              }}
                              style={{ flex: 1, height: 32, border: 0, borderRadius: 999, background: budgetMode === m ? "#ffffff" : "transparent", boxShadow: budgetMode === m ? "0 1px 2px rgba(20,20,20,0.1)" : "none", color: budgetMode === m ? C.ink : C.sub, fontFamily: "inherit", fontSize: 13, fontWeight: budgetMode === m ? 600 : 500, cursor: "pointer" }}>
                              {label}
                            </button>
                          ))}
                        </div>
                        {budgetMode === "week" ? (
                          <>
                            <p style={{ margin: 0, fontSize: 12, color: C.sub }}>One amount for the whole week. It&rsquo;s shared evenly across the 7 days. Leave it empty for no budget.</p>
                            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 }}>
                              <span>Week</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4, background: C.page, borderRadius: 10, padding: "0 10px", boxShadow: `inset 0 0 0 1px ${C.dash}` }}>
                                <span style={{ color: C.sub }}>£</span>
                                <input id="budget-week" inputMode="decimal" value={weekDraft} placeholder="0" autoFocus
                                  onChange={(e) => setWeekDraft(e.target.value)}
                                  style={{ width: 110, height: 40, border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 16, textAlign: "right", color: C.ink }} />
                              </span>
                            </label>
                            {(() => {
                              const t = pounds(weekDraft);
                              return t && Number.isFinite(t) && t > 0 ? <p style={{ margin: 0, fontSize: 12, color: C.sub, textAlign: "right" }}>About {money(Math.round((t / 7) * 100) / 100)} a day</p> : null;
                            })()}
                          </>
                        ) : (
                          <>
                            <p style={{ margin: 0, fontSize: 12, color: C.sub }}>Budget for each day, in pounds. Leave a day empty for no budget.</p>
                            {(data?.days || []).map((day) => (
                              <label key={day} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 }}>
                                <span>{dayHead(day)}</span>
                                <span style={{ display: "flex", alignItems: "center", gap: 4, background: C.page, borderRadius: 10, padding: "0 10px", boxShadow: `inset 0 0 0 1px ${C.dash}` }}>
                                  <span style={{ color: C.sub }}>£</span>
                                  <input id={`budget-${day}`} inputMode="decimal" value={draft[day] ?? ""} placeholder="0"
                                    onChange={(e) => setDraft((x) => ({ ...x, [day]: e.target.value }))}
                                    style={{ width: 80, height: 36, border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 16, textAlign: "right", color: C.ink }} />
                                </span>
                              </label>
                            ))}
                            <p style={{ margin: 0, fontSize: 12, color: C.sub, textAlign: "right" }}>Week {money(Math.round((data?.days || []).reduce((n, d) => n + (pounds(draft[d]) || 0), 0) * 100) / 100)}</p>
                          </>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button onClick={saveBudgets} disabled={busy === "budget"}
                            style={{ flex: 1, height: 38, border: 0, borderRadius: 999, background: C.ink, color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                            {busy === "budget" ? "Saving…" : "Save budget"}
                          </button>
                          <button onClick={() => setBudgetOpen(false)}
                            style={{ height: 38, padding: "0 16px", border: 0, borderRadius: 999, background: "#fff", color: C.ink, fontFamily: "inherit", fontSize: 13, cursor: "pointer", boxShadow: `inset 0 0 0 1px ${C.dash}` }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
          </div>
          <button disabled={!data || !!busy} onClick={() => data && confirm(`Copy last week's shifts into ${data.weekLabel}? People already working a day keep what they have.`) && act({ action: "copy_last_week", week: data.week }, "copy", "Copied {n} shifts from last week.")} style={btnWhite}>
            <Icon name="content_copy" size={19} />{busy === "copy" ? "Copying…" : "Copy last week"}
          </button>
          <button disabled={!data || !!busy || (!!pub && !changed)} onClick={publish} style={{ ...btnBlack, opacity: !!pub && !changed ? 0.45 : 1 }}>
            <Icon name="send" size={19} />{busy === "publish" ? "Sending…" : pub ? (changed ? "Send changes" : "Sent") : "Publish to staff"}
          </button>
        </header>

        {note && !edit && <p role="status" style={{ margin: "0 4px", fontSize: 13, color: C.body }}>{note}</p>}

        {error ? (
          <p style={{ ...panel, margin: 0, color: C.sub }}>{error}</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
            <section aria-label="Week grid" style={{ flex: "999 1 640px", minWidth: 0, borderRadius: 24, background: "#ffffff", padding: 10, boxShadow: "0 1px 2px rgba(20,20,20,0.05)", overflowX: "auto" }}>
              <div aria-label="Colour key" style={{ display: "flex", gap: 14, padding: "6px 8px 2px", fontSize: 12, color: C.body }}>
                {(["cricklewood", "streatham"] as Branch[]).map((b) => (
                  <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: BRANCH_COLOUR[b].bg, boxShadow: `inset 0 0 0 1.5px ${BRANCH_COLOUR[b].dot}` }} />{BRANCH_NAME[b]}
                  </span>
                ))}
              </div>
              {!data ? (
                <div aria-busy="true" style={{ height: 320, borderRadius: 16, background: "#f3f0ec" }} />
              ) : (
                <table style={{ width: "100%", minWidth: 720, borderCollapse: "separate", borderSpacing: 4, tableLayout: "fixed", fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: C.sub, textAlign: "center" }}>
                      <th scope="col" style={{ width: 120, textAlign: "left", fontWeight: 500, padding: "6px 8px" }}>Staff</th>
                      {data.days.map((d) => (
                        <th key={d} scope="col" style={{ fontWeight: d === data.today ? 600 : 500, color: d === data.today ? C.coral : undefined }}>{dayHead(d)}</th>
                      ))}
                      <th scope="col" style={{ width: 52, textAlign: "right", fontWeight: 500, paddingRight: 8 }}>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p) => (
                      <tr key={p.id}>
                        <th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: "4px 8px", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {firstName(p.name)}<br /><span style={{ fontWeight: 400, fontSize: 11, color: C.sub }}>{roleLabel(p.role)}</span>
                        </th>
                        {data.days.map((d) => {
                          const list = byCell.get(`${p.id}|${d}`) || [];
                          if (list.length === 0) {
                            const off = offOn(p.id, d);
                            return (
                              <td key={d} style={{ height: 50, padding: 0 }}>
                                <button aria-label={off ? `${p.name} ${off.status === "approved" ? "has time off" : "asked for time off"} on ${dayLong(d)}. Add a shift anyway` : `Add a shift for ${p.name} on ${dayLong(d)}`}
                                  onClick={() => openEdit({ branch: branchFor(p), person: p, date: d, start: NEW_SHIFT[0], end: NEW_SHIFT[1], notes: "" })}
                                  style={off
                                    ? { width: "100%", height: 50, borderRadius: 12, border: off.status === "approved" ? 0 : "1.5px dashed #f9a8d4", background: off.status === "approved" ? "#fdf2f8" : "transparent", color: "#9d174d", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }
                                    : { width: "100%", height: 50, borderRadius: 12, border: `1.5px dashed ${C.dash}`, background: "transparent", color: C.plus, fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
                                  {off ? (off.status === "approved" ? "Time off" : "Asked off") : "+"}
                                </button>
                              </td>
                            );
                          }
                          return (
                            <td key={d} style={{ height: 50, padding: 0, verticalAlign: "top" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 3, height: "100%" }}>
                                {list.map((s) => (
                                  <button key={s.id} aria-label={`${p.name}, ${dayLong(d)}, ${s.start} to ${s.end} at ${BRANCH_NAME[s.branch]}. Change`} title={s.notes || undefined}
                                    onClick={() => openEdit({ id: s.id, branch: s.branch, person: p, date: d, start: s.start, end: s.end, notes: s.notes || "" })}
                                    style={{ flex: 1, minHeight: list.length > 1 ? 24 : 50, borderRadius: 12, border: 0, background: BRANCH_COLOUR[s.branch].bg, color: BRANCH_COLOUR[s.branch].fg, textAlign: "center", fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace", fontSize: 12, cursor: "pointer" }}>
                                    {short(s.start)}–{short(s.end)}{s.notes ? " •" : ""}
                                  </button>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ textAlign: "right", paddingRight: 8, fontSize: 13, fontWeight: 600 }}>{fmtHours(totals.perPerson.get(p.id) || 0)}</td>
                      </tr>
                    ))}
                    {people.length === 0 && (
                      <tr><td colSpan={9} style={{ padding: 16, color: C.sub }}>No one here yet. Set branches on the Staff page.</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ color: C.sub, textAlign: "center" }}>
                      <th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: "6px 8px" }}>On shift</th>
                      {data.days.map((d) => <td key={d}>{totals.perDay.get(d)?.size || 0}</td>)}
                      <td style={{ textAlign: "right", paddingRight: 8, fontWeight: 600, color: C.ink }}>{fmtHours(totals.all)}</td>
                    </tr>
                    {data.costs && (
                      <>
                        <tr style={{ color: C.sub, textAlign: "center" }}>
                          <th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: "6px 8px" }}>Budget</th>
                          {data.days.map((d) => {
                            const b = costOf(d)?.budget ?? null;
                            return (
                              <td key={d} style={{ padding: 0 }}>
                                <button aria-label={`Set budget for ${dayLong(d)}`} onClick={() => openBudget(d)} disabled={!!busy}
                                  style={{ width: "100%", height: 30, border: 0, borderRadius: 10, background: b != null ? C.page : "transparent", color: b != null ? C.ink : C.plus, fontSize: 12, fontFamily: "inherit", cursor: "pointer", boxShadow: b != null ? "none" : `inset 0 0 0 1.5px ${C.dash}` }}>
                                  {b != null ? money(b) : "+ £"}
                                </button>
                              </td>
                            );
                          })}
                          <td style={{ textAlign: "right", paddingRight: 8, fontWeight: 600, color: C.ink }}>{hasBudget ? money(budgetTotal) : ""}</td>
                        </tr>
                        <tr style={{ color: C.sub, textAlign: "center" }}>
                          <th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: "6px 8px" }}>Cost</th>
                          {data.days.map((d) => {
                            const c = costOf(d);
                            const over = c && c.budget != null && c.cost > c.budget;
                            return <td key={d} style={{ color: over ? "#b91c1c" : undefined, fontWeight: over ? 600 : 400 }}>{c && c.cost ? money(c.cost) : "–"}</td>;
                          })}
                          <td style={{ textAlign: "right", paddingRight: 8, fontWeight: 600, color: hasBudget && costTotal > budgetTotal ? "#b91c1c" : C.ink }}>{money(costTotal)}</td>
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
              )}
              <p style={{ margin: "6px 8px 4px", fontSize: 12, color: C.sub }}>Click a box to add or change a shift. The colour shows the branch.</p>
            </section>

            <aside className="lg:sticky lg:top-[18px] lg:max-h-[calc(100dvh-36px)] lg:overflow-y-auto" style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              <section aria-labelledby="rq-h" style={{ ...panel, gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <h2 id="rq-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Requests</h2>
                  <a href="/meet/rota/requests" style={{ marginLeft: "auto", fontSize: 13, color: C.sub, textDecoration: "none" }}>See all</a>
                </div>
                {waiting.length === 0 && <p style={{ margin: 0, fontSize: 13, color: C.sub }}>No swaps or time off waiting.</p>}
                {waiting.slice(0, 3).map((r) => (
                  <div key={r.id} style={{ padding: 12, borderRadius: 16, background: C.page, display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: r.kind === "swap" ? "#92400e" : "#9d174d" }}>
                      <Icon name={r.kind === "swap" ? "swap_horiz" : "beach_access"} size={16} />{r.kind === "swap" ? "Swap" : "Time off"}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
                      {r.kind === "swap"
                        ? <><strong style={{ fontWeight: 600 }}>{firstName(r.by)}</strong> wants to swap {dayHead(r.date)} {short(r.start)}–{short(r.end)} with <strong style={{ fontWeight: 600 }}>{firstName(r.target)}</strong>. {firstName(r.target)} has agreed.</>
                        : <><strong style={{ fontWeight: 600 }}>{firstName(r.by)}</strong> asked for {r.from === r.to ? dayLong(r.from) : `${dayHead(r.from)} – ${dayHead(r.to)}`} off.</>}
                    </p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button disabled={!!busy} onClick={() => decide(r.id, "approve")} style={{ flex: 1, height: 34, border: 0, borderRadius: 17, background: C.ink, color: "#ffffff", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>{busy === r.id ? "Saving…" : "Approve"}</button>
                      <button disabled={!!busy} onClick={() => confirm(`Decline ${firstName(r.by)}'s request?`) && decide(r.id, "decline")} style={{ flex: 1, height: 34, border: 0, borderRadius: 17, background: "#ffffff", fontSize: 13, fontFamily: "inherit" }}>Decline</button>
                    </div>
                  </div>
                ))}
                {waiting.length > 3 && <a href="/meet/rota/requests" style={{ fontSize: 13, color: C.ink }}>{waiting.length - 3} more</a>}
              </section>
              <section aria-labelledby="wk-h" style={panel}>
                <h2 id="wk-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>This week</h2>
                <p style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.sub }}>Rota hours</span><strong style={{ fontWeight: 600 }}>{fmtHours(totals.all)} h</strong></p>
                {data?.costs && (
                  <>
                    <p style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.sub }}>Budget</span><strong style={{ fontWeight: 600 }}>{hasBudget ? money(budgetTotal) : "Not set"}</strong></p>
                    <p style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.sub }}>Rota cost</span><strong style={{ fontWeight: 600 }}>{money(costTotal)}</strong></p>
                    {hasBudget && (
                      <p style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: C.sub }}>{costTotal > budgetTotal ? "Over budget" : "Left"}</span>
                        <strong style={{ fontWeight: 600, color: costTotal > budgetTotal ? "#b91c1c" : "#047857" }}>{money(Math.abs(budgetTotal - costTotal))}</strong>
                      </p>
                    )}
                  </>
                )}
                <p style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.sub }}>People on the rota</span><strong style={{ fontWeight: 600 }}>{totals.people}</strong></p>
                {(["cricklewood", "streatham"] as Branch[]).map((b) => {
                  const n = (data?.shifts || []).filter((s) => s.branch === b);
                  return (
                    <p key={b} style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.sub }}>{BRANCH_NAME[b]}</span><strong style={{ fontWeight: 600 }}>{n.length} shift{n.length === 1 ? "" : "s"} · {fmtHours(n.reduce((a, s) => a + s.hours, 0))} h</strong></p>
                  );
                })}
                {pub && <p style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.sub }}>Have seen it</span><strong style={{ fontWeight: 600 }}>{pub.seen} of {pub.onRota}</strong></p>}
              </section>
            </aside>
          </div>
        )}
        <p style={{ margin: "0 4px", fontSize: 12, color: C.sub }}>
          One rota for both branches. Shifts are saved straight into the clock-in app. Publishing sends everyone on the rota a phone notification and an email with their shifts, and shows it on their Home screen. After that, &ldquo;Send changes&rdquo; only tells the people whose shifts changed. Staff turned off in the clock-in app get nothing.
        </p>
      </main>

      {edit && data && (
        <ShiftEditor
          edit={edit}
          common={common}
          busy={busy === "save" || busy === "delete"}
          onClose={() => setEdit(null)}
          onSave={async (e) => { if (await act({ action: "save", branch: e.branch, id: e.id, staffId: e.person.id, date: e.date, start: e.start, end: e.end, notes: e.notes }, "save")) setEdit(null); }}
          onDelete={async (id) => { if (confirm("Remove this shift?") && (await act({ action: "delete", id }, "delete"))) setEdit(null); }}
          error={note}
        />
      )}
    </div>
  );
}

/* Add or change one shift (styled like the design's dialogs). */
function ShiftEditor({ edit, common, busy, error, onClose, onSave, onDelete }: {
  edit: Edit; common: [string, string][]; busy: boolean; error: string;
  onClose: () => void; onSave: (e: Edit) => void; onDelete: (id: number) => void;
}) {
  const [e, setE] = useState(edit);
  const input: CSSProperties = { height: 48, width: "100%", boxSizing: "border-box", padding: "0 14px", border: 0, borderRadius: 16, background: C.page, fontSize: 16, fontFamily: "inherit", color: C.ink };
  return (
    <div data-overlay role="presentation" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(40,32,26,0.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-labelledby="se-title" onClick={(ev) => ev.stopPropagation()} style={{ width: "100%", maxWidth: 420, boxSizing: "border-box", background: "#ffffff", borderRadius: 28, boxShadow: "0 30px 70px -20px rgba(20,20,20,0.45)", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h2 id="se-title" style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>{edit.id ? "Change shift" : "Add a shift"}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: C.sub }}>{e.person.name} · {dayLong(e.date)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 40, height: 40, border: 0, borderRadius: 20, background: C.page, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={20} /></button>
        </div>

        {common.length > 0 && (
          <div role="group" aria-label="Times used this week" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {common.map(([s, en]) => {
              const on = e.start === s && e.end === en;
              return (
                <button key={`${s}-${en}`} aria-pressed={on} onClick={() => setE({ ...e, start: s, end: en })} style={{ height: 34, padding: "0 12px", border: 0, borderRadius: 17, background: on ? C.ink : C.page, color: on ? "#ffffff" : C.ink, fontSize: 13, fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace" }}>
                  {s}–{en}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="se-start" style={{ fontSize: 13, fontWeight: 500, color: C.body }}>Start</label>
            <input id="se-start" type="time" step={60} value={e.start} onChange={(x) => setE({ ...e, start: x.target.value })} style={input} />
            <TimeChips times={START_TIMES} value={e.start} label="Start" onPick={(t) => setE({ ...e, start: t })} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="se-end" style={{ fontSize: 13, fontWeight: 500, color: C.body }}>Finish</label>
            <input id="se-end" type="time" step={60} value={e.end} onChange={(x) => setE({ ...e, end: x.target.value })} style={input} />
            <TimeChips times={END_TIMES} value={e.end} label="Finish" onPick={(t) => setE({ ...e, end: t })} />
          </div>
        </div>
        {e.end && e.start && e.end < e.start && <p style={{ margin: "-6px 0 0", fontSize: 12, color: C.sub }}>Finishes after midnight.</p>}
        <div role="group" aria-label="Branch" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 20, background: C.page }}>
          {(["cricklewood", "streatham"] as Branch[]).map((b) => (
            <button key={b} type="button" aria-pressed={e.branch === b} onClick={() => setE({ ...e, branch: b })} style={{ height: 36, border: 0, borderRadius: 16, background: e.branch === b ? BRANCH_COLOUR[b].bg : "transparent", color: e.branch === b ? BRANCH_COLOUR[b].fg : C.ink, fontSize: 14, fontWeight: e.branch === b ? 600 : 400, fontFamily: "inherit", boxShadow: e.branch === b ? `inset 0 0 0 1.5px ${BRANCH_COLOUR[b].dot}` : "none" }}>
              {BRANCH_NAME[b]}
            </button>
          ))}
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500, color: C.body }}>Note (optional)
          <input value={e.notes} maxLength={500} onChange={(x) => setE({ ...e, notes: x.target.value })} placeholder="e.g. close, Sunday Feast" style={input} />
        </label>
        {error && <p role="status" style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{error}</p>}

        <div style={{ display: "flex", gap: 8 }}>
          {edit.id && (
            <button disabled={busy} onClick={() => onDelete(edit.id!)} aria-label="Remove shift" style={{ height: 48, width: 48, border: 0, borderRadius: 24, background: C.page, color: "#b91c1c", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="delete" size={21} /></button>
          )}
          <button onClick={onClose} style={{ flex: 1, height: 48, border: 0, borderRadius: 24, background: C.page, fontSize: 15, fontWeight: 500, fontFamily: "inherit" }}>Cancel</button>
          <button disabled={busy || !e.start || !e.end} onClick={() => onSave(e)} style={{ flex: 1, height: 48, border: 0, borderRadius: 24, background: C.ink, color: "#ffffff", fontSize: 15, fontWeight: 500, fontFamily: "inherit" }}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

/* One-tap usual times under Start and Finish. */
function TimeChips({ times, value, label, onPick }: { times: string[]; value: string; label: string; onPick: (t: string) => void }) {
  return (
    <div role="group" aria-label={`Usual ${label.toLowerCase()} times`} style={{ display: "flex", gap: 6 }}>
      {times.map((t) => {
        const on = value === t;
        return (
          <button key={t} type="button" aria-pressed={on} onClick={() => onPick(t)} style={{ flex: 1, height: 34, border: 0, borderRadius: 17, background: on ? C.ink : C.page, color: on ? "#ffffff" : C.ink, fontSize: 13, fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace" }}>
            {t}
          </button>
        );
      })}
    </div>
  );
}
