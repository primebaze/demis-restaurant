"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Icon, IconFont, personColour, initial, firstName, BRANCH, ago } from "./ui";

/*
 * Demi's Meetings, staff phone screens. Built to the design canvas
 * (claude.ai/artifact/NtYJeV3fySso3CRCF7iCMq): colours, sizes and icons are the
 * design's own values, written inline. See docs/COLOURS.md, "Demi's Meetings".
 */

const C = {
  bg: "#0f0f0f",
  card: "#1c1c1c",
  chip: "#1f1f1f",
  muted: "#a3a3a3",
  faint: "#737373",
  ring: "#525252",
  gold: "#e8cc9c",
  line: "#1f1f1f",
};

type Me =
  | { state: "loading" }
  | { state: "error" }
  | { state: "signed_out"; lastName?: string }
  | { state: "pending"; name: string }
  | { state: "declined"; name: string }
  | {
      state: "approved";
      person: { id: number; name: string; role: string };
      manager: boolean;
      branch: string;
      notifyChoice: string;
      clockedInSince: string | null;
    };

export default function MeetApp() {
  const [me, setMe] = useState<Me>({ state: "loading" });
  const device = useDevice();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/meet/me", { cache: "no-store" });
      setMe(res.ok ? await res.json() : { state: "error" });
    } catch {
      setMe((m) => (m.state === "loading" ? { state: "error" } : m));
    }
  }, []);

  // Always fresh: load on open and whenever the app comes back to the front.
  useEffect(() => {
    load();
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [load]);

  // While waiting for a manager, check every 10 seconds.
  useEffect(() => {
    if (me.state !== "pending") return;
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [me.state, load]);

  async function signOut() {
    await fetch("/api/meet/signout", { method: "POST" }).catch(() => {});
    setMe({ state: "signed_out" });
  }

  let screen: ReactNode;
  // iPhone: the home-screen app keeps its own sign-in, separate from Safari, so it must be
  // installed BEFORE signing in (design 25). Otherwise the Safari copy gets approved, not the app.
  if (!device || me.state === "loading") screen = <Centered><Spinner /></Centered>;
  else if (device.ios && device.phone && !device.standalone) screen = <InstallGuide />;
  else if (me.state === "error")
    screen = (
      <Centered>
        <p style={{ fontSize: 18 }}>Can&rsquo;t connect right now</p>
        <button onClick={load} style={{ marginTop: 16, height: 44, padding: "0 22px", border: 0, borderRadius: 22, background: "#fff", color: C.bg, fontSize: 15, fontWeight: 500, fontFamily: "inherit" }}>
          Try again
        </button>
      </Centered>
    );
  else if (me.state === "signed_out") screen = <SignIn onDone={load} />;
  else if (me.state === "pending" || me.state === "declined") screen = <Waiting me={me} onSignOut={signOut} />;
  else screen = <Approved me={me} onSignOut={signOut} reload={load} />;

  return (
    <>
      <IconFont />
      <style>{`html,body{background:${C.bg};overflow-x:hidden;overscroll-behavior-x:none}`}</style>
      <div style={{ minHeight: "100dvh", background: C.bg, color: "#fff", fontSize: 14 }}>{screen}</div>
    </>
  );
}

/* ─── Shared bits ─── */

function Centered({ children }: { children: ReactNode }) {
  return <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>{children}</main>;
}

function Spinner() {
  return <span aria-label="Loading" className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />;
}

/** The design's phone column: 390 wide on a phone, centred on bigger screens. */
function Phone({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <main
      style={{
        margin: "0 auto",
        width: "100%",
        maxWidth: 430,
        minHeight: "100dvh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        padding: "calc(env(safe-area-inset-top) + 40px) 22px calc(env(safe-area-inset-bottom) + 24px)",
        gap: 22,
        ...style,
      }}
    >
      {children}
    </main>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 30 }}>
      <img src="/meet/logo.png" alt="Demi's" style={{ height: 24, width: "auto" }} />
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold }}>Meetings</span>
    </div>
  );
}

/* ─── 12 · Sign in ─── */

function SignIn({ onDone }: { onDone: () => void }) {
  const [people, setPeople] = useState<{ id: number; name: string }[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/meet/staff", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Can't load names");
        setPeople(d.people || []);
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  const submit = useCallback(
    async (full: string) => {
      if (picked == null) return;
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/meet/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffId: picked, pin: full }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(d.error || "Couldn't sign in");
          setPin("");
          return;
        }
        onDone();
      } catch {
        setError("Couldn't connect. Try again.");
        setPin("");
      } finally {
        setBusy(false);
      }
    },
    [picked, onDone],
  );

  const press = (d: string) => {
    if (busy) return;
    if (picked == null) return setError("Tap your name first");
    if (pin.length >= 4) return;
    setError("");
    const next = pin + d;
    setPin(next);
    if (next.length === 4) submit(next);
  };

  // A computer keyboard works too.
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) pressRef.current(e.key);
      if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const key: CSSProperties = { height: 64, border: 0, borderRadius: 32, background: C.card, color: "#fff", fontSize: 26, fontFamily: "inherit" };
  const plain: CSSProperties = { ...key, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <Phone>
      <Logo />

      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>Who&rsquo;s signing in?</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: C.muted }}>Use the same PIN you clock in with</p>
      </div>

      {loadError ? (
        <p style={{ margin: 0, padding: "12px 14px", borderRadius: 16, background: C.card, textAlign: "center", color: C.muted }}>{loadError}</p>
      ) : !people ? (
        <div style={{ display: "flex", justifyContent: "center", height: 89, alignItems: "center" }}><Spinner /></div>
      ) : (
        <div role="group" aria-label="Your name" className="[scrollbar-width:none]" style={{ display: "flex", gap: 10, margin: "0 -22px", padding: "6px 22px", overflowX: "auto" }}>
          {people.map((p) => {
            const on = p.id === picked;
            const col = personColour(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => { setPicked(p.id); setPin(""); setError(""); }}
                style={{ flex: "none", width: 72, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, border: 0, padding: 0, background: "transparent", color: on ? "#fff" : C.muted, fontSize: 13, fontWeight: on ? 600 : 400, fontFamily: "inherit" }}
              >
                <span
                  style={{
                    width: 60, height: 60, borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 22, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: on ? `0 0 0 3px ${C.bg}, 0 0 0 5px #ffffff` : "none",
                  }}
                >
                  {initial(p.name)}
                </span>
                <span style={{ maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firstName(p.name)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div role="img" aria-label={`PIN, ${pin.length} of 4 digits entered`} style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              style={i < pin.length
                ? { width: 14, height: 14, borderRadius: "50%", background: "#fff" }
                : { width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${C.ring}`, boxSizing: "border-box" }}
            />
          ))}
        </div>
        {(error || busy) && (
          <p role="status" style={{ margin: 0, minHeight: 18, fontSize: 13, color: busy ? C.muted : "#fca5a5", textAlign: "center" }}>{busy ? "Checking…" : error}</p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, padding: "0 12px" }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} style={key} className="active:brightness-150">{d}</button>
        ))}
        {/* Face ID arrives with passkeys; until then this slot stays empty. */}
        <span />
        <button type="button" onClick={() => press("0")} style={key} className="active:brightness-150">0</button>
        <button type="button" aria-label="Delete digit" onClick={() => setPin((p) => p.slice(0, -1))} style={plain}>
          <Icon name="backspace" size={26} />
        </button>
      </div>

      <p style={{ margin: "auto 0 0", textAlign: "center", fontSize: 13, color: C.muted }}>Forgot your PIN? Ask a manager to reset it in the clock-in app.</p>
    </Phone>
  );
}

/* ─── Waiting for a manager (new phone) ─── */

function Waiting({ me, onSignOut }: { me: { state: "pending" | "declined"; name: string }; onSignOut: () => void }) {
  const declined = me.state === "declined";
  return (
    <Phone>
      <Logo />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", paddingTop: 12 }}>
        <span style={{ width: 84, height: 84, borderRadius: 22, background: "#141414", boxShadow: "0 0 0 1px #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={declined ? "lock" : "hourglass_top"} size={36} style={{ color: declined ? "#fca5a5" : C.gold }} />
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>{declined ? "This phone wasn't approved" : "Waiting for a manager"}</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: C.muted }}>
            {declined
              ? "A manager declined this phone. If that's a mistake, ask them, then sign in again."
              : `Hi ${firstName(me.name)}. This is a new phone, so a manager needs to approve it.`}
          </p>
        </div>
      </div>
      {!declined && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, background: "#1a1a1a", fontSize: 12, color: C.muted }}>
          <Icon name="info" size={18} />After that, this phone stays signed in for 30 days.
        </div>
      )}
      <button onClick={onSignOut} style={{ marginTop: "auto", height: 48, border: 0, borderRadius: 24, background: C.card, color: "#fff", fontSize: 15, fontFamily: "inherit" }}>
        {declined ? "Sign in again" : "Not you? Sign out"}
      </button>
    </Phone>
  );
}

/* ─── Signed in ─── */

type ApprovedMe = Extract<Me, { state: "approved" }>;

function useDevice() {
  const [info, setInfo] = useState<{ ios: boolean; standalone: boolean; phone: boolean } | null>(null);
  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInfo({ ios, standalone, phone: /iPhone|iPod|Android.+Mobile/.test(ua) });
  }, []);
  return info;
}

const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function Approved({ me, onSignOut, reload }: { me: ApprovedMe; onSignOut: () => void; reload: () => void }) {
  const [tab, setTab] = useState<"home" | "me">("home");

  // Keep the service worker registered so notifications arrive.
  useEffect(() => {
    if (pushSupported()) navigator.serviceWorker.register("/meet/sw.js", { scope: "/meet" }).catch(() => {});
  }, []);

  // Ask once, straight after installing.
  if (me.notifyChoice === "" && pushSupported()) return <AllowNotifications onDone={reload} />;
  return (
    <div style={{ margin: "0 auto", maxWidth: 430, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {tab === "home" ? <Home me={me} /> : <MeScreen me={me} onSignOut={onSignOut} />}
      <TabBar tab={tab} onTab={setTab} />
    </div>
  );
}

/* ─── 25 · Add to home screen (iPhone) ─── */

function InstallGuide() {
  const steps: [string, string, string?][] = [
    ["Tap the Share button at the bottom of Safari", "ios_share", "#60a5fa"],
    ["Choose “Add to Home Screen”, then tap Add", "add_box"],
    ["Open Demi’s from your home screen and sign in", "touch_app"],
  ];
  return (
    <Phone style={{ gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 24, textAlign: "center" }}>
        <span style={{ width: 84, height: 84, borderRadius: 22, background: "#141414", boxShadow: "0 0 0 1px #2a2a2a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <img src="/meet/logo.png" alt="" style={{ height: 12, width: "auto" }} />
          <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.18em", color: C.gold }}>MEETINGS</span>
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>Put Demi&rsquo;s on your home screen</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: C.muted }}>So you get your rota, tasks and meeting alerts on your lock screen, like a normal app.</p>
        </div>
      </div>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map(([text, icon, colour], i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 20, background: C.card }}>
            <span style={{ width: 32, height: 32, flex: "none", borderRadius: "50%", background: "#fff", color: C.bg, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 15 }}>{text}</span>
            <Icon name={icon} size={26} style={colour ? { color: colour } : undefined} />
          </li>
        ))}
      </ol>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, background: "#1a1a1a", fontSize: 12, color: C.muted }}>
        <Icon name="info" size={18} />Opened this from WhatsApp? Tap ⋯ and choose &ldquo;Open in Safari&rdquo; first.
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#60a5fa", fontSize: 12, fontWeight: 500 }}>
          Share is down here<Icon name="south" size={24} />
        </div>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, minHeight: 44, fontSize: 13, color: C.muted }}>
          <Icon name="lock" size={17} />You need to do this once before you can carry on
        </p>
      </div>
    </Phone>
  );
}

/* ─── 26 · Turn on notifications ─── */

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function AllowNotifications({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function saveChoiceOff() {
    await fetch("/api/meet/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: "off" }) }).catch(() => {});
  }

  async function turnOn() {
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        await saveChoiceOff();
        return onDone();
      }
      const { publicKey } = await (await fetch("/api/meet/push", { cache: "no-store" })).json();
      if (!publicKey) throw new Error("Notifications aren't switched on yet. Try again later.");
      const reg = await navigator.serviceWorker.register("/meet/sw.js", { scope: "/meet" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      const res = await fetch("/api/meet/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!res.ok) throw new Error("Couldn't save that. Try again.");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, string][] = [
    ["view_timeline", "New rota and shift changes"],
    ["videocam", "Meetings starting"],
    ["task_alt", "New tasks and reminders"],
    ["schedule", "Hours fixes approved"],
  ];
  return (
    <Phone>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 40, textAlign: "center" }}>
        <span style={{ width: 84, height: 84, borderRadius: 26, background: "linear-gradient(140deg, #ff7a45, #e0502f)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="notifications_active" size={42} fill />
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>Never miss a shift</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: C.muted }}>Turn on notifications and we&rsquo;ll tell you the moment something changes.</p>
        </div>
      </div>

      <div style={{ borderRadius: 22, background: C.card, padding: "6px 16px" }}>
        {rows.map(([icon, text], i) => (
          <div key={icon} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, borderTop: i ? "1px solid #262626" : undefined }}>
            <Icon name={icon} size={22} style={{ color: "#ffad8c" }} />
            <span style={{ fontSize: 15 }}>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {error && <p role="status" style={{ margin: 0, textAlign: "center", fontSize: 13, color: "#fca5a5" }}>{error}</p>}
        <button onClick={turnOn} disabled={busy} style={{ height: 56, border: 0, borderRadius: 28, background: "#ffffff", color: C.bg, fontSize: 16, fontWeight: 600, fontFamily: "inherit", opacity: busy ? 0.7 : 1 }}>
          {busy ? "Turning on…" : "Turn on notifications"}
        </button>
        <p style={{ margin: 0, textAlign: "center", fontSize: 12, lineHeight: 1.5, color: C.muted }}>Then tap Allow. We&rsquo;ll email you as well, so you won&rsquo;t miss anything.</p>
      </div>
    </Phone>
  );
}

/* ─── 9 · Home ─── */

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/London" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
const londonTime = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(iso));

function Home({ me }: { me: ApprovedMe }) {
  const col = personColour(me.person.id);
  const on = !!me.clockedInSince;
  return (
    <main style={{ flex: 1, boxSizing: "border-box", padding: "calc(env(safe-area-inset-top) + 40px) 18px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 6 }}>
        <span style={{ width: 40, height: 40, borderRadius: "50%", background: col.bg, color: col.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600 }}>{initial(me.person.name)}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{greeting()}</p>
          <p style={{ margin: "1px 0 0", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{firstName(me.person.name)}</p>
        </div>
      </div>

      <div
        style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 14px", boxSizing: "border-box", borderRadius: 18, background: on ? "#172e2a" : C.card }}
      >
        <Icon name="badge" size={22} style={{ color: on ? "#5eead4" : C.muted }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: on ? "#ccfbf1" : "#fff" }}>
            {on ? `On shift · clocked in ${londonTime(me.clockedInSince!)}` : "Not clocked in"}
          </span>
          <span style={{ display: "block", fontSize: 12, color: on ? "#99f6e4" : C.muted }}>
            {[BRANCH[me.branch], "from the clock-in app"].filter(Boolean).join(" · ")}
          </span>
        </span>
      </div>

      {me.manager && <PhoneApprovals />}

      {me.manager && (
        <a href="/meet/staff" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 54, padding: "0 14px", borderRadius: 22, background: C.card, color: "#fff", textDecoration: "none" }}>
          <Icon name="groups" size={21} />
          <span style={{ flex: 1, fontSize: 15 }}>Staff and phones</span>
          <Icon name="chevron_right" size={20} style={{ color: C.faint }} />
        </a>
      )}
    </main>
  );
}

/* ─── 18 · Me (sign out for now) ─── */

function MeScreen({ me, onSignOut }: { me: ApprovedMe; onSignOut: () => void }) {
  const col = personColour(me.person.id);
  const role = me.person.role ? me.person.role[0].toUpperCase() + me.person.role.slice(1) : "";
  return (
    <main style={{ flex: 1, boxSizing: "border-box", padding: "calc(env(safe-area-inset-top) + 40px) 18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 6 }}>
        <span style={{ width: 52, height: 52, borderRadius: "50%", background: col.bg, color: col.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600 }}>{initial(me.person.name)}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>{me.person.name}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: C.muted }}>{[role, BRANCH[me.branch]].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: 0, borderRadius: 18, background: C.card, color: "#fff", fontSize: 15, fontFamily: "inherit", textAlign: "left" }}>
        <Icon name="logout" size={22} />Sign out on this phone
      </button>
    </main>
  );
}

/* ─── Bottom tabs (Calendar, Tasks and News switch on as they're built) ─── */

function TabBar({ tab, onTab }: { tab: "home" | "me"; onTab: (t: "home" | "me") => void }) {
  const item = (label: string, icon: string, key?: "home" | "me") => {
    const current = key === tab;
    const live = !!key;
    return (
      <button
        key={label}
        type="button"
        onClick={live ? () => onTab(key!) : undefined}
        disabled={!live}
        aria-current={current ? "page" : undefined}
        title={live ? undefined : "Coming soon"}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: 0, background: "transparent", padding: 0, fontSize: 11, fontFamily: "inherit", color: current ? "#fff" : C.muted, opacity: live ? 1 : 0.4 }}
      >
        <Icon name={icon} size={24} fill={current} />{label}
      </button>
    );
  };
  return (
    <nav aria-label="App" style={{ position: "sticky", bottom: 0, padding: "10px 22px max(26px, env(safe-area-inset-bottom))", background: C.bg, borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between" }}>
      {item("Home", "home", "home")}
      {item("Calendar", "calendar_month")}
      {item("Tasks", "check_circle")}
      {item("News", "campaign")}
      {item("Me", "person", "me")}
    </nav>
  );
}

/* ─── 30 · Manager: approve new phones ─── */

type Device = { id: string; clockinId: number; staffName: string; label: string; createdAt: string };

function PhoneApprovals() {
  const [pending, setPending] = useState<Device[] | null>(null);
  const [busyId, setBusyId] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/meet/devices", { cache: "no-store" }).catch(() => null);
    if (res?.ok) setPending((await res.json()).pending || []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function decide(d: Device, action: "approve" | "decline") {
    setBusyId(d.id);
    setNote("");
    const res = await fetch("/api/meet/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, action }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusyId("");
    if (!res?.ok) return setNote(data?.error || "Couldn't save that");
    setNote(action === "approve" ? `${firstName(d.staffName)}'s phone is approved.` : `${firstName(d.staffName)}'s phone was declined.`);
    load();
  }

  if (!pending || pending.length === 0) {
    return note ? <p role="status" style={{ margin: 0, fontSize: 13, color: C.muted }}>{note}</p> : null;
  }

  return (
    <section aria-labelledby="ph-h" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <h2 id="ph-h" style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>Phones to approve</h2>
        <span style={{ marginLeft: 8, fontSize: 13, color: C.muted }}>{pending.length} waiting</span>
      </div>
      {pending.map((d) => {
        const col = personColour(d.clockinId);
        return (
          <article key={d.id} style={{ borderRadius: 22, background: C.card, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 36, height: 36, flex: "none", borderRadius: "50%", background: col.bg, color: col.fg, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initial(d.staffName)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, color: C.muted }}>New phone · {ago(d.createdAt)}</span>
                <span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{d.staffName} · {d.label.split(" · ")[0]}</span>
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => decide(d, "approve")} disabled={!!busyId} style={{ flex: 1, height: 40, border: 0, borderRadius: 20, background: "#fff", color: C.bg, fontSize: 14, fontWeight: 600, fontFamily: "inherit", opacity: busyId ? 0.6 : 1 }}>
                {busyId === d.id ? "Saving…" : "Approve"}
              </button>
              <button onClick={() => decide(d, "decline")} disabled={!!busyId} style={{ height: 40, padding: "0 16px", border: 0, borderRadius: 20, background: "#2a2a2a", color: "#fff", fontSize: 14, fontFamily: "inherit" }}>
                Decline
              </button>
            </div>
          </article>
        );
      })}
      {note && <p role="status" style={{ margin: 0, fontSize: 13, color: C.muted }}>{note}</p>}
    </section>
  );
}
