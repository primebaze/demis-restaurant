"use client";

import { useState, type CSSProperties } from "react";
import { Icon, personColourLight, initial, firstName } from "../ui";
import { ManagerFrame, PageHead, PAGE as C, panel, btnWhite, mono, useJson, postJson } from "../ManagerShell";

/* 24 · Admin: hours and corrections. Values from the design canvas. */

type Fix = { id: string; staffId: number; name: string; date: string; wasStart: string; wasEnd: string; start: string; end: string; reason: string; rota: { start: string; end: string } | null; overBy: number; repeat?: boolean; watch?: boolean };
type Row = { staffId: number; name: string; shifts: number; rota: number; worked: number; fixes: number; missed: string[] };
type Data = { week: string; weekLabel: string; stats: { worked: number; againstRota: number; fixes: number; missed: number }; fixes: Fix[]; missed: { staffId: number; name: string; date: string; in: string }[]; watchList?: { staffId: number; name: string; weeks: number }[]; rows: Row[] };

const DAY = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const WD = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const addDays = (d: string, n: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
const hm = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}m`;
const hShort = (h: number) => `${Math.round(h * 10) / 10}h`.replace(".0h", "h");
const small: CSSProperties = { height: 36, padding: "0 14px", border: 0, borderRadius: 18, background: "#ffffff", fontSize: 13, fontFamily: "inherit", color: C.ink, cursor: "pointer" };
const tag = (bg: string, fg: string): CSSProperties => ({ padding: "3px 9px", borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" });

export default function HoursPage() {
  const [week, setWeek] = useState("");
  const { data, error, reload } = useJson<Data>(`/api/meet/hours/manage${week ? `?week=${week}` : ""}`);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState<{ id: string; start: string; end: string } | null>(null);

  async function decide(f: Fix, action: "approve" | "decline", times?: { start: string; end: string }) {
    setBusy(f.id + action);
    setNote("");
    const r = await postJson("/api/meet/hours/manage", { id: f.id, action, ...(times || {}) });
    setBusy("");
    if (!r.ok) return setNote(r.data.error || "Couldn't save that");
    setEdit(null);
    setNote(action === "approve" ? `Approved. ${firstName(f.name)}'s ${WD(f.date)} is now ${hm(Number(r.data.hours))} in the clock-in app.` : `Declined. ${firstName(f.name)} has been told.`);
    reload();
  }

  const stat = (label: string, value: string, hot = false) => (
    <div style={hot ? { borderRadius: 20, background: C.coralBg, padding: 16 } : { borderRadius: 20, background: "#ffffff", padding: 16, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
      <p style={{ margin: 0, fontSize: 13, color: hot ? "#9a3412" : C.sub }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em", color: hot ? C.coral : C.ink }}>{value}</p>
    </div>
  );

  return (
    <ManagerFrame current="hours" badges={{ hours: data?.stats.fixes }}>
      <PageHead over="From the clock-in app" title={<span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>Hours · {data?.weekLabel || "…"}
        <button aria-label="Previous week" disabled={!data} onClick={() => data && setWeek(addDays(data.week, -7))} style={navBtn}><Icon name="chevron_left" size={20} /></button>
        <button aria-label="Next week" disabled={!data} onClick={() => data && setWeek(addDays(data.week, 7))} style={navBtn}><Icon name="chevron_right" size={20} /></button></span>}>
        <a href={data ? `/api/meet/hours/manage?week=${data.week}&export=csv` : undefined} download style={{ ...btnWhite, background: C.ink, color: "#ffffff", padding: "0 18px", boxShadow: "none" }}><Icon name="download" size={19} />Export for payroll</a>
      </PageHead>
      {note && <p role="status" style={{ margin: "0 4px", fontSize: 13, color: C.body }}>{note}</p>}
      {error ? <p style={{ ...panel, margin: 0, color: C.sub }}>{error}</p> : !data ? <p style={{ ...panel, margin: 0, color: C.sub }}>Loading the hours…</p> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {stat("Hours worked", hShort(data.stats.worked))}
            {stat("Against the rota", `${data.stats.againstRota > 0 ? "+" : ""}${hShort(data.stats.againstRota)}`)}
            {stat("Fixes to approve", String(data.stats.fixes), data.stats.fixes > 0)}
            {stat("Missed clock-outs", String(data.stats.missed))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
            <section aria-labelledby="fx-h" style={{ ...panel, flex: "1 1 360px", minWidth: 0, gap: 10 }}>
              <h2 id="fx-h" style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 600 }}>Fixes to approve</h2>
              {data.fixes.length === 0 && <p style={{ margin: 0, fontSize: 13, color: C.sub }}>Nothing waiting. When staff tap &ldquo;Fix my hours&rdquo; on their phone, it comes here.</p>}
              {data.fixes.map((f) => {
                const col = personColourLight(f.staffId);
                const editing = edit?.id === f.id;
                return (
                  <article key={f.id} style={{ padding: 14, borderRadius: 18, background: C.page, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 32, height: 32, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(f.name)}</span>
                      <span style={{ flex: 1 }}><span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontWeight: 500 }}>{firstName(f.name)} · {DAY(f.date)}{f.repeat && <span style={{ padding: "1px 8px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 600 }}>2nd this week</span>}{f.watch && <span style={{ padding: "1px 8px", borderRadius: 8, background: "#e7e5e4", color: "#44403c", fontSize: 11, fontWeight: 600 }} title="Asked to fix their hours more than once in a week, in the last 8 weeks">Watch list</span>}</span><span style={{ display: "block", fontSize: 12, color: C.sub }}>{f.reason}</span></span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: mono, fontSize: 13 }}>
                      <span style={{ color: C.sub, textDecoration: "line-through" }}>{f.wasStart || "none"} – {f.wasEnd || "none"}</span>
                      <Icon name="arrow_forward" size={16} style={{ color: C.sub }} />
                      {editing ? (
                        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                          <input type="time" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} aria-label="Clocked in" style={timeIn} />–
                          <input type="time" value={edit.end} onChange={(e) => setEdit({ ...edit, end: e.target.value })} aria-label="Clocked out" style={timeIn} />
                        </span>
                      ) : <strong style={{ fontWeight: 600 }}>{f.start} – {f.end}</strong>}
                      <span style={{ marginLeft: "auto", fontFamily: "var(--font-outfit), sans-serif", fontSize: 12, color: f.overBy > 0 ? C.coral : C.sub }}>
                        {f.rota ? (f.overBy > 15 ? `+${f.overBy} min over rota` : `Rota: ${f.rota.start} – ${f.rota.end}`) : "Not on the rota"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => decide(f, "approve", editing ? { start: edit.start, end: edit.end } : undefined)} disabled={!!busy} style={{ flex: 1, height: 36, border: 0, borderRadius: 18, background: C.ink, color: "#ffffff", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>
                        {busy === f.id + "approve" ? "Saving…" : editing ? "Approve these times" : "Approve"}
                      </button>
                      <button onClick={() => setEdit(editing ? null : { id: f.id, start: f.start, end: f.end })} style={small}>{editing ? "Cancel" : "Edit"}</button>
                      {!editing && <button onClick={() => decide(f, "decline")} disabled={!!busy} style={small}>{busy === f.id + "decline" ? "…" : "Decline"}</button>}
                    </div>
                  </article>
                );
              })}
              {data.missed.length > 0 && (
                <div style={{ marginTop: 4, padding: 12, borderRadius: 16, background: "#fef3c7", color: "#92400e", fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                  <strong style={{ fontWeight: 600 }}>No clock-out yet</strong>
                  {data.missed.map((m) => <span key={m.staffId + m.date}>{firstName(m.name)} · {DAY(m.date)} · in at {m.in}. Ask them to send a fix from their phone.</span>)}
                </div>
              )}
              {(data.watchList || []).length > 0 && (
                <div style={{ marginTop: 4, padding: 12, borderRadius: 16, background: "#f5f5f4", color: "#44403c", fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                  <strong style={{ fontWeight: 600 }}>Watch list</strong>
                  <span style={{ fontSize: 12, color: "#78716c" }}>Asked to fix their hours more than once in a week, in the last 8 weeks. Staff can fix their hours once a week.</span>
                  {data.watchList!.map((w) => <span key={w.staffId}>{w.name} · {w.weeks === 1 ? "1 week" : `${w.weeks} weeks`} with more than one fix</span>)}
                </div>
              )}
            </section>

            <section aria-labelledby="ts-h" style={{ flex: "999 1 460px", minWidth: 0, borderRadius: 24, background: "#ffffff", padding: 8, boxShadow: "0 1px 2px rgba(20,20,20,0.05)", overflowX: "auto" }}>
              <h2 id="ts-h" style={{ margin: 0, padding: "10px 12px 6px", fontSize: 16, fontWeight: 600 }}>By person</h2>
              {data.rows.length === 0 ? <p style={{ margin: 0, padding: "4px 12px 12px", fontSize: 13, color: C.sub }}>No shifts or clock-ins this week.</p> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ color: C.sub, textAlign: "left" }}>
                    <th scope="col" style={{ padding: "8px 12px", fontWeight: 500 }}>Staff</th><th scope="col" style={{ padding: 8, fontWeight: 500 }}>Shifts</th>
                    <th scope="col" style={{ padding: 8, fontWeight: 500 }}>Rota</th><th scope="col" style={{ padding: 8, fontWeight: 500 }}>Worked</th><th scope="col" style={{ padding: "8px 12px", fontWeight: 500 }}><span className="sr-only">Notes</span></th>
                  </tr></thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.staffId} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td style={{ padding: 12 }}>{r.name}</td>
                        <td style={{ padding: 8 }}>{r.shifts}</td>
                        <td style={{ padding: 8 }}>{hShort(r.rota)}</td>
                        <td style={{ padding: 8, fontWeight: 600 }}>{hm(r.worked)}</td>
                        <td style={{ padding: "8px 12px", display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {r.fixes > 0 && <span style={tag(C.coralBg, C.coral)}>{r.fixes} fix{r.fixes > 1 ? "es" : ""}</span>}
                          {r.missed.map((d) => <span key={d} style={tag("#fef3c7", "#92400e")}>No clock-out {WD(d)}</span>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
      <p style={{ margin: "0 4px", fontSize: 12, color: C.sub }}>Approved fixes are saved back to the clock-in app as that day&rsquo;s hours, with who approved them. The export is the week&rsquo;s hours and pay per person, ready for payroll.</p>
    </ManagerFrame>
  );
}

const navBtn: CSSProperties = { width: 32, height: 32, border: 0, borderRadius: 16, background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.08)", cursor: "pointer", color: C.ink };
const timeIn: CSSProperties = { height: 30, border: `1px solid ${C.field}`, borderRadius: 10, padding: "0 6px", fontFamily: "inherit", fontSize: 13, background: "#ffffff", color: C.ink };
