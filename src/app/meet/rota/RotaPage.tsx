"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Icon, IconFont, firstName } from "../ui";
import { Sidebar, TopBar } from "../ManagerShell";

/* 20 · Admin: build the rota. Values from the design canvas. */

const C = { page: "#f6f4f1", ink: "#141414", sub: "#6e6a65", body: "#3b3834", line: "#f0ece7", coral: "#c2410c", dash: "#e6e1db", plus: "#a19c96" };

// Shift colours by role, as in the design (supervisor coral, kitchen indigo, floor green).
const ROLE_COLOUR: Record<string, { bg: string; fg: string }> = {
  manager: { bg: "#fff1ec", fg: "#7c2d12" },
  supervisor: { bg: "#fff1ec", fg: "#7c2d12" },
  cook: { bg: "#eef2ff", fg: "#312e81" },
  chef: { bg: "#eef2ff", fg: "#312e81" },
  server: { bg: "#ecfdf5", fg: "#065f46" },
  host: { bg: "#ecfdf5", fg: "#065f46" },
  bartender: { bg: "#fef3c7", fg: "#92400e" },
};
const roleColour = (role: string) => ROLE_COLOUR[role] || { bg: "#f3f0ec", fg: C.body };
const roleLabel = (r: string) => (r ? r[0].toUpperCase() + r.slice(1) : "");

type Person = { id: number; name: string; role: string; branch: string };
type Shift = { id: number; staffId: number; date: string; start: string; end: string; notes: string | null; hours: number };
type Week = {
  branch: "cricklewood" | "streatham"; week: string; weekLabel: string; days: string[]; today: string;
  people: Person[]; shifts: Shift[];
  published: { at: string; by: string; changedPeople: number[]; seen: number; onRota: number } | null;
};
type Edit = { id?: number; person: Person; date: string; start: string; end: string; notes: string };

const BRANCH_NAME = { cricklewood: "Cricklewood", streatham: "Streatham" } as const;
const short = (t: string) => (t.endsWith(":00") ? t.slice(0, 2) : t); // 09:00 → 09, 09:30 stays
const dayHead = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const dayLong = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtHours = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1));
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

const btnWhite: CSSProperties = { height: 40, padding: "0 14px", border: 0, borderRadius: 20, background: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(20,20,20,0.08)", color: C.ink };
const btnBlack: CSSProperties = { height: 40, padding: "0 18px", border: 0, borderRadius: 20, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 };
const panel: CSSProperties = { borderRadius: 24, background: "#ffffff", padding: 16, display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" };

export default function RotaPage() {
  const [branch, setBranch] = useState<"cricklewood" | "streatham" | "">("");
  const [week, setWeek] = useState("");
  const [data, setData] = useState<Week | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState<Edit | null>(null);
  const openEdit = (e: Edit) => { setNote(""); setEdit(e); };

  const load = useCallback(async (b = branch, w = week) => {
    const q = new URLSearchParams();
    if (b) q.set("branch", b);
    if (w) q.set("week", w);
    const res = await fetch(`/api/meet/rota?${q}`, { cache: "no-store" }).catch(() => null);
    if (!res) return setError("Can't connect right now");
    if (res.status === 401 || res.status === 403) return setError("This page is for managers.");
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error || "Can't load the rota right now");
    setError("");
    setData(d);
    setBranch(d.branch);
    setWeek(d.week);
  }, [branch, week]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(body: object, key: string, done?: string) {
    setBusy(key);
    setNote("");
    const res = await fetch("/api/meet/rota", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy("");
    if (!res?.ok) { setNote(d?.error || "Couldn't save that"); return false; }
    if (done) setNote(done.replace("{n}", String(d?.copied ?? d?.people ?? "")));
    await load();
    return true;
  }

  const byCell = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of data?.shifts || []) m.set(`${s.staffId}|${s.date}`, [...(m.get(`${s.staffId}|${s.date}`) || []), s]);
    return m;
  }, [data]);

  const totals = useMemo(() => {
    const perPerson = new Map<number, number>();
    const perDay = new Map<string, Set<number>>();
    let all = 0;
    for (const s of data?.shifts || []) {
      perPerson.set(s.staffId, (perPerson.get(s.staffId) || 0) + s.hours);
      perDay.set(s.date, new Set([...Array.from(perDay.get(s.date) || []), s.staffId]));
      all += s.hours;
    }
    return { perPerson, perDay, all, people: perPerson.size };
  }, [data]);

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
      : `Send the ${BRANCH_NAME[data.branch]} rota for ${data.weekLabel} to ${n} ${n === 1 ? "person" : "people"}? Each gets a notification and an email with their shifts.`;
    if (!confirm(msg)) return;
    await act({ action: "publish", branch: data.branch, week: data.week }, "publish", pub ? "Changes sent to {n}." : "Rota sent to {n} people.");
  }

  return (
    <div style={{ minHeight: "100dvh", background: C.page, color: C.ink, fontSize: 14, display: "flex", flexWrap: "wrap", alignContent: "flex-start", width: "100%", maxWidth: "100vw", overflowX: "clip" }}>
      <IconFont />
      <style>{`html,body{background:${C.page};overflow-x:hidden;overscroll-behavior-x:none}`}</style>
      <Sidebar current="rota" />
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
              <button aria-label="Previous week" disabled={!data || !!busy} onClick={() => data && load(data.branch, addDays(data.week, -7))} style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.08)" }}><Icon name="chevron_left" size={20} /></button>
              <button aria-label="Next week" disabled={!data || !!busy} onClick={() => data && load(data.branch, addDays(data.week, 7))} style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(20,20,20,0.08)" }}><Icon name="chevron_right" size={20} /></button>
            </div>
          </div>
          <label style={{ ...btnWhite, position: "relative" }}>
            <Icon name="storefront" size={19} />
            {branch ? BRANCH_NAME[branch] : "Branch"}
            <Icon name="expand_more" size={18} />
            <select aria-label="Branch" value={branch} onChange={(e) => load(e.target.value as "cricklewood" | "streatham", week)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", fontSize: 16 }}>
              <option value="cricklewood">Cricklewood</option>
              <option value="streatham">Streatham</option>
            </select>
          </label>
          <button disabled={!data || !!busy} onClick={() => data && confirm(`Copy last week's ${BRANCH_NAME[data.branch]} shifts into ${data.weekLabel}? People already working a day keep what they have.`) && act({ action: "copy_last_week", branch: data.branch, week: data.week }, "copy", "Copied {n} shifts from last week.")} style={btnWhite}>
            <Icon name="content_copy" size={19} />{busy === "copy" ? "Copying…" : "Copy last week"}
          </button>
          <button disabled={!data || !!busy || (!!pub && !changed)} onClick={publish} style={{ ...btnBlack, opacity: !!pub && !changed ? 0.45 : 1 }}>
            <Icon name="send" size={19} />{busy === "publish" ? "Sending…" : pub ? (changed ? "Send changes" : "Sent") : "Publish to staff"}
          </button>
        </header>

        {note && <p role="status" style={{ margin: "0 4px", fontSize: 13, color: C.body }}>{note}</p>}

        {error ? (
          <p style={{ ...panel, margin: 0, color: C.sub }}>{error}</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
            <section aria-label="Week grid" style={{ flex: "999 1 640px", minWidth: 0, borderRadius: 24, background: "#ffffff", padding: 10, boxShadow: "0 1px 2px rgba(20,20,20,0.05)", overflowX: "auto" }}>
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
                    {data.people.map((p) => (
                      <tr key={p.id}>
                        <th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: "4px 8px", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {firstName(p.name)}<br /><span style={{ fontWeight: 400, fontSize: 11, color: C.sub }}>{roleLabel(p.role)}</span>
                        </th>
                        {data.days.map((d) => {
                          const list = byCell.get(`${p.id}|${d}`) || [];
                          const col = roleColour(p.role);
                          if (list.length === 0) {
                            return (
                              <td key={d} style={{ height: 50, padding: 0 }}>
                                <button aria-label={`Add a shift for ${p.name} on ${dayLong(d)}`} onClick={() => openEdit({ person: p, date: d, start: common[0]?.[0] || "09:00", end: common[0]?.[1] || "17:00", notes: "" })}
                                  style={{ width: "100%", height: 50, borderRadius: 12, border: `1.5px dashed ${C.dash}`, background: "transparent", color: C.plus, fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>+</button>
                              </td>
                            );
                          }
                          return (
                            <td key={d} style={{ height: 50, padding: 0, verticalAlign: "top" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 3, height: "100%" }}>
                                {list.map((s) => (
                                  <button key={s.id} aria-label={`${p.name}, ${dayLong(d)}, ${s.start} to ${s.end}. Change`} title={s.notes || undefined}
                                    onClick={() => openEdit({ id: s.id, person: p, date: d, start: s.start, end: s.end, notes: s.notes || "" })}
                                    style={{ flex: 1, minHeight: list.length > 1 ? 24 : 50, borderRadius: 12, border: 0, background: col.bg, color: col.fg, textAlign: "center", fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace", fontSize: 12, cursor: "pointer" }}>
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
                    {data.people.length === 0 && (
                      <tr><td colSpan={9} style={{ padding: 16, color: C.sub }}>No one is set to {BRANCH_NAME[data.branch]} yet. Set branches on the Staff page.</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ color: C.sub, textAlign: "center" }}>
                      <th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: "6px 8px" }}>On shift</th>
                      {data.days.map((d) => <td key={d}>{totals.perDay.get(d)?.size || 0}</td>)}
                      <td style={{ textAlign: "right", paddingRight: 8, fontWeight: 600, color: C.ink }}>{fmtHours(totals.all)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
              <p style={{ margin: "6px 8px 4px", fontSize: 12, color: C.sub }}>Click a box to add or change a shift. Colours show the role.</p>
            </section>

            <aside style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              <section aria-labelledby="rq-h" style={{ ...panel, gap: 10 }}>
                <h2 id="rq-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Requests</h2>
                <p style={{ margin: 0, fontSize: 13, color: C.sub }}>Swap and time-off requests from staff phones will show here.</p>
              </section>
              <section aria-labelledby="wk-h" style={panel}>
                <h2 id="wk-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>This week</h2>
                <p style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.sub }}>Rota hours</span><strong style={{ fontWeight: 600 }}>{fmtHours(totals.all)} h</strong></p>
                <p style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.sub }}>People on the rota</span><strong style={{ fontWeight: 600 }}>{totals.people}</strong></p>
                {pub && <p style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.sub }}>Have seen it</span><strong style={{ fontWeight: 600 }}>{pub.seen} of {pub.onRota}</strong></p>}
              </section>
            </aside>
          </div>
        )}
        <p style={{ margin: "0 4px", fontSize: 12, color: C.sub }}>
          Shifts are saved straight into the clock-in app. Publishing sends everyone on the rota a phone notification and an email with their shifts, and shows it on their Home screen. After that, &ldquo;Send changes&rdquo; only tells the people whose shifts changed. Staff turned off in the clock-in app get nothing.
        </p>
      </main>

      {edit && data && (
        <ShiftEditor
          edit={edit}
          common={common}
          busy={busy === "save" || busy === "delete"}
          onClose={() => setEdit(null)}
          onSave={async (e) => { if (await act({ action: "save", branch: data.branch, id: e.id, staffId: e.person.id, date: e.date, start: e.start, end: e.end, notes: e.notes }, "save")) setEdit(null); }}
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
    <div role="presentation" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(40,32,26,0.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
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
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500, color: C.body }}>Start
            <input type="time" step={900} value={e.start} onChange={(x) => setE({ ...e, start: x.target.value })} style={input} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500, color: C.body }}>Finish
            <input type="time" step={900} value={e.end} onChange={(x) => setE({ ...e, end: x.target.value })} style={input} />
          </label>
        </div>
        {e.end && e.start && e.end < e.start && <p style={{ margin: "-6px 0 0", fontSize: 12, color: C.sub }}>Finishes after midnight.</p>}
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
