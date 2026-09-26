"use client";

import { useEffect, useState, useCallback } from "react";

type Visit = {
  id: string; seq: number; label: string; hasDetails: boolean;
  name: string; phone: string; email: string;
  visitType: string; partySize: number; tableNo: string; isBooking: boolean;
  checkedInAt: string; checkedOutAt: string | null;
  amountPence: number | null; status: string;
};

const money = (p: number) => `£${(p / 100).toFixed(2)}`;
const clock = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Time in the building, counting up from arrival. */
function elapsed(from: string, to: string | null, now: number): string {
  const ms = (to ? new Date(to).getTime() : now) - new Date(from).getTime();
  const m = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

export default function DoorKioskPage({ params }: { params: { location: string } }) {
  const { location } = params;

  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const [visits, setVisits] = useState<Visit[]>([]);
  const [locationName, setLocationName] = useState("");
  const [stillIn, setStillIn] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [visitType, setVisitType] = useState<"dining" | "takeaway">("dining");
  const [partySize, setPartySize] = useState(1);
  const [tableNo, setTableNo] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [flashBad, setFlashBad] = useState(false);

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState("");

  const dining = visitType === "dining";

  useEffect(() => {
    fetch("/api/checkin/unlock").then((r) => r.json()).then((d) => setUnlocked(!!d.unlocked));
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/door?location=${location}`);
    if (res.status === 401) { setUnlocked(false); return; }
    const d = await res.json();
    setVisits(d.visits || []);
    setLocationName(d.locationName || "");
    setStillIn(d.totals?.stillIn || 0);
  }, [location]);

  useEffect(() => { if (unlocked) load(); }, [unlocked, load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!unlocked) return;
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [unlocked, load]);

  async function unlock(value: string) {
    setPinBusy(true);
    setPinError("");
    try {
      const res = await fetch("/api/checkin/unlock", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const d = await res.json();
      if (!res.ok) { setPinError(d.error || "Incorrect PIN"); setPin(""); return; }
      setUnlocked(true);
    } finally { setPinBusy(false); }
  }

  function onPin(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
    if (digits.length === 4 && !pinBusy) unlock(digits);
  }

  async function checkIn() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/door", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, visitType, partySize, tableNo, name, phone, email, isBooking }),
      });
      if (res.status === 401) { setUnlocked(false); return; }
      const d = await res.json();
      if (!res.ok) { setFlashBad(true); setFlash(d.error || "Could not check in"); return; }
      setFlashBad(false);
      setFlash(`${d.label} checked in`);
      setName(""); setPhone(""); setEmail(""); setPartySize(1); setTableNo(""); setIsBooking(false);
      load();
      setTimeout(() => setFlash(""), 3500);
    } finally { setBusy(false); }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setRowBusy(id);
    try {
      const res = await fetch(`/api/door/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.status === 401) { setUnlocked(false); return; }
      await load();
    } finally { setRowBusy(""); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this check-in?")) return;
    setRowBusy(id);
    try {
      const res = await fetch(`/api/door/${id}`, { method: "DELETE" });
      if (res.status === 401) { setUnlocked(false); return; }
      await load();
    } finally { setRowBusy(""); }
  }

  const field =
    "w-full px-3.5 py-2.5 bg-black/30 border border-white/[0.07] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gold-300/50 focus:bg-black/50 transition";
  const card = "bg-[#161616] border border-white/[0.06] rounded-2xl";

  // ── Locked ──
  if (unlocked !== true) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-5">
        <div className="w-full max-w-xs text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold-300/60 mb-2">Door check-in</p>
          <h1 className="text-2xl font-bold text-white mb-8">Staff PIN</h1>
          <input
            value={pin}
            onChange={(e) => onPin(e.target.value)}
            inputMode="numeric"
            autoFocus
            placeholder="••••"
            disabled={pinBusy || unlocked === null}
            className="w-full px-4 py-5 bg-[#161616] border border-white/[0.07] rounded-2xl text-white text-center text-3xl tracking-[0.5em] font-bold placeholder-gray-700 focus:outline-none focus:border-gold-300/50 disabled:opacity-50"
          />
          <p className="mt-4 text-xs h-4">
            {pinError
              ? <span className="text-red-400">{pinError}</span>
              : <span className="text-gray-600">Enter the 4-digit staff PIN</span>}
          </p>
        </div>
      </div>
    );
  }

  // ── Unlocked ──
  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-6 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gold-300/60 mb-1.5">Door check-in</p>
            <h1 className="text-3xl font-bold text-white leading-none">{locationName || "…"}</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500">In the building</p>
            <p className="text-3xl font-bold text-white tabular-nums leading-tight">{stillIn}</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
          <section className={`${card} p-5 lg:sticky lg:top-6`}>
            <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-xl mb-4">
              {(["dining", "takeaway"] as const).map((t) => {
                const on = visitType === t;
                return (
                  <button key={t}
                    onClick={() => { setVisitType(t); if (t === "takeaway") { setPartySize(1); setTableNo(""); setIsBooking(false); } }}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                      on ? (t === "dining" ? "bg-gold-300 text-black" : "bg-emerald-400 text-black") : "text-gray-400 hover:text-white"
                    }`}>
                    {t === "dining" ? "Dining in" : "Takeaway"}
                  </button>
                );
              })}
            </div>

            {dining && (
              <div className="flex items-end gap-2.5 mb-4">
                <label className="flex-1 min-w-0">
                  <span className="block text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1.5">Table</span>
                  <input value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="—"
                    className={`${field} text-center font-semibold`} />
                </label>
                <label className="flex-1 min-w-0">
                  <span className="block text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1.5">Guests</span>
                  <div className="flex items-center justify-between px-2 py-1.5 bg-black/30 border border-white/[0.07] rounded-xl">
                    <button onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                      className="w-7 h-7 rounded-lg border border-white/10 text-white text-lg leading-none hover:bg-white/5 active:scale-95 transition">−</button>
                    <span className="text-lg font-bold text-white tabular-nums">{partySize}</span>
                    <button onClick={() => setPartySize((p) => Math.min(30, p + 1))}
                      className="w-7 h-7 rounded-lg border border-white/10 text-white text-lg leading-none hover:bg-white/5 active:scale-95 transition">+</button>
                  </div>
                </label>
              </div>
            )}

            <div className="space-y-2.5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={field} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" className={field} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" inputMode="email" className={field} />
            </div>

            {dining && (
              <button onClick={() => setIsBooking((b) => !b)}
                className={`mt-3 w-full py-2 text-xs rounded-lg border transition ${isBooking ? "bg-gold-300/10 border-gold-300/40 text-gold-300" : "border-white/[0.07] text-gray-500 hover:text-white"}`}>
                {isBooking ? "✓ Has a booking" : "Has a booking?"}
              </button>
            )}

            <button onClick={checkIn} disabled={busy}
              className="mt-4 w-full py-3.5 bg-gold-300 text-black font-bold rounded-xl hover:bg-gold-200 active:scale-[0.99] transition disabled:opacity-50">
              {busy ? "…" : "Check in"}
            </button>

            <p className="mt-3 text-[11px] text-gray-600 text-center">
              {flash
                ? <span className={flashBad ? "text-red-400" : "text-emerald-400"}>{flash}</span>
                : <>All details optional · blank logs as Customer {visits.length + 1}</>}
            </p>
          </section>

          <section className={`${card} overflow-hidden`}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white">Today</h2>
              <span className="text-xs text-gray-500">{visits.length} {visits.length === 1 ? "visit" : "visits"}</span>
            </div>

            {visits.length === 0 ? (
              <p className="px-5 py-14 text-center text-sm text-gray-500">No one checked in yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {visits.map((v) => {
                  const open = v.status === "active";
                  const isDining = v.visitType === "dining";
                  return (
                    <div key={v.id} className={`px-4 py-3 ${open ? "" : "bg-black/25"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-bold tabular-nums ${isDining ? "bg-gold-300/12 text-gold-300" : "bg-emerald-400/12 text-emerald-400"}`}>
                          {v.seq}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${v.hasDetails ? "text-white" : "text-gray-500"}`}>{v.label}</p>
                          <p className="text-[11px] text-gray-500 truncate">
                            <span className={isDining ? "text-gold-300/70" : "text-emerald-400/70"}>
                              {isDining ? `Dining · ${v.partySize}` : "Takeaway"}
                            </span>
                            {v.tableNo && <> · <span className="text-gray-300 font-semibold">Table {v.tableNo}</span></>}
                            {v.isBooking && " · booked"}
                            {` · ${clock(v.checkedInAt)}`}
                            {v.checkedOutAt && ` → ${clock(v.checkedOutAt)}`}
                          </p>
                        </div>

                        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums ${open ? "bg-white/[0.07] text-gray-200" : "text-gray-600"}`}>
                          {elapsed(v.checkedInAt, v.checkedOutAt, now)}
                        </span>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {v.amountPence != null && !open ? (
                            <span className="w-[74px] text-right text-sm font-bold text-emerald-300 tabular-nums">{money(v.amountPence)}</span>
                          ) : (
                            <input
                              value={amounts[v.id] ?? (v.amountPence != null ? (v.amountPence / 100).toFixed(2) : "")}
                              onChange={(e) => setAmounts((a) => ({ ...a, [v.id]: e.target.value }))}
                              placeholder="£0.00" inputMode="decimal"
                              className="w-[74px] px-2 py-1.5 bg-black/40 border border-white/[0.07] rounded-lg text-white text-sm text-right tabular-nums focus:outline-none focus:border-gold-300/50"
                            />
                          )}

                          {open ? (
                            <button onClick={() => patch(v.id, { action: "checkout", amount: amounts[v.id] ?? "" })} disabled={rowBusy === v.id}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition disabled:opacity-40">
                              {rowBusy === v.id ? "…" : "Check out"}
                            </button>
                          ) : (
                            <button onClick={() => patch(v.id, { action: "reopen" })} disabled={rowBusy === v.id}
                              className="px-3 py-1.5 text-xs rounded-lg border border-white/[0.07] text-gray-500 hover:text-white transition disabled:opacity-40">
                              Reopen
                            </button>
                          )}
                          <button onClick={() => remove(v.id)} title="Remove"
                            className="w-7 h-7 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition">✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
