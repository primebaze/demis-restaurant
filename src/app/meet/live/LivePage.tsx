"use client";

import { useEffect, useState } from "react";
import { Icon, personColourLight, initial, firstName, BRANCH } from "../ui";
import { ManagerFrame, PAGE as C, panel, mono, useJson, postJson } from "../ManagerShell";

/* 5 · Live attendance. Values from the design canvas. */

type Attendee = { id: number; name: string; branch: string; invited: boolean; presence: string; joinedAt: string; leftAt: string; seconds: number; onShift: boolean };
type Detail = { meeting: { id: string; title: string; kind: string; status: string; startedAt: string; time: string }; attendees: Attendee[] };

const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const DOT: Record<string, string> = { in: "#22c55e", reconnecting: "#f59e0b", left: "#a8a29e", not_joined: "#ef4444" };

export default function LivePage({ id }: { id: string }) {
  const { data, error, reload } = useJson<Detail>(`/api/meet/meetings/${id}`);
  const [reminded, setReminded] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => { reload(); tick((x) => x + 1); }, 10_000); return () => clearInterval(t); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const link = typeof window !== "undefined" ? `${window.location.origin}/meet/call/${id}` : "";
  const m = data?.meeting;
  const list = data?.attendees || [];
  const count = (p: string) => list.filter((a) => a.presence === p).length;
  const mins = m?.startedAt ? Math.max(0, Math.round((Date.now() - new Date(m.startedAt).getTime()) / 60_000)) : 0;

  async function remind(a: Attendee) {
    const r = await postJson(`/api/meet/meetings/${id}`, { action: "remind", clockinId: a.id });
    if (r.ok) setReminded((x) => ({ ...x, [a.id]: hm(new Date().toISOString()) }));
  }

  return (
    <ManagerFrame current="calendar">
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "4px 4px 0" }}>
        <a href="/meet" aria-label="Back to home" style={{ width: 40, height: 40, borderRadius: 20, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.08)", color: C.ink }}><Icon name="arrow_back" size={20} /></a>
        <div style={{ flex: "1 1 260px" }}>
          <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: m?.status === "live" ? C.coral : C.sub, fontWeight: 500 }}>
            {m?.status === "live" ? <><span style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent }} />Live · started {hm(m.startedAt)} · {mins} min</> : m ? `Not live · ${m.status === "scheduled" ? `starts ${m.time}` : "ended"}` : ""}
          </p>
          <h1 style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>{m?.title || "…"}</h1>
        </div>
        {m?.status === "live" && <a href={`/meet/call/${id}`} style={{ height: 40, boxSizing: "border-box", display: "inline-flex", alignItems: "center", gap: 7, padding: "0 18px", borderRadius: 20, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, textDecoration: "none" }}><Icon name="videocam" size={19} fill />Join</a>}
      </header>
      {error ? <p style={{ ...panel, margin: 0, color: C.sub }}>{error}</p> : !data ? <p style={{ ...panel, margin: 0, color: C.sub }}>Loading…</p> : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "10px 10px 10px 18px", borderRadius: 22, background: "#ffffff", boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
            <Icon name="link" size={20} style={{ color: C.sub }} />
            <span style={{ flex: "1 1 220px", minWidth: 0, fontFamily: mono, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.replace(/^https?:\/\//, "")}</span>
            <button onClick={() => navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })} style={{ height: 38, padding: "0 16px", border: 0, borderRadius: 19, background: C.page, fontSize: 13, fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap", color: C.ink, cursor: "pointer" }}>{copied ? "Copied" : "Copy link"}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${m!.title} has started. Join on Demi's Meetings: ${link}`)}`} target="_blank" rel="noreferrer" style={{ height: 38, padding: "0 16px", border: 0, borderRadius: 19, background: C.ink, color: "#ffffff", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}><Icon name="send" size={17} />Send on WhatsApp</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[["In the call", count("in"), DOT.in, false], ["Reconnecting", count("reconnecting"), DOT.reconnecting, false], ["Not here yet", list.filter((a) => a.invited && a.presence === "not_joined").length, DOT.not_joined, true], ["Invited", list.filter((a) => a.invited).length, "", false]].map(([l, v, dot, hot]) => (
              <div key={String(l)} style={hot && Number(v) > 0 ? { borderRadius: 20, background: C.coralBg, padding: 16 } : { borderRadius: 20, background: "#ffffff", padding: 16, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: hot && Number(v) > 0 ? "#9a3412" : C.sub }}>{dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: String(dot) }} />}{l as string}</p>
                <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em", color: hot && Number(v) > 0 ? C.coral : C.ink }}>{v as number}</p>
              </div>
            ))}
          </div>
          <section aria-labelledby="ppl-h" style={{ borderRadius: 24, background: "#ffffff", padding: 8, boxShadow: "0 1px 2px rgba(20,20,20,0.05)", overflowX: "auto" }}>
            <h2 id="ppl-h" style={{ margin: 0, padding: "12px 12px 8px", fontSize: 16, fontWeight: 600 }}>People</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4, minWidth: 620 }}>
              {list.map((a) => {
                const col = personColourLight(a.id);
                const late = a.joinedAt && m?.startedAt ? Math.round((new Date(a.joinedAt).getTime() - new Date(m.startedAt).getTime()) / 60_000) : 0;
                const missing = a.presence === "not_joined";
                const label = a.presence === "in" ? "In the call" : a.presence === "reconnecting" ? "Reconnecting" : a.presence === "left" ? "Left" : "Not here";
                return (
                  <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 16, background: missing && a.onShift ? "#fff8f5" : "transparent" }}>
                    <span style={{ width: 36, height: 36, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(a.name)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 500 }}>{firstName(a.name)}{late > 5 && <span style={{ marginLeft: 4, padding: "2px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{late} min late</span>}{!a.invited && <span style={{ marginLeft: 4, fontSize: 11, color: C.sub }}>not invited</span>}</span>
                      <span style={{ display: "block", fontSize: 12, color: C.sub }}>{[BRANCH[a.branch], missing ? (a.onShift ? "on shift now" : "off shift") : ""].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span style={{ width: 120, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: missing ? (a.onShift ? "#b91c1c" : C.sub) : C.ink }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: DOT[a.presence] }} />{label}</span>
                    <span style={{ width: 120, fontSize: 13, color: C.sub }}>{a.joinedAt ? <>Joined <span style={{ fontFamily: mono, color: C.ink }}>{hm(a.joinedAt)}</span></> : reminded[a.id] ? `Reminded ${reminded[a.id]}` : ""}</span>
                    <span style={{ width: 70, textAlign: "right", fontSize: 13, fontWeight: 500 }}>{a.joinedAt ? `${Math.max(1, Math.round(a.seconds / 60))} min` : ""}</span>
                    {missing && m?.status === "live" ? <button onClick={() => remind(a)} style={{ width: 110, height: 36, border: 0, borderRadius: 18, background: a.onShift ? C.ink : C.page, color: a.onShift ? "#ffffff" : C.ink, fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>{reminded[a.id] ? "Remind again" : "Remind"}</button> : <span style={{ width: 110 }} />}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
      <p style={{ margin: "0 4px", fontSize: 12, color: C.sub }}>&ldquo;On shift&rdquo; comes from the rota. Late means more than 5 minutes after the start. The link only works for staff signed in to Demi&rsquo;s Meetings.</p>
    </ManagerFrame>
  );
}
