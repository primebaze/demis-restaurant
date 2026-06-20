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

  // ── Idle screensaver: clock + tap to check in (or enter PIN if locked) ──
  return (
    <div
      onClick={() => { if (busy) return; if (unlocked) checkIn(); else setShowPin(true); }}
      className={`min-h-screen ${BG} text-white flex items-center justify-center p-6 select-none cursor-pointer`}
    >
      <head><meta name="robots" content="noindex, nofollow" /></head>
      <div className="flex items-center gap-8 sm:gap-12">
        <div className="text-right">
          <div className="flex items-start justify-end">
            <span className="text-[5rem] sm:text-[8rem] leading-none font-light tracking-tight tabular-nums">{hh}:{mm}</span>
            <span className="text-xl sm:text-3xl text-gray-500 ml-2 mt-2 tabular-nums">{ss}</span>
          </div>
          <p className="text-gray-400 mt-3 text-base sm:text-lg">{dateStr}</p>
        </div>

        <div className="w-px h-36 sm:h-44 bg-white/10" />

        <div className="max-w-[16rem]">
          <div className="w-16 h-16 rounded-full border border-white/15 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">{busy ? "Checking in…" : "Tap to Check In"}</h2>
          <p className="text-gray-500 mt-1">{unlocked ? "Tap anywhere to check in" : "Enter the 4-digit PIN to start"}</p>
          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        </div>
      </div>
    </div>
  );
}
