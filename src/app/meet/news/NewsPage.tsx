"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Icon, personColourLight, initial, firstName, ago, uploadFile } from "../ui";
import { ManagerFrame, PageHead, PAGE as C, panel, btnWhite, useJson, postJson } from "../ManagerShell";

/* 29 · Admin: post news. Values from the design canvas. */

type Post = {
  id: string; title: string; body: string; kind: string; icon: string; audience: string; pinned: boolean; ackBy: string; photo: string; by: string; at: string;
  total: number; seen: number; acked: number; notYet: { id: number; name: string }[];
};
type Doc = { id: string; title: string; mime: string; size: number; url: string; at: string };

const KINDS: [string, string][] = [["menu", "Menu"], ["rota", "Rota"], ["kitchen", "Kitchen"], ["policies", "Policies"]];
const AUDIENCES: [string, string][] = [["everyone", "Everyone"], ["cricklewood", "Cricklewood"], ["streatham", "Streatham"], ["kitchen", "Kitchen team"]];
const label = (list: [string, string][], v: string) => list.find((x) => x[0] === v)?.[1] || v;
const dayLong = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const dayShort = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const plusDays = (n: number) => new Date(Date.now() + n * 86400_000).toLocaleDateString("en-CA", { timeZone: "Europe/London" });

const chip = (on: boolean): CSSProperties => ({
  height: 34, padding: "0 14px", border: 0, borderRadius: 17, background: on ? C.ink : C.page, color: on ? "#ffffff" : C.ink,
  fontSize: 13, fontWeight: on ? 500 : 400, fontFamily: "inherit", cursor: "pointer",
});
const field: CSSProperties = { border: `1px solid ${C.field}`, borderRadius: 14, padding: "0 12px", fontFamily: "inherit", fontSize: 15, color: C.ink, background: "#ffffff" };

export default function NewsPage() {
  const { data, error, reload } = useJson<{ posts: Post[] }>("/api/meet/news?manage=1");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("rota");
  const [audience, setAudience] = useState("everyone");
  const [pinned, setPinned] = useState(false);
  const [ask, setAsk] = useState(false);
  const [ackBy, setAckBy] = useState(plusDays(3));
  const [photo, setPhoto] = useState<{ path: string; preview: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [menu, setMenu] = useState("");
  const [docsOpen, setDocsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickPhoto(f: File | undefined) {
    if (!f) return;
    setBusy("photo");
    setNote("");
    try {
      const up = await uploadFile("news", f);
      setPhoto({ path: up.path, preview: URL.createObjectURL(f) });
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't add the photo");
    }
    setBusy("");
  }

  async function post() {
    setBusy("post");
    setNote("");
    const r = await postJson("/api/meet/news", { action: "post", title, body, kind, audience, pinned, ackBy: ask ? ackBy : "", photoPath: photo?.path || "" });
    setBusy("");
    if (!r.ok) return setNote(r.data.error || "Couldn't post that");
    setTitle(""); setBody(""); setPinned(false); setAsk(false); setPhoto(null);
    setNote(`Posted. ${r.data.notified} ${r.data.notified === 1 ? "person was" : "people were"} told.`);
    reload();
  }

  async function act(id: string, action: string, extra: object = {}, done = "") {
    setBusy(id + action);
    setMenu("");
    const r = await postJson("/api/meet/news", { id, action, ...extra });
    setBusy("");
    if (!r.ok) return setNote(r.data.error || "Couldn't do that");
    if (action === "remind") setNote(`Reminder sent to ${r.data.reminded}.`);
    else if (done) setNote(done);
    reload();
  }

  const row = (icon: string, children: React.ReactNode, control: React.ReactNode, top = false) => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 14px", borderTop: top ? `1px solid #ebe6e0` : undefined, fontSize: 14, cursor: "pointer" }}>
      <Icon name={icon} size={19} />
      <span style={{ flex: 1 }}>{children}</span>
      {control}
    </label>
  );

  return (
    <ManagerFrame current="news">
      <PageHead over="Shows on every staff phone" title="News">
        <button onClick={() => setDocsOpen(true)} style={btnWhite}><Icon name="folder_open" size={19} />Handbook and documents</button>
      </PageHead>
      {note && <p role="status" style={{ margin: "0 4px", fontSize: 13, color: C.body }}>{note}</p>}
      {error ? <p style={{ ...panel, margin: 0, color: C.sub }}>{error}</p> : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
          <section aria-labelledby="nw-h" style={{ ...panel, flex: "1 1 380px", minWidth: 0, padding: 18, gap: 14, borderRadius: 24 }}>
            <h2 id="nw-h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>New post</h2>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.sub }}>Headline
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Christmas rota is out" style={{ ...field, height: 44 }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.sub }}>Message
              <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="What do staff need to know?" style={{ ...field, padding: "10px 12px", fontSize: 14, lineHeight: 1.5, resize: "vertical" }} />
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, color: C.sub }}>Type</span>
              <div role="group" aria-label="Type" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {KINDS.map(([k, l]) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} style={chip(kind === k)}>{l}</button>)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, color: C.sub }}>Who sees it</span>
              <div role="group" aria-label="Who sees it" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {AUDIENCES.map(([k, l]) => <button key={k} aria-pressed={audience === k} onClick={() => setAudience(k)} style={chip(audience === k)}>{l}</button>)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", borderRadius: 16, background: C.page }}>
              {row("push_pin", "Pin to the top", <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ width: 20, height: 20, accentColor: C.ink }} />)}
              {row("task_alt", <>Ask staff to tap &ldquo;Got it&rdquo; by{" "}
                {ask ? <input type="date" aria-label="Got it by" value={ackBy} min={plusDays(0)} onChange={(e) => setAckBy(e.target.value)} onClick={(e) => e.stopPropagation()} style={{ border: 0, background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: C.ink }} /> : <strong style={{ fontWeight: 600 }}>{dayLong(ackBy)}</strong>}</>,
                <input type="checkbox" aria-label="Ask staff to tap Got it" checked={ask} onChange={(e) => setAsk(e.target.checked)} style={{ width: 20, height: 20, accentColor: C.ink }} />, true)}
              <button type="button" onClick={() => (photo ? setPhoto(null) : fileRef.current?.click())} disabled={busy === "photo"} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 14px", border: 0, borderTop: "1px solid #ebe6e0", background: "transparent", fontFamily: "inherit", fontSize: 14, color: C.ink, textAlign: "left", cursor: "pointer" }}>
                <Icon name="add_photo_alternate" size={19} />
                <span style={{ flex: 1 }}>{busy === "photo" ? "Adding the photo…" : photo ? "Photo added · tap to remove" : "Add a photo"}</span>
                {photo ? <img src={photo.preview} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} /> : <Icon name="chevron_right" size={19} style={{ color: C.sub }} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 200px", fontSize: 12, color: C.sub }}>Sends a notification and an email to everyone it&rsquo;s for.</span>
              <button onClick={post} disabled={!!busy || !title.trim()} style={{ marginLeft: "auto", height: 42, padding: "0 20px", border: 0, borderRadius: 21, background: C.ink, color: "#ffffff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", opacity: !title.trim() ? 0.45 : 1, cursor: "pointer" }}>
                <Icon name="send" size={19} />{busy === "post" ? "Posting…" : "Post"}
              </button>
            </div>
          </section>

          <section aria-labelledby="ps-h" style={{ flex: "999 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 id="ps-h" style={{ margin: "0 4px", fontSize: 16, fontWeight: 600 }}>Posted</h2>
            {!data && <p style={{ ...panel, margin: 0, color: C.sub }}>Loading…</p>}
            {data && data.posts.length === 0 && <p style={{ ...panel, margin: 0, color: C.sub }}>Nothing posted yet. Your first post shows on every staff phone straight away.</p>}
            {data?.posts.map((p) => {
              const tracked = !!p.ackBy || p.pinned;
              const done = p.ackBy ? p.acked : p.seen;
              return (
                <article key={p.id} style={{ borderRadius: 22, background: "#ffffff", padding: 16, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 1px 2px rgba(20,20,20,0.05)" }}>
                  <div style={{ display: "flex", alignItems: tracked ? "flex-start" : "center", gap: 10 }}>
                    <span style={{ width: 40, height: 40, flex: "none", borderRadius: 14, background: p.pinned ? C.coralBg : C.page, color: p.pinned ? C.coral : C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={p.pinned ? "push_pin" : p.icon} size={21} fill={p.pinned} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{p.title}</span>
                      <span style={{ display: "block", marginTop: 2, fontSize: 12, color: C.sub }}>{label(KINDS, p.kind)} · {label(AUDIENCES, p.audience)} · {p.by} · {ago(p.at)}</span>
                    </span>
                    {!tracked && <span style={{ fontSize: 12, color: C.sub, whiteSpace: "nowrap" }}>Seen by {p.seen}</span>}
                    <div style={{ position: "relative" }}>
                      <button aria-label="Options for this post" aria-expanded={menu === p.id} onClick={() => setMenu(menu === p.id ? "" : p.id)} style={{ width: 34, height: 34, border: 0, borderRadius: 17, background: C.page, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ink }}>
                        <Icon name="more_horiz" size={18} />
                      </button>
                      {menu === p.id && (
                        <div role="menu" style={{ position: "absolute", right: 0, top: 40, zIndex: 20, minWidth: 180, padding: 6, borderRadius: 16, background: "#ffffff", boxShadow: "0 12px 32px rgba(20,20,20,0.16)" }}>
                          <button role="menuitem" onClick={() => act(p.id, "pin", { pinned: !p.pinned }, p.pinned ? "Unpinned." : "Pinned to the top.")} style={menuItem}>{p.pinned ? "Unpin" : "Pin to the top"}</button>
                          <button role="menuitem" onClick={() => confirm(`Delete "${p.title}"? It disappears from every phone.`) && act(p.id, "delete", {}, "Post deleted.")} style={{ ...menuItem, color: "#b91c1c" }}>Delete post</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {tracked && (
                    <>
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", fontSize: 13 }}>
                          <span style={{ fontWeight: 500 }}>{done} of {p.total} {p.ackBy ? "tapped Got it" : "have seen it"}</span>
                          {p.ackBy && <span style={{ marginLeft: "auto", color: C.sub }}>Due {dayShort(p.ackBy)}</span>}
                        </div>
                        <div role="img" aria-label={`${done} of ${p.total} staff have read it`} style={{ marginTop: 6, height: 8, borderRadius: 4, background: C.line, overflow: "hidden" }}>
                          <span style={{ display: "block", width: `${p.total ? Math.round((done / p.total) * 100) : 0}%`, height: "100%", borderRadius: 4, background: C.ink }} />
                        </div>
                      </div>
                      {p.notYet.length > 0 && (
                        <div style={{ padding: 12, borderRadius: 16, background: C.page, display: "flex", flexDirection: "column", gap: 8 }}>
                          <span style={{ fontSize: 13, color: C.body }}>Not read yet</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            {p.notYet.slice(0, 3).map((x) => {
                              const col = personColourLight(x.id);
                              return (
                                <span key={x.id} style={{ height: 30, padding: "0 10px 0 4px", borderRadius: 15, background: "#ffffff", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(x.name)}</span>{firstName(x.name)}
                                </span>
                              );
                            })}
                            {p.notYet.length > 3 && <span style={{ height: 30, padding: "0 10px", borderRadius: 15, background: "#ffffff", display: "inline-flex", alignItems: "center", fontSize: 13, color: C.sub }}>+{p.notYet.length - 3} more</span>}
                            <button onClick={() => act(p.id, "remind")} disabled={!!busy} style={{ marginLeft: "auto", height: 30, padding: "0 12px", border: 0, borderRadius: 15, background: C.ink, color: "#ffffff", fontSize: 12, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                              <Icon name="notifications" size={16} />{busy === p.id + "remind" ? "Sending…" : `Remind ${p.notYet.length}`}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </section>
        </div>
      )}
      <p style={{ margin: "0 4px", fontSize: 12, color: C.sub }}>Staff turned off in the clock-in app don&rsquo;t get posts or reminders.</p>
      {docsOpen && <DocsDialog onClose={() => setDocsOpen(false)} />}
    </ManagerFrame>
  );
}

const menuItem: CSSProperties = { display: "block", width: "100%", height: 38, padding: "0 12px", border: 0, borderRadius: 10, background: "transparent", textAlign: "left", fontFamily: "inherit", fontSize: 14, color: C.ink, cursor: "pointer" };

/** The handbook and documents staff see under News. */
function DocsDialog({ onClose }: { onClose: () => void }) {
  const { data, reload } = useJson<{ docs: Doc[] }>("/api/meet/docs");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  async function add() {
    if (!file || !title.trim()) return;
    setBusy("add");
    setNote("");
    try {
      const up = await uploadFile("docs", file);
      const r = await postJson("/api/meet/docs", { action: "add", title, path: up.path, mime: up.mime, size: up.size });
      if (!r.ok) throw new Error(r.data.error || "Couldn't add it");
      setTitle(""); setFile(null);
      reload();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't add it");
    }
    setBusy("");
  }
  async function remove(d: Doc) {
    if (!confirm(`Remove "${d.title}"?`)) return;
    setBusy(d.id);
    await postJson("/api/meet/docs", { action: "delete", id: d.id });
    setBusy("");
    reload();
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="docs-h" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(40,32,26,0.42)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 16px", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 520, background: "#ffffff", borderRadius: 28, boxShadow: "0 30px 70px -20px rgba(20,20,20,0.45)", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="folder_open" size={22} />
          <h2 id="docs-h" style={{ margin: 0, flex: 1, fontSize: 18, fontWeight: 600 }}>Handbook and documents</h2>
          <button aria-label="Close" onClick={onClose} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: C.page, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ink }}><Icon name="close" size={20} /></button>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: C.sub }}>Staff open these from News on their phones: the allergen chart, food hygiene, the staff handbook.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {!data && <span style={{ color: C.sub }}>Loading…</span>}
          {data?.docs.length === 0 && <span style={{ fontSize: 13, color: C.sub }}>No documents yet.</span>}
          {data?.docs.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: C.page }}>
              <Icon name="description" size={20} />
              <a href={d.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, color: C.ink, fontSize: 14 }}>{d.title}</a>
              <span style={{ fontSize: 12, color: C.sub }}>{Math.max(1, Math.round(d.size / 1024))} KB</span>
              <button aria-label={`Remove ${d.title}`} onClick={() => remove(d)} disabled={busy === d.id} style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ink }}><Icon name="delete" size={18} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 18, border: `1px dashed ${C.field}` }}>
          <input aria-label="Document name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name, e.g. Allergen chart" maxLength={120} style={{ ...field, height: 42, fontSize: 14 }} />
          <input type="file" aria-label="Choose a file" accept=".pdf,.docx,.xlsx,.txt,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 13, fontFamily: "inherit" }} />
          <button onClick={add} disabled={!file || !title.trim() || busy === "add"} style={{ alignSelf: "flex-end", height: 38, padding: "0 16px", border: 0, borderRadius: 19, background: C.ink, color: "#ffffff", fontSize: 13, fontWeight: 500, fontFamily: "inherit", opacity: !file || !title.trim() ? 0.45 : 1, cursor: "pointer" }}>
            {busy === "add" ? "Adding…" : "Add document"}
          </button>
          {note && <p role="status" style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{note}</p>}
        </div>
      </div>
    </div>
  );
}
