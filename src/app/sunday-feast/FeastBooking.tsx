"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type DateOption = {
  date: string; prettyDate: string; soldOut: boolean;
  spotsLeft: number | null; note: string;
};
type Avail = {
  date: string; prettyDate: string; price: number; minParty?: number; maxParty?: number;
  arrivalSlots?: string[]; dates?: DateOption[]; allSoldOut?: boolean;
  /** False when an admin has switched Sunday Feast bookings off. */
  bookingsOpen?: boolean;
};
type Result = {
  prettyDate: string; address: string; partySize: number; arrivalTime: string;
  packageLabel?: string; pricePerHead?: number; price: number;
};

// Fallback only; the server sends the real list (ARRIVAL_SLOTS in src/lib/saturday-brunch.ts).
const ARRIVAL_SLOTS = ["13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];
const CRICKLEWOOD_PHONE = "020 3904 6977";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
};

export function FeastBooking() {
  const [avail, setAvail] = useState<Avail | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [arrivalTime, setArrivalTime] = useState("");
  const [bookingDate, setBookingDate] = useState("");
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
      const res = await fetch("/api/saturday-brunch"); // the feast runs on the brunch booking API
      const d: Avail = await res.json();
      setAvail(d);
      // Preselect the soonest Sunday that is still open.
      setBookingDate((cur) => cur || d.dates?.find((x) => !x.soldOut)?.date || d.date || "");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { loadAvail(); }, [loadAvail]);

  function validate(): string | null {
    if (!bookingDate) return "Please choose a Sunday";
    if (avail?.dates?.find((d) => d.date === bookingDate)?.soldOut) return "That Sunday is sold out, please pick another";
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
        body: JSON.stringify({ name, email, phone, partySize, arrivalTime, date: bookingDate, website, turnstileToken: token }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Could not book");
        (window as unknown as { turnstile?: TurnstileApi }).turnstile?.reset();
        setToken("");
        return;
      }
      setResult(d);
      loadAvail(); // refresh remaining spaces / sold-out state
    } finally {
      setSubmitting(false);
    }
  }

  const dateOptions = avail?.dates ?? [];
  const selected = dateOptions.find((d) => d.date === bookingDate) ?? null;
  const allSoldOut = !!avail?.allSoldOut;
  const minParty = avail?.minParty ?? 2;
  const maxParty = avail?.maxParty ?? 15;

  const inputCls =
    "w-full px-4 py-3 bg-black/40 border border-white/[0.09] rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-gold-300/60 transition";

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
          <p>{result.packageLabel ?? "Sunday Feast"} · £{result.pricePerHead ?? result.price} per person, paid at the door</p>
          <p>{result.address}</p>
        </div>
        <p className="mt-6 text-xs text-stone-500">A confirmation is on its way to your inbox.</p>
        <button
          onClick={() => { setResult(null); setName(""); setEmail(""); setPhone(""); setPartySize(2); setArrivalTime(""); }}
          className="mt-6 text-sm text-gold-300 hover:text-gold-200 transition"
        >
          Book another table
        </button>
      </div>
    );
  }

  // Bookings switched off in admin: no form, just say so.
  if (avail?.bookingsOpen === false) {
    return (
      <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-6 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)]">
        <div className="absolute top-0 left-7 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-300/70 mb-4">Reserve your table</p>
        <div className="px-4 py-5 rounded-xl border border-red-500/30 bg-red-500/[0.07] text-center">
          <p className="text-base font-semibold text-red-300">Bookings closed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-6 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)]">
      <div className="absolute top-0 left-7 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />

      <div className="pb-4 mb-4 border-b border-white/[0.08]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-300/70 mb-1">Reserve your table</p>
        <p className="text-lg font-semibold text-white">{selected?.prettyDate ?? avail?.prettyDate ?? "This Sunday"}</p>
        <p className="text-[13px] text-stone-500 mt-0.5">
          £{avail?.price ?? 30} per person · for {minParty} or more
        </p>
        <p className="text-[12px] text-stone-500 mt-2">This booking is for the Sunday Feast at Cricklewood.</p>
      </div>

      {allSoldOut && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[0.07] text-center">
          <p className="text-sm font-semibold text-red-300">Fully booked</p>
        </div>
      )}

      <div className="space-y-2.5">
        {dateOptions.length > 1 && (
          <div className="px-4 py-3 bg-black/40 border border-white/[0.09] rounded-xl">
            <span className="block mb-2.5 text-sm text-stone-400">Which Sunday?</span>
            <div className="grid grid-cols-2 gap-2">
              {dateOptions.map((d) => {
                const on = bookingDate === d.date;
                const low = !d.soldOut && d.spotsLeft !== null && d.spotsLeft <= 10;
                // The heading already says "Sunday" — don't repeat it on every option.
                const short = d.prettyDate.replace(/^\w+\s+/, "");
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={d.soldOut}
                    onClick={() => { setBookingDate(d.date); setError(""); }}
                    className={`px-3 py-2 rounded-lg text-[13px] font-semibold border transition leading-tight ${
                      d.soldOut
                        ? "border-white/[0.06] text-stone-600 cursor-not-allowed"
                        : on
                          ? "bg-gold-300 text-black border-gold-300"
                          : "bg-transparent text-stone-300 border-white/15 hover:border-white/30"
                    }`}
                  >
                    <span className={d.soldOut ? "line-through" : ""}>{short}</span>
                    {d.soldOut ? (
                      <span className="block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">Sold out</span>
                    ) : low ? (
                      <span className={`block mt-0.5 text-[10px] font-medium ${on ? "text-black/60" : "text-gold-300"}`}>
                        {d.spotsLeft} left
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
            <button type="button" onClick={() => setPartySize((p) => Math.max(minParty, p - 1))} disabled={partySize <= minParty} className="w-9 h-9 rounded-full border border-white/15 text-white text-lg leading-none hover:bg-white/5 transition disabled:opacity-30">−</button>
            <span className="w-6 text-center text-white font-semibold tabular-nums">{partySize}</span>
            <button type="button" onClick={() => setPartySize((p) => Math.min(maxParty, p + 1))} disabled={partySize >= maxParty} className="w-9 h-9 rounded-full border border-white/15 text-white text-lg leading-none hover:bg-white/5 transition disabled:opacity-30">+</button>
          </div>
        </div>
        {partySize >= maxParty && (
          <p className="-mt-1 px-1 text-xs text-stone-400">
            For groups larger than {maxParty}, please call us on{" "}
            <a href={`tel:${CRICKLEWOOD_PHONE.replace(/\s+/g, "")}`} className="text-gold-300 underline underline-offset-2">{CRICKLEWOOD_PHONE}</a>.
          </p>
        )}

        <div className="px-4 py-3 bg-black/40 border border-white/[0.09] rounded-xl">
          <span className="block mb-2.5 text-sm text-stone-400">What time will you arrive?</span>
          <div className="grid grid-cols-4 gap-2">
            {(avail?.arrivalSlots || ARRIVAL_SLOTS).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setArrivalTime(t)}
                className={`py-2 rounded-lg text-[13px] font-semibold tabular-nums transition border ${
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
          disabled={submitting || allSoldOut}
          className="w-full px-4 py-3.5 mt-1 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition disabled:opacity-50"
        >
          {submitting ? "Reserving…" : allSoldOut ? "Sold out" : "Reserve my table"}
        </button>
        <p className="text-xs text-stone-500 text-center">Free to reserve, pay at the door.</p>
      </div>
    </div>
  );
}
