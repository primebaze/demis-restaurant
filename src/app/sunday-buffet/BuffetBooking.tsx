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

  // Confirmation view
  if (result) {
    const range = result.partySize === 1 ? `No. ${result.number}` : `No. ${result.number}–${result.endCover}`;
    return (
      <div className="rounded-2xl border border-gold-300/30 bg-[#151310] p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-gold-300 mb-3">You&apos;re in</p>
        <p className="text-5xl font-bold text-white font-[family-name:var(--font-display)]">{range}</p>
        <p className="mt-3 text-stone-300">
          Party of {result.partySize} · <span className="text-gold-300 font-semibold">£{result.total} total</span>, paid when you arrive
        </p>
        <div className="mt-6 pt-6 border-t border-white/10 text-sm text-stone-400 space-y-1">
          <p>{result.prettyDate}</p>
          <p>Doors from {result.start} until {result.end}</p>
          <p>{result.address}</p>
        </div>
        <p className="mt-6 text-xs text-stone-500">
          Come early, the lower your number, the less you pay. {email ? "A confirmation is on its way to your inbox." : ""}
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
    <div className="rounded-2xl border border-white/10 bg-[#151310] p-6 sm:p-8">
      {avail && (
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 pb-5 border-b border-white/10">
          <div>
            <p className="text-lg font-semibold text-white">{avail.prettyDate}</p>
            <p className="text-sm text-stone-400">Doors {avail.start} – {avail.end} · Streatham Hill</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-500 uppercase tracking-wide">Next spot</p>
            <p className="text-xl font-bold text-gold-300">No. {avail.nextNumber} · £{avail.nextPrice}</p>
          </div>
        </div>
      )}

      {avail && (
        <p className="text-sm text-stone-400 mb-5">
          {avail.tiersLeft[0].left > 0
            ? <><span className="text-gold-300 font-semibold">{avail.tiersLeft[0].left}</span> spots left at £20, then {avail.tiersLeft[1].left} at £25, then £30.</>
            : avail.tiersLeft[1].left > 0
            ? <>£20 spots are gone. <span className="text-gold-300 font-semibold">{avail.tiersLeft[1].left}</span> left at £25, then £30.</>
            : <>Now at £30 per person. Still plenty of room, come join us.</>}
        </p>
      )}

      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (for your confirmation)"
          className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
        />
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl">
          <span className="text-sm text-stone-400">How many of you?</span>
          <div className="flex items-center gap-4">
            <button onClick={() => setPartySize((p) => Math.max(1, p - 1))} className="w-8 h-8 rounded-full border border-white/15 text-white text-lg leading-none hover:bg-white/5">−</button>
            <span className="w-6 text-center text-white font-semibold">{partySize}</span>
            <button onClick={() => setPartySize((p) => Math.min(20, p + 1))} className="w-8 h-8 rounded-full border border-white/15 text-white text-lg leading-none hover:bg-white/5">+</button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={reserve}
          disabled={submitting}
          className="w-full px-4 py-3.5 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition disabled:opacity-50"
        >
          {submitting ? "Reserving…" : "Reserve my spot"}
        </button>
        <p className="text-xs text-stone-500 text-center">No payment now, you pay your tier price at the door.</p>
      </div>
    </div>
  );
}
