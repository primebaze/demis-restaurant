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

export default function CheckinKioskPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch("/api/checkin/unlock")
      .then((r) => r.json())
      .then((d) => setUnlocked(!!d.unlocked))
      .catch(() => setUnlocked(false));
  }, []);

  async function unlock() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/checkin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const d = await res.json();
      if (!res.ok) setError(d.error || "Could not unlock");
      else { setUnlocked(true); setPin(""); }
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 401) setUnlocked(false);
        setError(d.error || "Check-in failed");
      } else {
        setResult(d);
        setName("");
      }
    } finally {
      setBusy(false);
    }
  }

  if (unlocked === null) {
    return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-gray-400">Loading…</div>;
  }

  // ── PIN screen ──
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-6">
        <head><meta name="robots" content="noindex, nofollow" /></head>
        <div className="w-full max-w-xs text-center">
          <h1 className="text-2xl font-bold text-gold-300 mb-1">Demi&apos;s Check-in</h1>
          <p className="text-sm text-gray-500 mb-6">Enter the staff PIN to start.</p>
          <form onSubmit={(e) => { e.preventDefault(); unlock(); }}>
            <input
              type="password"
              inputMode="numeric"
              enterKeyHint="go"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="PIN"
              className="w-full text-center text-2xl tracking-[0.5em] px-4 py-4 bg-[#1a1a1a] border border-gray-700 rounded-2xl text-white focus:outline-none focus:border-gold-400"
              autoFocus
            />
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy || !pin}
              className="mt-5 w-full py-4 bg-gold-300 text-[#1a1a1a] rounded-2xl font-semibold hover:bg-gold-200 transition disabled:opacity-50"
            >
              {busy ? "…" : "Start"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Check-in screen ──
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-6">
      <head><meta name="robots" content="noindex, nofollow" /></head>
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-gold-300 mb-8 tracking-wide">Buffet Check-in</h1>

        {result ? (
          /* ── Confirmation: one guest, then "Next guest" resets ── */
          <>
            <div className="mb-8 p-8 bg-[#161616] border border-white/10 rounded-3xl">
              <p className="text-sm text-gray-500">You are</p>
              <p className="text-7xl font-extrabold text-white my-2 tracking-tight">No. {result.number}</p>
              <p className="text-5xl font-extrabold text-emerald-400">£{result.priceTier}</p>
              <div className="mt-6 pt-5 border-t border-white/10 text-sm text-gray-400 leading-relaxed">
                Checked in <span className="text-gray-200 font-medium">{fmtTime(result.checkedInAt)}</span>
                <br />
                Please finish by <span className="text-white font-semibold">{fmtTime(result.endsAt)}</span>
              </div>
            </div>
            <button
              onClick={() => { setResult(null); setError(""); }}
              className="w-full py-6 bg-gold-300 text-[#1a1a1a] rounded-3xl text-2xl font-bold hover:bg-gold-200 transition"
            >
              Next guest
            </button>
          </>
        ) : (
          /* ── Ready: optional name, then big Check In ── */
          <>
            <p className="text-gray-500 mb-6">Tap to check in</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="w-full mb-5 px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-2xl text-white text-center placeholder-gray-600 focus:outline-none focus:border-gold-400"
            />
            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
            <button
              onClick={checkIn}
              disabled={busy}
              className="w-full py-6 bg-gold-300 text-[#1a1a1a] rounded-3xl text-2xl font-bold hover:bg-gold-200 transition disabled:opacity-50"
            >
              {busy ? "…" : "Check In"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
