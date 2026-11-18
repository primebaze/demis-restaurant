"use client";

import { useState } from "react";
import { Icon } from "../ui";
import { ManagerFrame, PageHead, PAGE as C, panel, useJson } from "../ManagerShell";
import NewMeeting from "../NewMeeting";

/* Meeting notes: every meeting that has happened, newest first, opening into design 6. */

type Meeting = { id: string; title: string; kind: string; status: string; date: string; time: string; minutes: number; private: boolean; invited: { id: number }[]; came: number; startedAt: string; endedAt: string };

const DAY = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const back = (n: number) => new Date(Date.now() - n * 86400_000).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

export default function NotesPage() {
  const { data, error } = useJson<{ meetings: Meeting[] }>(`/api/meet/meetings?from=${back(120)}&to=${today()}`);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const done = (data?.meetings || []).filter((m) => m.status === "ended" || m.status === "ready" || m.status === "live").reverse();
  const shown = done.filter((m) => !q.trim() || m.title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <ManagerFrame current="notes">
      <PageHead over="Summaries, decisions, tasks and recordings" title="Meeting notes">
        <div style={{ position: "relative", flex: "0 1 260px" }}>
          <Icon name="search" size={19} style={{ position: "absolute", left: 14, top: 11, color: C.sub }} />
          <input aria-label="Search meetings" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search meetings" style={{ width: "100%", boxSizing: "border-box", height: 42, padding: "0 14px 0 42px", border: 0, borderRadius: 21, background: "#ffffff", fontSize: 14, fontFamily: "inherit", boxShadow: "0 1px 2px rgba(20,20,20,0.08)" }} />
        </div>
        <button onClick={() => setCreating(true)} style={{ height: 40, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 18px", border: 0, borderRadius: 20, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}><Icon name="add" size={19} />New meeting</button>
      </PageHead>
      {error ? <p style={{ ...panel, margin: 0, color: C.sub }}>{error}</p> : !data ? <p style={{ ...panel, margin: 0, color: C.sub }}>Loading…</p> : (
        <section aria-label="Meetings" style={{ borderRadius: 24, background: "#ffffff", padding: 8, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
          {shown.length === 0 && <p style={{ margin: 0, padding: 14, color: C.sub, fontSize: 13 }}>{q ? "No meetings match that." : "No meetings yet. Once a meeting ends, its notes appear here."}</p>}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {shown.map((m) => {
              const badge = m.status === "live" ? ["Live now", "#fff1ec", C.coral] : m.status === "ended" ? ["Notes being written", "#fef3c7", "#92400e"] : ["Notes ready", "#ecfdf5", "#065f46"];
              return (
                <li key={m.id}>
                  <a href={m.status === "live" ? `/meet/live/${m.id}` : `/meet/notes/${m.id}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, borderRadius: 16, color: C.ink, textDecoration: "none", flexWrap: "wrap" }}>
                    <span style={{ width: 40, height: 40, borderRadius: 14, background: m.kind === "room" ? "#fef3e2" : C.coralBg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      <Icon name={m.private ? "lock" : m.kind === "room" ? "mic" : "videocam"} size={20} fill style={{ color: m.kind === "room" ? "#b45309" : C.accent }} />
                    </span>
                    <span style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 500 }}>{m.title}</span>
                      <span style={{ display: "block", marginTop: 2, fontSize: 12, color: C.sub }}>{DAY(m.date)} · {m.time} · {m.kind === "room" ? "Room recording" : "Video call"} · {m.came} of {m.invited.length || m.came} came</span>
                    </span>
                    <span style={{ padding: "3px 10px", borderRadius: 999, background: badge[1], color: badge[2], fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>{badge[0]}</span>
                    <Icon name="chevron_right" size={20} style={{ color: C.sub }} />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {creating && <NewMeeting onClose={() => setCreating(false)} onCreated={() => { setCreating(false); window.location.href = "/meet/calendar"; }} />}
    </ManagerFrame>
  );
}
