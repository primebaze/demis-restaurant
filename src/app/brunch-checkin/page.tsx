"use client";

import { useEffect, useState } from "react";

type Result = {
  number: number;
  endCover: number;
  partySize: number;
  totalPrice: number;
  checkedInAt: string;
  endsAt: string;
};

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const BG = "bg-[#0f0f0f]";

export default function BrunchCheckinKioskPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [countdown, setCountdown] = useState(6);
  const [choosing, setChoosing] = useState(false); // party-size step
  const [party, setParty] = useState(1);

  // Live clock for the screensaver (set after mount to avoid hydration mismatch)
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/checkin/unlock")
      .then((r) => r.json())
      .then((d) => setUnlocked(!!d.unlocked))
      .catch(() => setUnlocked(false));
  }, []);

  async function unlock() {
    setBusy(true);
    try {
      const res = await fetch("/api/checkin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Incorrect PIN"); setPin(""); }
      else { setUnlocked(true); setPin(""); setShowPin(false); setError(""); }
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit once 4 digits are entered.
  useEffect(() => {
    if (pin.length === 4 && !busy && !unlocked) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // After a check-in, count down then auto-reset to the screensaver.
  useEffect(() => {
    if (!result) return;
    setCountdown(6);
    const timeout = setTimeout(() => setResult(null), 6000);
    const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => { clearTimeout(timeout); clearInterval(tick); };
  }, [result]);

  async function checkIn() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/brunch-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partySize: party }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 401) { setUnlocked(false); setShowPin(false); }
        setError(d.error || "Check-in failed");
      } else {
        setResult(d);
        setChoosing(false);
        setParty(1);
      }
    } finally {
      setBusy(false);
    }
  }

  function press(d: string) {
    setError("");
    if (d === "back") { setPin((p) => p.slice(0, -1)); return; }
    setPin((p) => (p.length < 4 ? p + d : p));
  }

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";
  const dateStr = now ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

  // ── PIN keypad (after tapping the locked screensaver) ──
  if (!unlocked && showPin) {
    return (
      <div className={`min-h-screen ${BG} text-white flex items-center justify-center p-6 select-none`}>
        <head><meta name="robots" content="noindex, nofollow" /></head>
        <div className="w-full max-w-xs text-center">
          <p className="text-gray-400 mb-6">Enter staff PIN</p>
          <div className="flex justify-center gap-4 mb-2">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`w-4 h-4 rounded-full transition ${i < pin.length ? "bg-gold-300" : "bg-white/15"}`} />
            ))}
          </div>
          <p className="h-6 mt-2 text-sm text-red-400">{error}</p>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button key={d} onClick={() => press(d)} className="py-5 rounded-2xl bg-white/[0.04] border border-white/10 text-2xl font-medium text-white hover:bg-white/[0.08] transition">{d}</button>
            ))}
            <button onClick={() => setShowPin(false)} className="py-5 rounded-2xl text-sm text-gray-500 hover:text-white transition">Cancel</button>
            <button onClick={() => press("0")} className="py-5 rounded-2xl bg-white/[0.04] border border-white/10 text-2xl font-medium text-white hover:bg-white/[0.08] transition">0</button>
            <button onClick={() => press("back")} className="py-5 rounded-2xl text-xl text-gray-400 hover:text-white transition">⌫</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmation ──
  if (result) {
    return (
      <div
        onClick={() => setResult(null)}
        className={`min-h-screen ${BG} flex items-center justify-center p-6 cursor-pointer select-none`}
      >
        <head><meta name="robots" content="noindex, nofollow" /></head>
        <div className="w-full max-w-sm text-center">
          <div className="mb-8 p-8 bg-white/[0.03] border border-white/10 rounded-3xl">
            <p className="text-sm text-gray-500">{result.partySize > 1 ? "You are" : "You are"}</p>
            <p className="text-7xl font-extrabold text-white my-2 tracking-tight">
              No. {result.number}{result.partySize > 1 ? `–${result.endCover}` : ""}
            </p>
            <p className="text-5xl font-extrabold text-emerald-400">£{result.totalPrice}</p>
            {result.partySize > 1 && <p className="text-sm text-gray-400 mt-2">Party of {result.partySize}</p>}
            <div className="mt-6 pt-5 border-t border-white/10 text-sm text-gray-400 leading-relaxed">
              Checked in <span className="text-gray-200 font-medium">{fmtTime(result.checkedInAt)}</span>
              <br />
              Please finish by <span className="text-white font-semibold">{fmtTime(result.endsAt)}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-white/15 flex items-center justify-center text-xl font-bold text-gold-300">{countdown}</div>
            <p className="text-sm text-gray-500">Ready for the next guest in {countdown}s</p>
            <p className="text-xs text-gray-600">or tap anywhere to start now</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Party-size step: how many people, then confirm ──
  if (choosing) {
    return (
      <div className={`min-h-screen ${BG} text-white flex items-center justify-center p-6 select-none`}>
        <head><meta name="robots" content="noindex, nofollow" /></head>
        <div className="w-full max-w-sm text-center">
          <h2 className="text-2xl font-bold mb-1">How many people?</h2>
          <p className="text-sm text-gray-500 mb-8">For this check-in</p>

          <div className="flex items-center justify-center gap-6 mb-10">
            <button
              onClick={() => setParty((p) => Math.max(1, p - 1))}
              className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 text-3xl text-white active:scale-95 transition"
            >−</button>
            <span className="text-7xl font-extrabold tabular-nums w-24">{party}</span>
            <button
              onClick={() => setParty((p) => Math.min(20, p + 1))}
              className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 text-3xl text-white active:scale-95 transition"
            >+</button>
          </div>

          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          <button
            onClick={checkIn}
            disabled={busy}
            className="w-full py-6 bg-gold-300 text-[#1a1a1a] rounded-3xl text-2xl font-bold hover:bg-gold-200 transition disabled:opacity-50"
          >
            {busy ? "…" : `Check in ${party} ${party === 1 ? "person" : "people"}`}
          </button>
          <button
            onClick={() => { setChoosing(false); setParty(1); setError(""); }}
            className="mt-4 text-sm text-gray-500 hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Idle screensaver: branded clock, tap to check in (or enter PIN if locked) ──
  return (
    <div
      onClick={() => { if (busy || unlocked === null) return; if (unlocked) setChoosing(true); else setShowPin(true); }}
      className={`min-h-screen ${BG} text-white flex flex-col items-center justify-center p-6 select-none cursor-pointer`}
    >
      <head><meta name="robots" content="noindex, nofollow" /></head>

      <div className="flex flex-col items-center text-center">
        <p className="text-[11px] sm:text-xs font-semibold tracking-[0.4em] uppercase text-gold-300/80 mb-6">
          Demi&apos;s &middot; Saturday Brunch
        </p>

        <div className="flex items-start">
          <span className="text-[3.25rem] sm:text-[5rem] leading-none font-extralight tracking-tight tabular-nums">{hh}:{mm}</span>
          <span className="text-lg sm:text-2xl text-gold-300/70 ml-2 mt-1.5 tabular-nums">{ss}</span>
        </div>
        <p className="text-gray-500 mt-2 text-sm sm:text-base">{dateStr}</p>

        {/* big tap target */}
        <div className="mt-12 mb-6 flex items-center justify-center">
          <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full bg-gold-300 text-[#1a1a1a] flex items-center justify-center active:scale-95 transition">
            {busy ? (
              <div className="w-16 h-16 rounded-full border-[3px] border-[#1a1a1a]/30 border-t-[#1a1a1a] animate-spin" />
            ) : (
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
              </svg>
            )}
          </div>
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold">{busy ? "Checking you in…" : "Tap to check in"}</h2>
        <p className="text-gray-500 mt-2 text-base">{unlocked ? "Touch anywhere on the screen" : "Enter the 4-digit staff PIN to start"}</p>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      </div>
    </div>
  );
}
