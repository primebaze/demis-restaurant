"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Delete, Loader2, LogOut, Search, Share, SquarePlus, Smartphone, Clock, Check, X, Hourglass } from "lucide-react";

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
      clockedInSince: string | null;
    };

/** Demi's Meetings: one page that shows sign-in, waiting for approval, the home-screen step, or Home. */
export default function MeetApp() {
  const [me, setMe] = useState<Me>({ state: "loading" });

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

  if (me.state === "loading") return <Centered><Loader2 className="h-6 w-6 animate-spin text-white/60" strokeWidth={1.75} /></Centered>;
  if (me.state === "error") {
    return (
      <Centered>
        <p className="text-lg">Can&rsquo;t connect right now</p>
        <button onClick={load} className="mt-4 h-11 rounded-full bg-white px-6 text-[15px] font-medium text-ink-950">Try again</button>
      </Centered>
    );
  }
  if (me.state === "signed_out") return <SignIn onDone={load} />;
  if (me.state === "pending" || me.state === "declined") return <Waiting me={me} onSignOut={signOut} />;
  return <Approved me={me} onSignOut={signOut} reload={load} />;
}

/* ─── Layout bits ─── */

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">{children}</main>;
}

function Brand() {
  return (
    <div className="inline-flex h-11 items-center gap-3 self-center rounded-2xl bg-white/[0.06] px-4">
      <img src="/logo.png" alt="Demi's" className="h-[14px] w-auto" />
      <span aria-hidden="true" className="h-4 w-px bg-white/15" />
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-honey-300">Meetings</span>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/* ─── Sign in ─── */

function SignIn({ onDone }: { onDone: () => void }) {
  const [people, setPeople] = useState<{ id: number; name: string }[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [query, setQuery] = useState("");
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

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (people || []).filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [people, query]);

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
    if (busy || picked == null || pin.length >= 4) return;
    setError("");
    const next = pin + d;
    setPin(next);
    if (next.length === 4) submit(next);
  };

  // Typing on a keyboard works too.
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (/^\d$/.test(e.key)) pressRef.current(e.key);
      if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pickedName = people?.find((p) => p.id === picked)?.name;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-6 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(28px,env(safe-area-inset-top))]">
      <Brand />
      <div className="text-center">
        <h1 className="text-[28px] font-medium tracking-tight">Who&rsquo;s signing in?</h1>
        <p className="mt-1 text-[15px] text-white/60">Use the same PIN you clock in with</p>
      </div>

      {loadError ? (
        <p className="rounded-2xl bg-white/[0.06] px-4 py-3 text-center text-sm text-white/80">{loadError}</p>
      ) : !people ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-white/50" strokeWidth={1.75} /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {people.length > 8 && (
            <label className="flex h-11 items-center gap-2 rounded-full bg-white/[0.06] px-4 text-white/60">
              <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find your name"
                aria-label="Find your name"
                className="h-full flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/40"
              />
            </label>
          )}
          <div role="group" aria-label="Your name" className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {shown.map((p) => {
              const on = p.id === picked;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => { setPicked(p.id); setPin(""); setError(""); }}
                  className="flex w-[72px] shrink-0 flex-col items-center gap-2"
                >
                  <span className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-medium transition ${on ? "bg-honey-300 text-ink-950 ring-2 ring-white ring-offset-2 ring-offset-ink-950" : "bg-white/[0.08] text-white"}`}>
                    {initials(p.name)}
                  </span>
                  <span className={`w-full truncate text-center text-[13px] ${on ? "text-white" : "text-white/60"}`}>{p.name.split(" ")[0]}</span>
                </button>
              );
            })}
            {shown.length === 0 && <p className="py-4 text-sm text-white/50">No one by that name</p>}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <p className="h-5 text-sm text-white/70">{pickedName ? `PIN for ${pickedName}` : people ? "Tap your name first" : ""}</p>
        <div role="img" aria-label={`PIN, ${pin.length} of 4 digits entered`} className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-full transition ${i < pin.length ? "bg-white" : "bg-white/15"}`} />
          ))}
        </div>
        <p role="status" className="min-h-[20px] text-center text-sm text-red-300">{busy ? "" : error}</p>
      </div>

      <div className="mx-auto grid w-full max-w-[300px] grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Key key={d} onClick={() => press(d)} disabled={busy || picked == null}>{d}</Key>
        ))}
        <span />
        <Key onClick={() => press("0")} disabled={busy || picked == null}>0</Key>
        <Key onClick={() => setPin((p) => p.slice(0, -1))} disabled={busy || !pin} label="Delete digit">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} /> : <Delete className="h-6 w-6" strokeWidth={1.5} />}
        </Key>
      </div>

      <p className="mt-auto text-center text-[13px] text-white/50">Forgot your PIN? Ask a manager to reset it in the clock-in app.</p>
    </main>
  );
}

function Key({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-[68px] items-center justify-center rounded-full bg-white/[0.07] text-[26px] font-light transition active:bg-white/20 disabled:text-white/30"
    >
      {children}
    </button>
  );
}

/* ─── Waiting for a manager ─── */

function Waiting({ me, onSignOut }: { me: { state: "pending" | "declined"; name: string }; onSignOut: () => void }) {
  const declined = me.state === "declined";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-6 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(28px,env(safe-area-inset-top))]">
      <Brand />
      <div className="mt-6 flex flex-col items-center gap-4 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/[0.07]">
          {declined ? <X className="h-9 w-9 text-red-300" strokeWidth={1.5} /> : <Hourglass className="h-9 w-9 text-honey-300" strokeWidth={1.5} />}
        </span>
        <h1 className="text-[26px] font-medium tracking-tight">{declined ? "This phone wasn't approved" : "Waiting for a manager"}</h1>
        <p className="max-w-[320px] text-[15px] leading-relaxed text-white/65">
          {declined
            ? "A manager declined this phone. If that's a mistake, ask them, then sign in again."
            : `Hi ${me.name.split(" ")[0]}. This is a new phone, so a manager needs to approve it once. This page will open by itself when they do.`}
        </p>
      </div>
      {!declined && (
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3.5 text-sm text-white/75">
          <Smartphone className="h-5 w-5 shrink-0 text-white/60" strokeWidth={1.5} />
          After that, this phone stays signed in for 30 days.
        </div>
      )}
      <button onClick={onSignOut} className="mt-auto h-12 rounded-full bg-white/[0.08] text-[15px]">
        {declined ? "Sign in again" : "Not you? Sign out"}
      </button>
    </main>
  );
}

/* ─── Signed in ─── */

type ApprovedMe = Extract<Me, { state: "approved" }>;

function useStandalone() {
  const [info, setInfo] = useState<{ ios: boolean; standalone: boolean; phone: boolean } | null>(null);
  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const phone = /iPhone|iPod|Android.+Mobile/.test(ua);
    setInfo({ ios, standalone, phone });
  }, []);
  return info;
}

function Approved({ me, onSignOut, reload }: { me: ApprovedMe; onSignOut: () => void; reload: () => void }) {
  const device = useStandalone();
  if (!device) return null;
  // On iPhone the app only works from the home screen (needed for notifications and to stay signed in).
  if (device.ios && device.phone && !device.standalone) return <InstallGuide />;
  return <Home me={me} onSignOut={onSignOut} reload={reload} />;
}

function InstallGuide() {
  const steps: { icon: React.ReactNode; text: React.ReactNode }[] = [
    { icon: <Share className="h-5 w-5" strokeWidth={1.75} />, text: <>Tap the <strong className="font-medium">Share</strong> button in Safari&rsquo;s toolbar</> },
    { icon: <SquarePlus className="h-5 w-5" strokeWidth={1.75} />, text: <>Choose <strong className="font-medium">Add to Home Screen</strong>, then Add</> },
    { icon: <img src="/meet/apple-touch-icon.png" alt="" className="h-6 w-6 rounded-md" />, text: <>Open <strong className="font-medium">Demi&rsquo;s</strong> from your home screen</> },
  ];
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-6 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(28px,env(safe-area-inset-top))]">
      <Brand />
      <div className="mt-2 text-center">
        <img src="/meet/apple-touch-icon.png" alt="" className="mx-auto h-20 w-20 rounded-[22px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]" />
        <h1 className="mt-5 text-[26px] font-medium tracking-tight">Add Demi&rsquo;s to your home screen</h1>
        <p className="mx-auto mt-2 max-w-[320px] text-[15px] leading-relaxed text-white/65">It works like a normal app from there, with notifications for your rota and tasks.</p>
      </div>
      <ol className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-4 rounded-2xl bg-white/[0.06] px-4 py-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-medium text-ink-950">{i + 1}</span>
            <span className="flex-1 text-[15px] text-white/85">{s.text}</span>
            <span className="text-white/70">{s.icon}</span>
          </li>
        ))}
      </ol>
      <p className="mt-auto text-center text-[13px] text-white/45">You&rsquo;re already signed in. It carries over to the home screen app.</p>
    </main>
  );
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/London" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function londonTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(iso));
}

const BRANCH: Record<string, string> = { cricklewood: "Cricklewood", streatham: "Streatham Hill", both: "Both branches" };

function Home({ me, onSignOut, reload }: { me: ApprovedMe; onSignOut: () => void; reload: () => void }) {
  const first = me.person.name.split(" ")[0];
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" }).format(new Date());
  const role = me.person.role ? me.person.role[0].toUpperCase() + me.person.role.slice(1) : "";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-4 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(22px,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm text-white/55">{today}</p>
          <h1 className="text-[26px] font-medium tracking-tight">{greeting()}, {first}</h1>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.08] text-base font-medium" aria-hidden="true">{initials(me.person.name)}</span>
      </header>

      <section aria-label="Your shift" className="rounded-[22px] bg-white/[0.06] p-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${me.clockedInSince ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-white/60"}`}>
            <Clock className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium">{me.clockedInSince ? "You're clocked in" : "Not clocked in"}</p>
            <p className="text-[13px] text-white/55">
              {me.clockedInSince ? `Since ${londonTime(me.clockedInSince)}` : "From the clock-in app"}
              {role ? ` · ${role}` : ""}
              {BRANCH[me.branch] ? ` · ${BRANCH[me.branch]}` : ""}
            </p>
          </div>
        </div>
      </section>

      {me.manager && <PhoneApprovals />}

      <section className="rounded-[22px] bg-white/[0.04] p-4">
        <p className="text-[15px] font-medium">Coming next</p>
        <p className="mt-1 text-[13px] leading-relaxed text-white/55">Your rota, tasks, team news and meetings will appear here as they&rsquo;re switched on.</p>
      </section>

      <div className="mt-auto flex items-center justify-between pt-4">
        <button onClick={reload} className="h-10 rounded-full px-3 text-sm text-white/55">Refresh</button>
        <button onClick={onSignOut} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/[0.06] px-4 text-sm text-white/80">
          <LogOut className="h-4 w-4" strokeWidth={1.75} />Sign out
        </button>
      </div>
    </main>
  );
}

/* ─── Managers: approve new phones ─── */

type Device = { id: string; staffName: string; label: string; createdAt: string };

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

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
    setNote(action === "approve" ? `${d.staffName.split(" ")[0]}'s phone is approved.` : `${d.staffName.split(" ")[0]}'s phone was declined.`);
    load();
  }

  if (!pending || pending.length === 0) {
    return note ? <p role="status" className="px-1 text-sm text-white/60">{note}</p> : null;
  }

  return (
    <section aria-labelledby="ph-h" className="flex flex-col gap-2 rounded-[22px] bg-white/[0.06] p-4">
      <h2 id="ph-h" className="text-[15px] font-medium">Phones waiting for you <span className="ml-1 rounded-full bg-honey-300 px-2 py-0.5 text-xs font-medium text-ink-950">{pending.length}</span></h2>
      {pending.map((d) => (
        <article key={d.id} className="flex flex-col gap-3 rounded-2xl bg-white/[0.05] p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-sm font-medium">{initials(d.staffName)}</span>
            <span className="flex-1">
              <span className="block text-[15px] font-medium">{d.staffName}</span>
              <span className="block text-xs text-white/55">{d.label} · signed in {ago(d.createdAt)}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => decide(d, "approve")} disabled={!!busyId} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-sm font-medium text-ink-950 disabled:bg-white/30">
              {busyId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2} />}Approve
            </button>
            <button onClick={() => decide(d, "decline")} disabled={!!busyId} className="h-10 rounded-full bg-white/[0.08] px-4 text-sm disabled:text-white/40">Decline</button>
          </div>
        </article>
      ))}
      {note && <p role="status" className="text-sm text-white/60">{note}</p>}
    </section>
  );
}
