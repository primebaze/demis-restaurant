"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Avail = { date: string; prettyDate: string; price: number; arrivalSlots?: string[] };
type Result = { prettyDate: string; address: string; partySize: number; arrivalTime: string; price: number };

const ARRIVAL_SLOTS = [
  "11:00", "11:30",
  "12:00", "12:30",
  "13:00", "13:30",
  "14:00", "14:30",
  "15:00", "15:30",
  "16:00",
];

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
};

export function BrunchBooking() {
  const [avail, setAvail] = useState<Avail | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [arrivalTime, setArrivalTime] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Cloudflare Turnstile (only when configured)
  const [token, setToken] = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || result) return; // widget only shows on the form view
    const w = window as unknown as { turnstile?: TurnstileApi };
    const render = () => {
      if (!widgetRef.current || !w.turnstile) return;
      widgetRef.current.innerHTML = "";
      setToken("");
      w.turnstile.render(widgetRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
    };
    if (w.turnstile) { render(); return; }
    let s = document.getElementById("cf-turnstile-script") as HTMLScriptElement | null;
    if (!s) {
      s = document.createElement("script");
      s.id = "cf-turnstile-script";
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true; s.defer = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", render);
    return () => s?.removeEventListener("load", render);
  }, [result]);

  useEffect(() => {
    if (result) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const loadAvail = useCallback(async () => {
    try {
      const res = await fetch("/api/saturday-brunch");
      setAvail(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { loadAvail(); }, [loadAvail]);

  function validate(): string | null {
    if (!name.trim()) return "Please enter your name";
    if (!phone.trim()) return "Please enter your phone number";
    if ((phone.match(/\d/g) || []).length < 7) return "Please enter a valid phone number";
    if (!email.trim()) return "Please enter your email";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return "Please enter a valid email";
    if (!arrivalTime) return "Please choose what time you'll arrive";
    if (TURNSTILE_SITE_KEY && !token) return "Please complete the verification below";
    return null;
  }

  async function reserve() {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/saturday-brunch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, partySize, arrivalTime, website, turnstileToken: token }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Could not book");
        (window as unknown as { turnstile?: TurnstileApi }).turnstile?.reset();
        setToken("");
        return;
      }
      setResult(d);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-4 py-3.5 bg-black/40 border border-white/[0.09] rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-gold-300/60 transition";

  // Confirmation
  if (result) {
    return (
      <div ref={cardRef} className="scroll-mt-28 rounded-3xl border border-gold-300/30 bg-gradient-to-b from-gold-300/[0.06] to-white/[0.02] p-8 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gold-300/15 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#e3c07a" strokeWidth="2.5" className="w-7 h-7"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <p className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">Table confirmed</p>
        <div className="mt-5 pt-5 border-t border-white/10 text-sm text-stone-400 space-y-1.5">
          <p className="text-white">{result.prettyDate}</p>
          <p>Party of {result.partySize} · arriving {result.arrivalTime}</p>
          <p>£{result.price} per person, paid at the door</p>
          <p>{result.address}</p>
        </div>
        <p className="mt-6 text-xs text-stone-500">A confirmation is on its way to your inbox.</p>
        <button
          onClick={() => { setResult(null); setName(""); setEmail(""); setPhone(""); setPartySize(1); setArrivalTime(""); }}
          className="mt-6 text-sm text-gold-300 hover:text-gold-200 transition"
        >
          Book another table
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-6 sm:p-7 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)]">
      <div className="absolute top-0 left-7 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />

      <div className="pb-5 mb-5 border-b border-white/[0.08]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-300/70 mb-1">Saturday Brunch · Reserve your table</p>
        <p className="text-lg font-semibold text-white">{avail ? avail.prettyDate : "This Saturday"}</p>
        <p className="text-[13px] text-stone-500 mt-0.5">£{avail?.price ?? 35} per person · 11am – 4pm</p>
        <p className="text-[12px] text-stone-500 mt-2">This booking is for the Saturday bottomless brunch.</p>
      </div>

      <div className="space-y-3">
        <input
          type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true"
          className="absolute left-[-9999px] w-px h-px opacity-0"
        />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className={inputCls} />
        <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" autoComplete="tel" className={inputCls} />
        <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" className={inputCls} />

        <div className="flex items-center justify-between px-4 py-3 bg-black/40 border border-white/[0.09] rounded-xl">
          <span className="text-sm text-stone-400">How many of you?</span>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setPartySize((p) => Math.max(1, p - 1))} className="w-9 h-9 rounded-full border border-white/15 text-white text-lg leading-none hover:bg-white/5 transition">−</button>
            <span className="w-6 text-center text-white font-semibold tabular-nums">{partySize}</span>
            <button type="button" onClick={() => setPartySize((p) => Math.min(10, p + 1))} className="w-9 h-9 rounded-full border border-white/15 text-white text-lg leading-none hover:bg-white/5 transition">+</button>
          </div>
        </div>

        <div className="px-4 py-3.5 bg-black/40 border border-white/[0.09] rounded-xl">
          <div className="mb-3">
            <span className="text-sm text-stone-400">What time will you arrive?</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(avail?.arrivalSlots || ARRIVAL_SLOTS).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setArrivalTime(t)}
                className={`py-2.5 rounded-lg text-[13px] font-semibold tabular-nums transition border ${
                  arrivalTime === t
                    ? "bg-gold-300 text-black border-gold-300"
                    : "bg-transparent text-stone-300 border-white/15 hover:border-white/30"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {TURNSTILE_SITE_KEY && <div ref={widgetRef} className="flex justify-center pt-1" />}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={reserve}
          disabled={submitting}
          className="w-full px-4 py-4 mt-1 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition disabled:opacity-50"
        >
          {submitting ? "Reserving…" : "Reserve my table"}
        </button>
        <p className="text-xs text-stone-500 text-center">Free to reserve, pay at the door.</p>
      </div>
    </div>
  );
}
