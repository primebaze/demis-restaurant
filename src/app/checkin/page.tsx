"use client";

import { useEffect, useState } from "react";

type Result = {
  number: number;
  priceTier: number;
  checkedInAt: string;
  endsAt: string;
};

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const BG = "bg-[#0f0f0f]";

export default function CheckinKioskPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

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

  // After a check-in, auto-reset to the screensaver.
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 6000);
    return () => clearTimeout(t);
  }, [result]);

  async function checkIn() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 401) { setUnlocked(false); setShowPin(false); }
        setError(d.error || "Check-in failed");
      } else {
        setResult(d);
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

  if (unlocked === null) {
    return <div className={`min-h-screen ${BG} flex items-center justify-center text-gray-500`}>Loading…</div>;
  }

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
      <div className={`min-h-screen ${BG} flex items-center justify-center p-6`}>
        <head><meta name="robots" content="noindex, nofollow" /></head>
        <div className="w-full max-w-sm text-center">
          <div className="mb-8 p-8 bg-white/[0.03] border border-white/10 rounded-3xl">
            <p className="text-sm text-gray-500">You are</p>
            <p className="text-7xl font-extrabold text-white my-2 tracking-tight">No. {result.number}</p>
            <p className="text-5xl font-extrabold text-emerald-400">£{result.priceTier}</p>
            <div className="mt-6 pt-5 border-t border-white/10 text-sm text-gray-400 leading-relaxed">
              Checked in <span className="text-gray-200 font-medium">{fmtTime(result.checkedInAt)}</span>
              <br />
              Please finish by <span className="text-white font-semibold">{fmtTime(result.endsAt)}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-gold-300 animate-spin" />
            <p className="text-sm text-gray-500">Please wait, ready for the next guest…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Idle screensaver: branded clock, tap to check in (or enter PIN if locked) ──
  return (
    <div
      onClick={() => { if (busy) return; if (unlocked) checkIn(); else setShowPin(true); }}
      className={`relative min-h-screen ${BG} text-white flex flex-col items-center justify-center p-6 select-none cursor-pointer overflow-hidden`}
    >
      <head><meta name="robots" content="noindex, nofollow" /></head>

      {/* soft gold glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[42rem] h-[42rem] rounded-full bg-gold-300/[0.06] blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="text-[11px] sm:text-xs font-semibold tracking-[0.4em] uppercase text-gold-300/80 mb-8">
          Demi&apos;s &middot; Sunday Buffet
        </p>

        <div className="flex items-start">
          <span className="text-[5.5rem] sm:text-[9rem] leading-none font-extralight tracking-tight tabular-nums">{hh}:{mm}</span>
          <span className="text-2xl sm:text-4xl text-gold-300/70 ml-2 sm:ml-3 mt-3 tabular-nums">{ss}</span>
        </div>
        <p className="text-gray-400 mt-3 text-base sm:text-lg">{dateStr}</p>

        {/* pulsing gold tap target */}
        <div className="relative mt-14 mb-5 flex items-center justify-center">
          {!busy && <span className="absolute inline-flex h-20 w-20 rounded-full bg-gold-300/20 animate-ping" />}
          <div className="relative w-20 h-20 rounded-full bg-gold-300 text-[#1a1a1a] flex items-center justify-center shadow-[0_0_45px_rgba(232,204,156,0.35)]">
            {busy ? (
              <div className="w-7 h-7 rounded-full border-2 border-[#1a1a1a]/30 border-t-[#1a1a1a] animate-spin" />
            ) : (
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
              </svg>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold">{busy ? "Checking you in…" : "Tap to check in"}</h2>
        <p className="text-gray-500 mt-1">{unlocked ? "Touch anywhere on the screen" : "Enter the 4-digit staff PIN to start"}</p>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      </div>
    </div>
  );
}
