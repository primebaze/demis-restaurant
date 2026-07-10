"use client";

import { useEffect, useState, useCallback } from "react";

type Avail = {
  prettyDate: string;
  start: string;
  end: string;
  bookedCovers: number;
  nextNumber: number;
  nextPrice: number;
  tiersLeft: { price: number; left: number }[];
};

type Result = {
  number: number;
  endCover: number;
  partySize: number;
  total: number;
  prettyDate: string;
  start: string;
  end: string;
  address: string;
};

export function BuffetBooking() {
  const [avail, setAvail] = useState<Avail | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const loadAvail = useCallback(async () => {
    try {
      const res = await fetch("/api/sunday-buffet");
      setAvail(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { loadAvail(); }, [loadAvail]);

  async function reserve() {
    if (!name.trim()) { setError("Please enter your name"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/sunday-buffet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, partySize }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not book"); return; }
      setResult(d);
      loadAvail();
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-4 py-3.5 bg-black/40 border border-white/[0.09] rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-gold-300/60 transition";

  // Confirmation view
  if (result) {
    const range = result.partySize === 1 ? `No. ${result.number}` : `No. ${result.number}–${result.endCover}`;
    return (
      <div className="rounded-3xl border border-gold-300/30 bg-gradient-to-b from-gold-300/[0.06] to-white/[0.02] p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-gold-300 mb-4">You&apos;re in</p>
        <p className="text-5xl font-semibold text-white font-[family-name:var(--font-display)]">{range}</p>
        <p className="mt-4 text-stone-300">
          Party of {result.partySize} · <span className="text-gold-300 font-semibold">£{result.total} total</span>
        </p>
        <p className="text-xs text-stone-500 mt-1">paid when you arrive</p>
        <div className="mt-7 pt-6 border-t border-white/10 text-sm text-stone-400 space-y-1.5">
          <p className="text-white">{result.prettyDate}</p>
          <p>Doors {result.start} – {result.end}</p>
          <p>{result.address}</p>
        </div>
        <p className="mt-6 text-xs text-stone-500 leading-relaxed">
          The lower your number, the less you pay. {email ? "A confirmation is on its way to your inbox." : ""}
        </p>
        <button
          onClick={() => { setResult(null); setName(""); setEmail(""); setPhone(""); setPartySize(1); }}
          className="mt-6 text-sm text-gold-300 hover:text-gold-200 transition"
        >
          Book another spot
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/[0.09] bg-white/[0.03] p-6 sm:p-7 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
      {avail && (
        <div className="flex flex-wrap items-start justify-between gap-3 pb-5 mb-5 border-b border-white/[0.08]">
          <div>
            <p className="text-lg font-semibold text-white">{avail.prettyDate}</p>
            <p className="text-[13px] text-stone-500 mt-0.5">Doors {avail.start} – {avail.end}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-500 uppercase tracking-[0.15em]">Next spot</p>
            <p className="text-lg font-semibold text-gold-300 mt-0.5">No. {avail.nextNumber} · £{avail.nextPrice}</p>
          </div>
        </div>
      )}

      {avail && (
        <p className="text-[13px] text-stone-400 mb-5 leading-relaxed">
          {avail.tiersLeft[0].left > 0
            ? <><span className="text-gold-300 font-semibold">{avail.tiersLeft[0].left}</span> spots left at £20, then {avail.tiersLeft[1].left} at £25, then £30.</>
            : avail.tiersLeft[1].left > 0
            ? <>£20 spots are gone. <span className="text-gold-300 font-semibold">{avail.tiersLeft[1].left}</span> left at £25, then £30.</>
            : <>Now £30 per person, still plenty of room, come join us.</>}
        </p>
      )}

      <div className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (for your confirmation)" className={inputCls} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className={inputCls} />
        <div className="flex items-center justify-between px-4 py-3 bg-black/40 border border-white/[0.09] rounded-xl">
          <span className="text-sm text-stone-400">How many of you?</span>
          <div className="flex items-center gap-4">
            <button onClick={() => setPartySize((p) => Math.max(1, p - 1))} className="w-9 h-9 rounded-full border border-white/15 text-white text-lg leading-none hover:bg-white/5 transition">−</button>
            <span className="w-6 text-center text-white font-semibold tabular-nums">{partySize}</span>
            <button onClick={() => setPartySize((p) => Math.min(20, p + 1))} className="w-9 h-9 rounded-full border border-white/15 text-white text-lg leading-none hover:bg-white/5 transition">+</button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={reserve}
          disabled={submitting}
          className="w-full px-4 py-4 mt-1 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition disabled:opacity-50"
        >
          {submitting ? "Reserving…" : "Reserve my spot"}
        </button>
        <p className="text-xs text-stone-500 text-center">No payment now, you pay your tier price at the door.</p>
      </div>
    </div>
  );
}
