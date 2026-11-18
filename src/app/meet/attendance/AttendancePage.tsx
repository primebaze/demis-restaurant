"use client";

import { useState, type CSSProperties } from "react";
import { Icon, personColourLight, initial, firstName, BRANCH } from "../ui";
import { ManagerFrame, PageHead, PAGE as C, panel, btnWhite, useJson } from "../ManagerShell";

/* 11 · Attendance history. Values from the design canvas. */

type Cell = "attended" | "late" | "missed_on" | "missed_off" | "not_invited";
type Data = {
  period: string; from: string;
  stats: { held: number; average: number; late: number; missedOnShift: number };
  meetings: { id: string; date: string; title: string; short: string }[];
  rows: { id: number; name: string; branch: string; cells: Cell[]; rate: number | null }[];
};

const LABEL: Record<Cell, string> = { attended: "Attended", late: "Late", missed_on: "Missed, on shift", missed_off: "Missed, off shift", not_invited: "Not invited" };
const box = (c: Cell): CSSProperties => {
  const base: CSSProperties = { display: "inline-block", width: 22, height: 22, borderRadius: 7, verticalAlign: "middle" };
  if (c === "attended") return { ...base, background: "#16a34a" };
  if (c === "late") return { ...base, background: "#f59e0b" };
  if (c === "missed_off") return { ...base, background: "#ece8e3" };
  if (c === "missed_on") return { ...base, border: "2px solid #dc2626", boxSizing: "border-box" };
  return { ...base, color: "#c9c3bc", borderRadius: 0 };
};
const DM = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

export default function AttendancePage() {
  const [period, setPeriod] = useState("month");
  const { data, error } = useJson<Data>(`/api/meet/attendance?period=${period}`);

  const stat = (l: string, v: string, hot = false) => (
    <div style={hot ? { borderRadius: 20, background: C.coralBg, padding: 16 } : { borderRadius: 20, background: "#ffffff", padding: 16, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
      <p style={{ margin: 0, fontSize: 13, color: hot ? "#9a3412" : C.sub }}>{l}</p>
      <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em", color: hot ? C.coral : C.ink }}>{v}</p>
    </div>
  );

  return (
    <ManagerFrame current="attendance">
      <PageHead over="Every meeting, every person" title="Attendance">
        <div role="group" aria-label="Period" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 20, background: "#ebe7e2" }}>
          {[["week", "This week"], ["month", "This month"], ["3months", "3 months"]].map(([k, l]) => (
            <button key={k} aria-pressed={period === k} onClick={() => setPeriod(k)} style={{ height: 32, padding: "0 14px", border: 0, borderRadius: 16, background: period === k ? "#ffffff" : "transparent", fontSize: 13, fontWeight: period === k ? 600 : 500, fontFamily: "inherit", color: C.ink, boxShadow: period === k ? "0 1px 2px rgba(20,20,20,0.08)" : "none", cursor: "pointer" }}>{l}</button>
          ))}
        </div>
        <a href={`/api/meet/attendance?period=${period}&export=csv`} download style={btnWhite}><Icon name="download" size={19} />Export</a>
      </PageHead>
      {error ? <p style={{ ...panel, margin: 0, color: C.sub }}>{error}</p> : !data ? <p style={{ ...panel, margin: 0, color: C.sub }}>Loading…</p> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {stat("Meetings held", String(data.stats.held))}
            {stat("Average attendance", `${data.stats.average}%`)}
            {stat("Late arrivals", String(data.stats.late))}
            {stat("Missed while on shift", String(data.stats.missedOnShift), data.stats.missedOnShift > 0)}
          </div>
          <section aria-labelledby="grid-h" style={{ borderRadius: 24, background: "#ffffff", padding: 16, boxShadow: "0 1px 2px rgba(20,20,20,0.05)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
              <h2 id="grid-h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>By person</h2>
              <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: C.sub }}>
                {(["attended", "late", "missed_on", "missed_off"] as Cell[]).map((c) => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ ...box(c), width: 12, height: 12, borderRadius: 4, borderWidth: c === "missed_on" ? 2 : undefined }} />{LABEL[c]}</span>)}
              </div>
            </div>
            {data.meetings.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: C.sub }}>No meetings in this period yet.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: Math.max(560, 200 + data.meetings.length * 72), borderCollapse: "separate", borderSpacing: "0 4px", fontSize: 14 }}>
                  <thead>
                    <tr style={{ fontSize: 12, color: C.sub, textAlign: "center" }}>
                      <th scope="col" style={{ textAlign: "left", fontWeight: 500, padding: "0 8px 6px" }}>Person</th>
                      {data.meetings.map((m) => <th key={m.id} scope="col" style={{ fontWeight: 500 }}><a href={`/meet/notes/${m.id}`} title={m.title} style={{ color: C.sub, textDecoration: "none" }}>{DM(m.date)}<br />{m.short}</a></th>)}
                      <th scope="col" style={{ textAlign: "right", fontWeight: 500, padding: "0 8px 6px" }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => {
                      const low = r.rate !== null && r.rate < 75;
                      const col = personColourLight(r.id);
                      return (
                        <tr key={r.id} style={{ background: low ? "#fff8f5" : undefined }}>
                          <th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: 8, borderRadius: low ? "12px 0 0 12px" : undefined, whiteSpace: "nowrap" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 28, height: 28, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(r.name)}</span>
                              {firstName(r.name)} {r.branch && BRANCH[r.branch] && <span style={{ fontWeight: 400, color: C.sub }}>{BRANCH[r.branch]}</span>}
                            </span>
                          </th>
                          {r.cells.map((c, i) => <td key={i} style={{ textAlign: "center" }}><span role="img" aria-label={LABEL[c]} title={`${data.meetings[i].title}: ${LABEL[c]}`} style={box(c)}>{c === "not_invited" ? "·" : ""}</span></td>)}
                          <td style={{ textAlign: "right", padding: "0 8px", fontWeight: 600, color: low ? C.coral : C.ink, borderRadius: low ? "0 12px 12px 0" : undefined }}>{r.rate === null ? "–" : `${r.rate}%`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      <p style={{ margin: "0 4px", fontSize: 12, color: C.sub }}>On shift or off shift comes from the rota for that day. Late means joining more than 5 minutes after the start. Room recordings count everyone ticked as in the room.</p>
    </ManagerFrame>
  );
}
