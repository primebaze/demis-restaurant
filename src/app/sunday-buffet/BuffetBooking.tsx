"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Avail = { date: string; prettyDate: string; start: string; end: string };
type Result = { prettyDate: string; start: string; end: string; address: string };

export function BuffetBooking() {
  const [avail, setAvail] = useState<Avail | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const loadAvail = useCallback(async () => {
    try {
      const res = await fetch("/api/sunday-buffet");
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
    return null;
  }

  async function reserve() {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/sunday-buffet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, website }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not book"); return; }
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
        <p className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">Reservation confirmed</p>
        <div className="mt-5 pt-5 border-t border-white/10 text-sm text-stone-400 space-y-1.5">
          <p className="text-white">{result.prettyDate}</p>
          <p>Doors 12pm · buffet from 12:30pm</p>
          <p>{result.address}</p>
        </div>
        <p className="mt-6 text-xs text-stone-500">A confirmation is on its way to your inbox.</p>
        <button
          onClick={() => { setResult(null); setName(""); setEmail(""); setPhone(""); }}
          className="mt-6 text-sm text-gold-300 hover:text-gold-200 transition"
        >
          Book another spot
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-6 sm:p-7 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)]">
      <div className="absolute top-0 left-7 h-px w-12 bg-gradient-to-r from-gold-300/60 to-transparent" />

      <div className="pb-5 mb-5 border-b border-white/[0.08]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-300/70 mb-1">Reserve your spot</p>
        <p className="text-lg font-semibold text-white">{avail ? avail.prettyDate : "This Sunday"}</p>
        <p className="text-[13px] text-stone-500 mt-0.5">Doors 12pm · buffet from 12:30pm</p>
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

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={reserve}
          disabled={submitting}
          className="w-full px-4 py-4 mt-1 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition disabled:opacity-50"
        >
          {submitting ? "Reserving…" : "Reserve my spot"}
        </button>
        <p className="text-xs text-stone-500 text-center">Free to reserve, pay at the door.</p>
      </div>
    </div>
  );
}
