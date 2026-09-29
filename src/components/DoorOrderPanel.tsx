"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { DOOR_CATALOG, orderTotal, type OrderKind, type OrderLine } from "@/lib/door-menu";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;
const lineKey = (l: { name: string; group: string }) => `${l.group}::${l.name}`;

/**
 * Take a guest's food and drinks order at the door. Tap to add from the menu,
 * adjust quantities, or type anything that isn't listed. Nothing is saved
 * until "Save order"; closing without saving discards the changes.
 */
export function DoorOrderPanel({
  label,
  tableNo,
  initial,
  onSave,
  onUseTotal,
  onClose,
}: {
  label: string;
  tableNo: string;
  initial: OrderLine[];
  onSave: (lines: OrderLine[]) => Promise<boolean>;
  onUseTotal: (pence: number) => void;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<OrderLine[]>(initial);
  const [tab, setTab] = useState<OrderKind>("food");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [used, setUsed] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, [tab]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const qtyByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) m.set(lineKey(l), (m.get(lineKey(l)) || 0) + l.qty);
    return m;
  }, [lines]);

  // Menu for the current tab, filtered by the search box, kept in menu order.
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out: { group: string; items: typeof DOOR_CATALOG }[] = [];
    for (const item of DOOR_CATALOG) {
      if (item.kind !== tab) continue;
      if (needle && !`${item.name} ${item.group}`.toLowerCase().includes(needle)) continue;
      const last = out[out.length - 1];
      if (last && last.group === item.group) last.items.push(item);
      else out.push({ group: item.group, items: [item] });
    }
    return out;
  }, [tab, q]);

  function add(item: { name: string; kind: OrderKind; group: string; pricePence: number | null }) {
    setLines((cur) => {
      const i = cur.findIndex((l) => lineKey(l) === lineKey(item));
      if (i >= 0) return cur.map((l, j) => (j === i ? { ...l, qty: Math.min(50, l.qty + 1) } : l));
      return [...cur, { ...item, qty: 1 }];
    });
  }

  function bump(i: number, by: number) {
    setLines((cur) =>
      cur.flatMap((l, j) => {
        if (j !== i) return [l];
        const qty = l.qty + by;
        return qty <= 0 ? [] : [{ ...l, qty: Math.min(50, qty) }];
      })
    );
  }

  function addCustom() {
    const name = customName.trim();
    if (!name) return;
    const n = parseFloat(customPrice.replace(/[£,\s]/g, ""));
    add({
      name,
      kind: tab,
      group: "Not on the menu",
      pricePence: Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null,
    });
    setCustomName(""); setCustomPrice("");
  }

  async function save() {
    setSaving(true); setError("");
    try {
      if (await onSave(lines)) onClose();
      else setError("Could not save the order. Try again.");
    } finally { setSaving(false); }
  }

  const total = orderTotal(lines);
  const food = lines.filter((l) => l.kind === "food");
  const drinks = lines.filter((l) => l.kind === "drink");
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-6xl h-[92vh] bg-[#141414] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.06]">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300/60">Order</p>
            <h2 className="text-lg font-bold text-white truncate">
              {label}{tableNo && <span className="text-gray-400 font-semibold"> · Table {tableNo}</span>}
            </h2>
          </div>
          <button onClick={onClose} title="Close without saving"
            className="w-9 h-9 shrink-0 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition">✕</button>
        </div>

        <div className="flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── menu ── */}
          <div className="min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.06]">
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-xl">
                {(["food", "drink"] as const).map((k) => (
                  <button key={k} onClick={() => { setTab(k); setQ(""); }}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                      tab === k ? (k === "food" ? "bg-gold-300 text-black" : "bg-sky-400 text-black") : "text-gray-400 hover:text-white"
                    }`}>
                    {k === "food" ? "Food" : "Drinks"}
                  </button>
                ))}
              </div>
              <input
                ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={tab === "food" ? "Search food…" : "Search drinks…"}
                className="w-full px-3.5 py-2.5 bg-black/30 border border-white/[0.07] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gold-300/50"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
              {groups.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-500">Nothing matches. Add it below the order instead.</p>
              )}
              {groups.map((g) => (
                <div key={g.group} className="mb-4">
                  <p className="sticky top-0 z-10 bg-[#141414] py-1.5 text-[10px] uppercase tracking-[0.15em] text-gray-500">{g.group}</p>
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {g.items.map((item) => {
                      const n = qtyByKey.get(lineKey(item)) || 0;
                      return (
                        <button key={lineKey(item)} onClick={() => add(item)}
                          className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition active:scale-[0.98] ${
                            n ? "border-gold-300/40 bg-gold-300/[0.06]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                          }`}>
                          <span className="min-w-0 text-sm text-white truncate">{item.name}</span>
                          <span className="shrink-0 flex items-center gap-2">
                            <span className="text-xs text-gray-400 tabular-nums">{item.pricePence != null ? money(item.pricePence) : "—"}</span>
                            {n > 0 && (
                              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-gold-300 text-black text-[11px] font-bold flex items-center justify-center tabular-nums">{n}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── the order ── */}
          <div className="min-h-0 flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">This order</p>
              <p className="text-xs text-gray-500">{count} {count === 1 ? "item" : "items"}</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
              {lines.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">Tap something on the menu to add it.</p>
              ) : (
                [["Food", food], ["Drinks", drinks]].map(([title, list]) =>
                  (list as OrderLine[]).length === 0 ? null : (
                    <div key={title as string} className="mb-3">
                      <p className="px-2 py-1.5 text-[10px] uppercase tracking-[0.15em] text-gray-500">{title as string}</p>
                      {(list as OrderLine[]).map((l) => {
                        const i = lines.indexOf(l);
                        return (
                          <div key={lineKey(l)} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/[0.03]">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white truncate">{l.name}</p>
                              <p className="text-[11px] text-gray-500 truncate">{l.group}</p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              <button onClick={() => bump(i, -1)}
                                className="w-7 h-7 rounded-lg border border-white/10 text-white leading-none hover:bg-white/5 active:scale-95 transition">−</button>
                              <span className="w-5 text-center text-sm font-bold text-white tabular-nums">{l.qty}</span>
                              <button onClick={() => bump(i, 1)}
                                className="w-7 h-7 rounded-lg border border-white/10 text-white leading-none hover:bg-white/5 active:scale-95 transition">+</button>
                            </div>
                            <span className="w-[62px] shrink-0 text-right text-sm text-gray-300 tabular-nums">
                              {l.pricePence != null ? money(l.pricePence * l.qty) : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
                )
              )}
            </div>

            {/* anything not on the menu */}
            <div className="px-4 py-3 border-t border-white/[0.06]">
              <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-2">
                Not on the menu? Add it as {tab === "food" ? "food" : "a drink"}
              </p>
              <div className="flex gap-2">
                <input value={customName} onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
                  placeholder="Item"
                  className="flex-1 min-w-0 px-3 py-2 bg-black/30 border border-white/[0.07] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gold-300/50" />
                <input value={customPrice} onChange={(e) => setCustomPrice(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
                  placeholder="£" inputMode="decimal"
                  className="w-[70px] px-2 py-2 bg-black/30 border border-white/[0.07] rounded-lg text-white text-sm text-right placeholder-gray-600 focus:outline-none focus:border-gold-300/50" />
                <button onClick={addCustom} disabled={!customName.trim()}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-white/10 text-white hover:bg-white/5 transition disabled:opacity-30">Add</button>
              </div>
            </div>

            {/* total + actions */}
            <div className="px-5 py-4 border-t border-white/[0.06] bg-black/20">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Order total</span>
                <span className="text-2xl font-bold text-white tabular-nums">{money(total.pence)}</span>
              </div>
              {total.unpriced > 0 && (
                <p className="mt-1 text-[11px] text-amber-400/90 text-right">
                  {total.unpriced} {total.unpriced === 1 ? "item has" : "items have"} no price and {total.unpriced === 1 ? "isn't" : "aren't"} counted
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => { onUseTotal(total.pence); setUsed(true); }} disabled={total.pence === 0}
                  className="py-3 text-sm font-semibold rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-30">
                  {used ? "✓ In the bill box" : "Use as bill"}
                </button>
                <button onClick={save} disabled={saving}
                  className="py-3 text-sm font-bold rounded-xl bg-gold-300 text-black hover:bg-gold-200 active:scale-[0.99] transition disabled:opacity-50">
                  {saving ? "Saving…" : "Save order"}
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-red-400 text-center">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
