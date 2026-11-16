"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Icon, IconFont, personColourLight, initial, BRANCH, ago } from "../ui";

/* 27 · Admin: staff, phones and notifications. Values from the design canvas. */

const C = { page: "#f6f4f1", ink: "#141414", sub: "#6e6a65", body: "#3b3834", line: "#f0ece7", coralBg: "#fff1ec", coral: "#c2410c", coralText: "#9a3412", badge: "#ffe4da" };
const card: CSSProperties = { borderRadius: 20, background: "#ffffff", padding: 16, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" };

type Person = {
  id: number; name: string; role: string; active: boolean; hasEmail: boolean; branch: string;
  phones: string[]; waiting: number; notifications: "on" | "off" | "not_asked" | "none"; lastSeen: string | null; lockedUntil: string | null;
};
type Pending = { id: string; clockinId: number; staffName: string; label: string; createdAt: string };
type Filter = "all" | "off" | "not_set_up" | "turned_off";

const roleLabel = (r: string) => (r ? r[0].toUpperCase() + r.slice(1) : "");

export default function StaffPage() {
  const [data, setData] = useState<{ people: Person[]; pending: Pending[] } | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [menu, setMenu] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/meet/team", { cache: "no-store" }).catch(() => null);
    if (!res) return setError("Can't connect right now");
    if (res.status === 403 || res.status === 401) return setError("This page is for managers.");
    if (!res.ok) return setError("Can't load the staff list right now");
    setError("");
    setData(await res.json());
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onShow); };
  }, [load]);

  async function post(url: string, body: object, key: string, done: string) {
    setBusy(key);
    setNote("");
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy("");
    if (!res?.ok) return setNote(d?.error || "Couldn't save that");
    setNote(done);
    load();
  }

  const people = data?.people || [];
  const active = people.filter((p) => p.active);
  const counts = {
    staff: active.length,
    waiting: data?.pending.length || 0,
    off: active.filter((p) => p.notifications === "off").length,
    notSetUp: active.filter((p) => p.phones.length === 0).length,
    turnedOff: people.filter((p) => !p.active).length,
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => (filter === "turned_off" ? !p.active : p.active))
      .filter((p) => filter !== "off" || p.notifications === "off")
      .filter((p) => filter !== "not_set_up" || p.phones.length === 0)
      .filter((p) => !branch || p.branch === branch || p.branch === "both")
      .filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [people, query, branch, filter]);

  const locked = people.filter((p) => p.lockedUntil);

  return (
    <div style={{ minHeight: "100dvh", background: C.page, color: C.ink, fontSize: 14, display: "flex", flexWrap: "wrap" }} onClick={() => setMenu(null)}>
      <IconFont />
      <Sidebar waiting={counts.waiting} />

      <main style={{ flex: "999 1 560px", minWidth: 0, boxSizing: "border-box", padding: "18px 24px 24px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "4px 4px 0" }}>
          <div style={{ flex: "1 1 220px" }}>
            <p style={{ margin: 0, fontSize: 13, color: C.sub }}>From the clock-in app</p>
            <h1 style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>Staff</h1>
          </div>
          <label style={{ height: 40, padding: "0 14px", borderRadius: 20, background: "#ffffff", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 1px 2px rgba(20,20,20,0.08)", color: C.sub }}>
            <Icon name="search" size={19} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff" aria-label="Search staff" style={{ border: 0, outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, width: 160, color: C.ink }} />
          </label>
          <label style={{ position: "relative", height: 40, padding: "0 14px", borderRadius: 20, background: "#ffffff", fontSize: 14, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(20,20,20,0.08)" }}>
            <Icon name="storefront" size={19} />
            {branch ? BRANCH[branch] : "Both branches"}
            <Icon name="expand_more" size={18} />
            <select aria-label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}>
              <option value="">Both branches</option>
              <option value="cricklewood">Cricklewood</option>
              <option value="streatham">Streatham</option>
            </select>
          </label>
        </header>

        {error ? (
          <p style={{ ...card, margin: 0, color: C.sub }}>{error} {error.includes("managers") && <a href="/meet" style={{ color: C.ink }}>Back to the app</a>}</p>
        ) : !data ? (
          <p style={{ ...card, margin: 0, color: C.sub }}>Loading…</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <Stat label="On the staff list" value={counts.staff} />
              <Stat label="Phones to approve" value={counts.waiting} hot={counts.waiting > 0} />
              <Stat label="Notifications off" value={counts.off} />
              <Stat label="Not set up yet" value={counts.notSetUp} />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
              <section aria-labelledby="ph-h" style={{ flex: "1 1 340px", minWidth: 0, borderRadius: 24, background: "#ffffff", padding: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <h2 id="ph-h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Phones waiting for you</h2>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: C.sub }}>Signed in with the right PIN</span>
                </div>
                {data.pending.length === 0 && <p style={{ margin: 0, fontSize: 13, color: C.sub }}>No phones waiting.</p>}
                {data.pending.map((d) => {
                  const col = personColourLight(d.clockinId);
                  const who = people.find((p) => p.id === d.clockinId);
                  return (
                    <article key={d.id} style={{ padding: 14, borderRadius: 18, background: C.page, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar size={36} bg={col.bg} fg={col.fg}>{initial(d.staffName)}</Avatar>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontWeight: 500 }}>{d.staffName}{who?.branch ? ` · ${BRANCH[who.branch]}` : ""}</span>
                          <span style={{ display: "block", fontSize: 12, color: C.sub }}>{d.label} · first sign-in {ago(d.createdAt)}</span>
                        </span>
                      </div>
                      {who && who.phones.length > 0 && (
                        <p style={{ margin: 0, padding: "8px 10px", borderRadius: 12, background: "#ffffff", fontSize: 12, color: C.body, display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon name="smartphone" size={16} style={{ color: C.sub }} />Already has {who.phones.length} approved phone{who.phones.length === 1 ? "" : "s"} ({who.phones.join(", ")})
                        </p>
                      )}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button disabled={!!busy} onClick={() => post("/api/meet/devices", { id: d.id, action: "approve" }, d.id, `${d.staffName}'s phone is approved.`)} style={{ flex: 1, height: 36, border: 0, borderRadius: 18, background: C.ink, color: "#ffffff", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>
                          {busy === d.id ? "Saving…" : "Approve phone"}
                        </button>
                        <button disabled={!!busy} onClick={() => post("/api/meet/devices", { id: d.id, action: "decline" }, d.id, `${d.staffName}'s phone was declined.`)} style={{ height: 36, padding: "0 16px", border: 0, borderRadius: 18, background: "#ffffff", fontSize: 13, fontFamily: "inherit" }}>
                          Decline
                        </button>
                      </div>
                    </article>
                  );
                })}
                {locked.map((p) => (
                  <div key={p.id} style={{ padding: "12px 14px", borderRadius: 18, background: "#fef3c7", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Icon name="lock" size={20} style={{ color: "#92400e" }} />
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#78350f" }}>{p.name} is locked out</span>
                      <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "#92400e" }}>Too many wrong PINs. Unlocks by itself {new Date(p.lockedUntil!).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}</span>
                    </span>
                    <button disabled={!!busy} onClick={() => post("/api/meet/team", { action: "unlock", id: p.id }, `u${p.id}`, `${p.name} can sign in again.`)} style={{ height: 32, padding: "0 12px", border: 0, borderRadius: 16, background: "#ffffff", fontSize: 12, fontWeight: 500, fontFamily: "inherit" }}>Unlock</button>
                  </div>
                ))}
                {note && <p role="status" style={{ margin: 0, fontSize: 12, color: C.sub }}>{note}</p>}
              </section>

              <section aria-labelledby="st-h" style={{ flex: "999 1 520px", minWidth: 0, borderRadius: 24, background: "#ffffff", padding: 8, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 10px 6px" }}>
                  <h2 id="st-h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Everyone</h2>
                  <div role="group" aria-label="Show" style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 4, padding: 3, borderRadius: 16, background: C.page }}>
                    {([["all", "All"], ["off", "Notifications off"], ["not_set_up", "Not set up"], ["turned_off", `Turned off · ${counts.turnedOff}`]] as [Filter, string][]).map(([k, label]) => (
                      <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} style={{ height: 28, padding: "0 12px", border: 0, borderRadius: 13, background: filter === k ? C.ink : "transparent", color: filter === k ? "#ffffff" : C.body, fontSize: 12, fontWeight: filter === k ? 500 : 400, fontFamily: "inherit" }}>{label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: C.sub, textAlign: "left" }}>
                        <th scope="col" style={{ padding: "8px 12px", fontWeight: 500 }}>Name</th>
                        <th scope="col" style={{ padding: 8, fontWeight: 500 }}>Branch</th>
                        <th scope="col" style={{ padding: 8, fontWeight: 500 }}>Phones</th>
                        <th scope="col" style={{ padding: 8, fontWeight: 500 }}>Notifications</th>
                        <th scope="col" style={{ padding: 8, fontWeight: 500 }}>Last seen</th>
                        <th scope="col" style={{ padding: "8px 12px", fontWeight: 500 }}><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((p) => (
                        <Row key={p.id} p={p} open={menu === p.id} busy={busy} onMenu={(e) => { e.stopPropagation(); setMenu(menu === p.id ? null : p.id); }}
                          onBranch={(b) => post("/api/meet/team", { action: "branch", id: p.id, branch: b }, `b${p.id}`, `${p.name}: ${BRANCH[b] || "no branch"}.`)}
                          onSignOut={() => { setMenu(null); if (confirm(`Sign ${p.name} out of every phone? They'd need a manager to approve their phone again.`)) post("/api/meet/team", { action: "signout_all", id: p.id }, `s${p.id}`, `${p.name} is signed out of all phones.`); }}
                        />
                      ))}
                      {shown.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: "16px 12px", color: C.sub }}>No one here.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <p style={{ margin: "0 4px", fontSize: 12, color: C.sub }}>
              Names and roles come from the clock-in app, so new starters and leavers update on their own. Anyone turned off in the clock-in app stays off here: they can&rsquo;t sign in, aren&rsquo;t invited to meetings and get no notifications. Turning them back on in the clock-in app brings them back.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, hot }: { label: string; value: number; hot?: boolean }) {
  return (
    <div style={hot ? { borderRadius: 20, background: C.coralBg, padding: 16 } : card}>
      <p style={{ margin: 0, fontSize: 13, color: hot ? C.coralText : C.sub }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em", color: hot ? C.coral : C.ink }}>{value}</p>
    </div>
  );
}

function Avatar({ size, bg, fg, children }: { size: number; bg: string; fg: string; children: ReactNode }) {
  return <span style={{ width: size, height: size, flex: "none", borderRadius: "50%", background: bg, color: fg, fontSize: size > 32 ? 13 : 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</span>;
}

function Row({ p, open, busy, onMenu, onBranch, onSignOut }: { p: Person; open: boolean; busy: string; onMenu: (e: React.MouseEvent) => void; onBranch: (b: string) => void; onSignOut: () => void }) {
  const col = p.active ? personColourLight(p.id) : { bg: C.line, fg: C.sub };
  const notif =
    p.notifications === "on" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#047857" }}><Icon name="notifications_active" size={17} />On</span>
    : p.notifications === "off" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#b45309" }}><Icon name="notifications_off" size={17} />Off · email only</span>
    : p.notifications === "not_asked" ? <span style={{ color: C.sub }}>Not asked yet</span>
    : <span style={{ color: C.sub }}>Not set up</span>;
  const dim = !p.active;
  return (
    <>
      <tr style={{ borderTop: `1px solid ${C.line}`, color: dim ? C.sub : undefined, background: open ? "#fbfaf8" : undefined }}>
        <td style={{ padding: "10px 12px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar size={30} bg={col.bg} fg={col.fg}>{initial(p.name)}</Avatar>
            <span><span style={{ display: "block", fontWeight: 500 }}>{p.name}</span><span style={{ display: "block", fontSize: 12, color: C.sub }}>{roleLabel(p.role)}</span></span>
          </span>
        </td>
        <td style={{ padding: 8 }}>
          {dim ? (BRANCH[p.branch] || "") : (
            <label style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 2, color: p.branch ? C.ink : "#b45309" }}>
              {BRANCH[p.branch] || "Set branch"}<Icon name="expand_more" size={16} style={{ color: C.sub }} />
              <select aria-label={`Branch for ${p.name}`} value={p.branch} disabled={busy === `b${p.id}`} onChange={(e) => onBranch(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}>
                <option value="">Not set</option>
                <option value="cricklewood">Cricklewood</option>
                <option value="streatham">Streatham</option>
                <option value="both">Both branches</option>
              </select>
            </label>
          )}
        </td>
        <td style={{ padding: 8 }}>
          {p.waiting > 0 ? <span style={{ padding: "3px 9px", borderRadius: 999, background: C.coralBg, color: C.coral, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>{p.waiting} waiting</span>
            : p.phones.length === 0 ? <span style={{ color: C.sub }}>{dim ? "Signed out" : "None yet"}</span>
            : p.phones.length === 1 ? p.phones[0].split(" · ")[0] : `${p.phones.length} phones`}
        </td>
        <td style={{ padding: 8 }}>{dim ? "None" : notif}</td>
        <td style={{ padding: 8, color: C.sub }}>{p.lastSeen ? ago(p.lastSeen) : "Never"}</td>
        <td style={{ padding: "8px 12px", textAlign: "right" }}>
          {dim ? (
            <span style={{ padding: "3px 9px", borderRadius: 999, background: C.line, color: C.body, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="toggle_off" size={14} />Off in clock-in</span>
          ) : p.phones.length > 0 ? (
            <button aria-label={`Options for ${p.name}`} aria-expanded={open} onClick={onMenu} style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: open ? C.ink : C.page, color: open ? "#ffffff" : C.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="more_horiz" size={18} />
            </button>
          ) : null}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ padding: "0 12px 10px" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ marginLeft: "auto", width: 260, borderRadius: 16, background: C.ink, color: "#ffffff", padding: 6, boxShadow: "0 12px 30px -10px rgba(20,20,20,0.5)", display: "flex", flexDirection: "column" }}>
              <p style={{ margin: 0, padding: "8px 10px", fontSize: 12, color: "#bdb8b2", display: "flex", alignItems: "center", gap: 8 }}><Icon name="smartphone" size={18} />{p.phones.join(", ")}</p>
              <button onClick={onSignOut} style={{ height: 38, padding: "0 10px", border: 0, borderRadius: 12, background: "transparent", color: "#ffb999", fontSize: 13, fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="logout" size={18} />Sign out of all phones
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* Manager sidebar from the design. Screens not built yet are greyed out. */
function Sidebar({ waiting }: { waiting: number }) {
  const items: [string, string, string | null][] = [
    ["Home", "home", "/meet"],
    ["Calendar", "calendar_month", null],
    ["Rota", "view_timeline", null],
    ["Hours", "schedule", null],
    ["Meeting notes", "auto_stories", null],
    ["Tasks", "check_circle", null],
    ["Attendance", "how_to_reg", null],
    ["News", "campaign", null],
    ["Staff", "groups", "/meet/staff"],
    ["Reports", "flag", null],
  ];
  return (
    <nav aria-label="Main" style={{ flex: "1 1 220px", maxWidth: 244, boxSizing: "border-box", padding: "18px 14px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 48, padding: "0 16px", borderRadius: 16, background: C.ink }}>
        <img src="/logo.png" alt="Demi's" style={{ height: 15, width: "auto" }} />
        <span aria-hidden="true" style={{ width: 1, height: 18, background: "#3a3632" }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#e8cc9c" }}>Meetings</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(([label, icon, href]) => {
          const current = href === "/meet/staff";
          const base: CSSProperties = { display: "flex", alignItems: "center", gap: 11, height: 38, padding: "0 12px", borderRadius: 12, textDecoration: "none" };
          if (!href) {
            return (
              <span key={label} title="Coming soon" aria-disabled="true" style={{ ...base, color: C.body, opacity: 0.4 }}>
                <Icon name={icon} size={20} />{label}
              </span>
            );
          }
          return (
            <a key={label} href={href} aria-current={current ? "page" : undefined} style={current ? { ...base, background: "#ffffff", color: C.ink, fontWeight: 500, boxShadow: "0 1px 2px rgba(20,20,20,0.06)" } : { ...base, color: C.body }}>
              <Icon name={icon} size={20} fill={current} />{label}
              {current && waiting > 0 && (
                <span style={{ marginLeft: "auto", minWidth: 20, height: 20, padding: "0 6px", boxSizing: "border-box", borderRadius: 10, background: C.badge, color: C.coral, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{waiting}</span>
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
