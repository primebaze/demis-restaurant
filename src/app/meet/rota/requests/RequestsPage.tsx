"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Icon, IconFont, personColourLight, initial, firstName, ago } from "../../ui";
import { Sidebar, TopBar } from "../../ManagerShell";

/* 36 · Admin: swaps and time off. Values from the design canvas. */

const C = { page: "#f6f4f1", ink: "#141414", sub: "#6e6a65", body: "#3b3834", line: "#f0ece7" };
const card: CSSProperties = { borderRadius: 22, background: "#ffffff", padding: 16, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" };
const mono = "var(--font-geist-mono), 'Geist Mono', monospace";
const BRANCH_NAME: Record<string, string> = { cricklewood: "Cricklewood", streatham: "Streatham" };
const DAY = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const range = (a: string, b: string) => (a === b ? DAY(a) : `${DAY(a)} – ${DAY(b)}`);
const shortWhen = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/London" });

type Item = {
  id: string; kind: "swap" | "timeoff"; status: string; by: string; byId: number; target: string; targetId: number;
  date: string; start: string; end: string; branch: string; from: string; to: string; reason: string; createdAt: string;
  checks: { ok: boolean; text: string }[];
};
type Recent = { id: string; kind: string; status: string; by: string; target: string; date: string; from: string; to: string; decidedBy: string; decidedAt: string };

export default function RequestsPage() {
  const [data, setData] = useState<{ waiting: Item[]; withColleague: Item[]; recent: Recent[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [part, setPart] = useState<{ id: string; from: string; to: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/meet/requests/manage", { cache: "no-store" }).catch(() => null);
    if (!res) return setError("Can't connect right now");
    if (res.status === 401 || res.status === 403) return setError("This page is for managers.");
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error || "Can't load requests");
    setError("");
    setData(d);
  }, []);

  useEffect(() => {
    load();
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [load]);

  async function decide(id: string, action: "approve" | "decline", extra: object = {}, done = "") {
    setBusy(id + action);
    setNote("");
    const res = await fetch("/api/meet/requests/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, ...extra }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy("");
    if (!res?.ok) return setNote(d?.error || "Couldn't save that");
    setPart(null);
    setNote(done);
    load();
  }

  const avatar = (id: number, name: string) => {
    const col = personColourLight(id);
    return <span style={{ width: 34, height: 34, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(name)}</span>;
  };
  const chip = (icon: string, label: string) => (
    <span style={{ padding: "4px 10px", borderRadius: 999, background: C.page, fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={icon} size={15} />{label}</span>
  );
  const btn = (primary: boolean): CSSProperties => ({ flex: primary ? 1 : undefined, height: 38, padding: primary ? undefined : "0 16px", border: 0, borderRadius: 19, background: primary ? C.ink : C.page, color: primary ? "#ffffff" : C.ink, fontSize: 13, fontWeight: primary ? 500 : 400, fontFamily: "inherit" });

  const waiting = data?.waiting || [];

  return (
    <div style={{ minHeight: "100dvh", background: C.page, color: C.ink, fontSize: 14, display: "flex", flexWrap: "wrap", alignContent: "flex-start", width: "100%", maxWidth: "100vw", overflowX: "clip" }}>
      <IconFont />
      <style>{`html,body{background:${C.page};overflow-x:clip;overscroll-behavior-x:none}`}</style>
      <Sidebar current="rota" badges={{ rota: waiting.length }} />
      <TopBar />

      <main className="px-4 pb-6 pt-[18px] md:pl-2 md:pr-6" style={{ flex: "999 1 560px", minWidth: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "4px 4px 0" }}>
          <div style={{ flex: "1 1 220px" }}>
            <p style={{ margin: 0, fontSize: 13, color: C.sub }}>Rota · from staff phones</p>
            <h1 style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>Swaps and time off</h1>
          </div>
          <div role="tablist" aria-label="Rota" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 20, background: "#ffffff", boxShadow: "0 1px 2px rgba(20,20,20,0.08)" }}>
            <a href="/meet/rota" role="tab" aria-selected="false" style={{ height: 32, padding: "0 14px", borderRadius: 16, color: C.body, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Build the rota</a>
            <span role="tab" aria-selected="true" style={{ height: 32, padding: "0 14px", borderRadius: 16, background: C.ink, color: "#ffffff", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center" }}>Requests · {waiting.length}</span>
          </div>
        </header>

        {note && <p role="status" style={{ margin: "0 4px", fontSize: 13, color: C.body }}>{note}</p>}
        {error && <p style={{ ...card, margin: 0, color: C.sub }}>{error}</p>}

        {!error && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
            <section aria-labelledby="rq-h" style={{ flex: "999 1 460px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 id="rq-h" style={{ margin: "0 4px", fontSize: 16, fontWeight: 600 }}>Waiting for you</h2>
              {!data && <div style={{ ...card, height: 140 }} />}
              {data && waiting.length === 0 && <p style={{ ...card, margin: 0, color: C.sub }}>Nothing waiting. Swaps arrive here once a colleague has agreed; time off arrives straight away.</p>}

              {waiting.map((r) => (
                <article key={r.id} style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {r.kind === "swap" ? chip("swap_horiz", "Swap") : chip("beach_access", "Time off")}
                    <span style={{ fontSize: 12, color: C.sub }}>Asked {ago(r.createdAt)}</span>
                    {r.kind === "swap" && <span style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 999, background: "#d1fae5", color: "#065f46", fontSize: 12, fontWeight: 500 }}>{firstName(r.target)} agreed</span>}
                  </div>

                  {r.kind === "swap" ? (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{avatar(r.byId, r.by)}<span style={{ fontWeight: 500 }}>{firstName(r.by)}</span></span>
                      <Icon name="arrow_forward" size={20} style={{ color: C.sub }} />
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{avatar(r.targetId, r.target)}<span style={{ fontWeight: 500 }}>{firstName(r.target)}</span></span>
                      <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 13 }}>{DAY(r.date)} · {r.start} – {r.end}{r.branch ? ` · ${BRANCH_NAME[r.branch]}` : ""}</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{avatar(r.byId, r.by)}<span style={{ fontWeight: 500 }}>{firstName(r.by)}</span></span>
                      <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 13 }}>{range(r.from, r.to)}</span>
                    </div>
                  )}

                  {r.reason && <p style={{ margin: 0, padding: "10px 12px", borderRadius: 14, background: C.page, fontSize: 13, color: C.body }}>&ldquo;{r.reason}&rdquo;</p>}
                  {r.checks.map((c, i) => (
                    <p key={i} style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: c.ok ? "#047857" : "#b45309" }}>
                      <Icon name={c.ok ? "check" : "warning"} size={16} />{c.text}
                    </p>
                  ))}

                  {part?.id === r.id ? (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: C.sub }}>From
                        <input type="date" min={r.from} max={r.to} value={part.from} onChange={(e) => setPart({ ...part, from: e.target.value })} style={{ height: 38, padding: "0 10px", border: 0, borderRadius: 12, background: C.page, fontFamily: "inherit", fontSize: 14 }} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: C.sub }}>To
                        <input type="date" min={r.from} max={r.to} value={part.to} onChange={(e) => setPart({ ...part, to: e.target.value })} style={{ height: 38, padding: "0 10px", border: 0, borderRadius: 12, background: C.page, fontFamily: "inherit", fontSize: 14 }} />
                      </label>
                      <button disabled={!!busy} onClick={() => decide(r.id, "approve", { from: part.from, to: part.to }, `Approved ${range(part.from, part.to)} for ${firstName(r.by)}.`)} style={btn(true)}>Approve these days</button>
                      <button onClick={() => setPart(null)} style={btn(false)}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button disabled={!!busy} onClick={() => decide(r.id, "approve", {}, r.kind === "swap" ? `Approved. ${firstName(r.target)} now has the shift.` : `Time off approved for ${firstName(r.by)}.`)} style={btn(true)}>
                        {busy === r.id + "approve" ? "Saving…" : r.kind === "swap" ? "Approve and update rota" : "Approve"}
                      </button>
                      {r.kind === "timeoff" && r.from !== r.to && <button onClick={() => setPart({ id: r.id, from: r.from, to: r.to })} style={btn(false)}>Approve part</button>}
                      <button disabled={!!busy} onClick={() => confirm(`Decline ${firstName(r.by)}'s request?`) && decide(r.id, "decline", {}, "Declined. They've been told.")} style={btn(false)}>Decline</button>
                    </div>
                  )}
                </article>
              ))}

              {data && data.withColleague.length > 0 && (
                <>
                  <h2 style={{ margin: "8px 4px 0", fontSize: 16, fontWeight: 600 }}>Waiting for a colleague</h2>
                  {data.withColleague.map((r) => (
                    <article key={r.id} style={{ ...card, flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {chip("swap_horiz", "Swap")}
                      <span style={{ flex: "1 1 200px", minWidth: 0 }}>
                        {firstName(r.by)} wants to give away <span style={{ fontFamily: mono, fontSize: 13 }}>{DAY(r.date)} · {r.start} – {r.end}</span>
                      </span>
                      <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
                        {r.status === "asked" ? `Asked ${firstName(r.target)}` : "No one yet"}
                      </span>
                    </article>
                  ))}
                </>
              )}
            </section>

            <aside className="lg:sticky lg:top-[18px] lg:max-h-[calc(100dvh-36px)] lg:overflow-y-auto" aria-labelledby="dn-h" style={{ ...card, flex: "1 1 300px", maxWidth: 360, minWidth: 0, gap: 10 }}>
              <h2 id="dn-h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Recently decided</h2>
              {data && data.recent.length === 0 && <p style={{ margin: 0, fontSize: 13, color: C.sub }}>Nothing decided yet.</p>}
              {(data?.recent || []).map((r) => (
                <p key={r.id} style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <Icon name={r.status === "approved" ? "check_circle" : "cancel"} size={18} style={{ color: r.status === "approved" ? "#047857" : "#b91c1c" }} />
                  <span style={{ flex: 1, minWidth: 0 }}>{r.kind === "swap" ? `${firstName(r.by)} ↔ ${firstName(r.target)}, ${DAY(r.date)}` : `${firstName(r.by)} off ${range(r.from, r.to)}`}</span>
                  <span style={{ color: C.sub, whiteSpace: "nowrap" }}>{firstName(r.decidedBy)} · {r.decidedAt ? shortWhen(r.decidedAt) : ""}</span>
                </p>
              ))}
              <p style={{ margin: "6px 0 0", padding: "10px 12px", borderRadius: 14, background: C.page, fontSize: 12, color: C.sub }}>Approving a swap updates the rota in the clock-in app and tells both people.</p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
