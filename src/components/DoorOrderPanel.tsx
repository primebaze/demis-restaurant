"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  DOOR_CATALOG, orderTotal, unitPence,
  type CatalogItem, type OrderKind, type OrderLine, type PickedChoice,
} from "@/lib/door-menu";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;
const menuKey = (l: { name: string; group: string }) => `${l.group}::${l.name}`;
/** Same dish, same guest, same choices → one line with a quantity. */
const lineKey = (l: OrderLine) =>
  `${l.guest}|${l.group}|${l.name}|${l.choices.map((c) => `${c.group}=${c.label}`).join(",")}`;

/**
 * Take a table's food and drinks order at the door, guest by guest. Pick the
 * guest, tap dishes to add them; dishes that come with a choice (protein,
 * swallow, side) ask for it first. Nothing is saved until "Save order".
 */
export function DoorOrderPanel({
  label,
  tableNo,
  guests,
  initial,
  onSave,
  onUseTotal,
  onClose,
}: {
  label: string;
  tableNo: string;
  guests: number;
  initial: OrderLine[];
  onSave: (lines: OrderLine[]) => Promise<boolean>;
  onUseTotal: (pence: number) => void;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<OrderLine[]>(initial);
  const [guest, setGuest] = useState(1);
  const [tab, setTab] = useState<OrderKind>("food");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [used, setUsed] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  // The dish waiting for its "comes with" choices, and what's been picked so far.
  const [choosing, setChoosing] = useState<CatalogItem | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Enough guest slots for the party, plus any guest an earlier order already used.
  const guestCount = Math.max(1, guests, ...lines.map((l) => l.guest));

  // Each tab opens at the top of its list, not wherever the other tab was scrolled to.
  useEffect(() => { searchRef.current?.focus(); listRef.current?.scrollTo({ top: 0 }); }, [tab]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (choosing) setChoosing(null); else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, choosing]);

  // Badges on the menu show what the selected guest has, not the whole table.
  const qtyByMenu = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) if (l.guest === guest) m.set(menuKey(l), (m.get(menuKey(l)) || 0) + l.qty);
    return m;
  }, [lines, guest]);

  // Menu for the current tab, filtered by the search box, kept in menu order.
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out: { group: string; items: CatalogItem[] }[] = [];
    for (const item of DOOR_CATALOG) {
      if (item.kind !== tab) continue;
      if (needle && !`${item.name} ${item.group} ${item.keywords || ""}`.toLowerCase().includes(needle)) continue;
      const last = out[out.length - 1];
      if (last && last.group === item.group) last.items.push(item);
      else out.push({ group: item.group, items: [item] });
    }
    return out;
  }, [tab, q]);

  function push(line: OrderLine) {
    setLines((cur) => {
      const i = cur.findIndex((l) => lineKey(l) === lineKey(line));
      if (i >= 0) return cur.map((l, j) => (j === i ? { ...l, qty: Math.min(50, l.qty + 1) } : l));
      return [...cur, line];
    });
  }

  function tapItem(item: CatalogItem) {
    if (item.choices.length) { setChoosing(item); setPicks({}); return; }
    push({ name: item.name, kind: item.kind, group: item.group, pricePence: item.pricePence, qty: 1, guest, choices: [] });
  }

  function confirmChoices() {
    if (!choosing) return;
    const choices: PickedChoice[] = choosing.choices.map((g) => {
      const o = g.options.find((x) => x.label === picks[g.title])!;
      return { group: g.title, label: o.label, extraPence: o.extraPence };
    });
    push({ name: choosing.name, kind: choosing.kind, group: choosing.group, pricePence: choosing.pricePence, qty: 1, guest, choices });
    setChoosing(null);
  }

  function bump(key: string, by: number) {
    setLines((cur) =>
      cur.flatMap((l) => {
        if (lineKey(l) !== key) return [l];
        const qty = l.qty + by;
        return qty <= 0 ? [] : [{ ...l, qty: Math.min(50, qty) }];
      })
    );
  }

  function addCustom() {
    const name = customName.trim();
    if (!name) return;
    const n = parseFloat(customPrice.replace(/[£,\s]/g, ""));
    push({
      name, kind: tab, group: "Not on the menu", qty: 1, guest, choices: [],
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
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const byGuest = Array.from({ length: guestCount }, (_, i) => lines.filter((l) => l.guest === i + 1));
  const chooserReady = !!choosing && choosing.choices.every((g) => picks[g.title]);
  const chooserPrice = choosing?.pricePence != null
    ? choosing.pricePence + choosing.choices.reduce((s, g) => s + (g.options.find((o) => o.label === picks[g.title])?.extraPence || 0), 0)
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div
        className="relative w-full max-w-6xl h-[92vh] bg-[#141414] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300/60">Order</p>
              <h2 className="text-lg font-bold text-white truncate">
                {label}{tableNo && <span className="text-gray-400 font-semibold"> · Table {tableNo}</span>}
              </h2>
            </div>
            <button onClick={onClose} title="Close without saving"
              className="w-9 h-9 shrink-0 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition">✕</button>
          </div>

          {guestCount > 1 && (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-0.5">
              <span className="shrink-0 text-[10px] uppercase tracking-[0.15em] text-gray-500 mr-1">Adding for</span>
              {byGuest.map((list, i) => {
                const n = i + 1, on = n === guest;
                const items = list.reduce((s, l) => s + l.qty, 0);
                return (
                  <button key={n} onClick={() => setGuest(n)}
                    className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold border transition ${
                      on ? "bg-white text-black border-white" : "border-white/[0.1] text-gray-300 hover:text-white hover:bg-white/5"
                    }`}>
                    Guest {n}
                    {items > 0 && (
                      <span className={`ml-2 text-[11px] tabular-nums ${on ? "text-black/60" : "text-gray-500"}`}>{items}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_400px]">
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

            <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
              {groups.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-500">Nothing matches. Add it below the order instead.</p>
              )}
              {groups.map((g) => (
                <div key={g.group} className="mb-4">
                  <p className="sticky top-0 z-10 bg-[#141414] py-1.5 text-[10px] uppercase tracking-[0.15em] text-gray-500">{g.group}</p>
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {g.items.map((item) => {
                      const n = qtyByMenu.get(menuKey(item)) || 0;
                      return (
                        <button key={menuKey(item)} onClick={() => tapItem(item)}
                          className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition active:scale-[0.98] ${
                            n ? "border-gold-300/40 bg-gold-300/[0.06]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                          }`}>
                          <span className="min-w-0">
                            <span className="block text-sm text-white truncate">{item.name}</span>
                            {(item.note || item.choices.length > 0) && (
                              <span className="block text-[10px] text-gray-500 truncate">
                                {item.note ?? `+ ${item.choices.map((c) => c.title.toLowerCase()).join(" & ")}`}
                              </span>
                            )}
                          </span>
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

          {/* ── the order, guest by guest ── */}
          <div className="min-h-0 flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">This order</p>
              <p className="text-xs text-gray-500">{count} {count === 1 ? "item" : "items"}</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
              {lines.length === 0 && guestCount === 1 ? (
                <p className="py-10 text-center text-sm text-gray-500">Tap something on the menu to add it.</p>
              ) : (
                byGuest.map((list, i) => {
                  const n = i + 1, on = n === guest;
                  const sub = orderTotal(list).pence;
                  return (
                    <div key={n} className={`mb-2 rounded-xl ${guestCount > 1 && on ? "bg-white/[0.03] ring-1 ring-white/[0.08]" : ""}`}>
                      {guestCount > 1 && (
                        <button onClick={() => setGuest(n)} className="w-full flex items-baseline justify-between px-2.5 pt-2.5 pb-1">
                          <span className={`text-xs font-bold uppercase tracking-[0.12em] ${on ? "text-white" : "text-gray-400"}`}>Guest {n}</span>
                          <span className="text-xs text-gray-400 tabular-nums">{list.length ? money(sub) : ""}</span>
                        </button>
                      )}
                      {list.length === 0 ? (
                        <p className="px-2.5 pb-2.5 text-xs text-gray-600">{on ? "Tap the menu to add for this guest" : "Nothing yet"}</p>
                      ) : (
                        list.map((l) => {
                          const k = lineKey(l);
                          const u = unitPence(l);
                          return (
                            <div key={k} className="flex items-center gap-2 px-2.5 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-white truncate">
                                  {l.kind === "drink" && <span className="text-sky-400/80 mr-1">●</span>}{l.name}
                                </p>
                                <p className="text-[11px] text-gray-500 truncate">
                                  {l.choices.length
                                    ? l.choices.map((c) => c.label + (c.extraPence ? ` +${money(c.extraPence)}` : "")).join(" · ")
                                    : l.group}
                                </p>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                <button onClick={() => bump(k, -1)}
                                  className="w-7 h-7 rounded-lg border border-white/10 text-white leading-none hover:bg-white/5 active:scale-95 transition">−</button>
                                <span className="w-5 text-center text-sm font-bold text-white tabular-nums">{l.qty}</span>
                                <button onClick={() => bump(k, 1)}
                                  className="w-7 h-7 rounded-lg border border-white/10 text-white leading-none hover:bg-white/5 active:scale-95 transition">+</button>
                              </div>
                              <span className="w-[62px] shrink-0 text-right text-sm text-gray-300 tabular-nums">
                                {u != null ? money(u * l.qty) : "—"}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* anything not on the menu */}
            <div className="px-4 py-3 border-t border-white/[0.06]">
              <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-2">
                Not on the menu? Add {tab === "food" ? "food" : "a drink"}{guestCount > 1 ? ` for Guest ${guest}` : ""}
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
                <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Table total</span>
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

        {/* ── "comes with" chooser ── */}
        {choosing && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setChoosing(null)}>
            <div className="w-full max-w-lg max-h-full overflow-y-auto bg-[#1b1b1b] border border-white/[0.1] rounded-2xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300/60">
                {choosing.group}{guestCount > 1 ? ` · Guest ${guest}` : ""}
              </p>
              <div className="flex items-baseline justify-between gap-4 mt-0.5 mb-4">
                <h3 className="text-xl font-bold text-white">{choosing.name}</h3>
                {choosing.pricePence != null && <span className="text-sm text-gray-400 tabular-nums">{money(choosing.pricePence)}</span>}
              </div>

              {choosing.choices.map((g) => (
                <div key={g.title} className="mb-4">
                  <p className="text-xs font-semibold text-gray-300 mb-2">
                    {g.title} <span className="text-gray-500 font-normal">· pick one</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {g.options.map((o) => {
                      const on = picks[g.title] === o.label;
                      return (
                        <button key={o.label} onClick={() => setPicks((p) => ({ ...p, [g.title]: o.label }))}
                          className={`px-3 py-2.5 rounded-xl border text-sm text-left transition active:scale-[0.98] ${
                            on ? "bg-gold-300 text-black border-gold-300 font-semibold" : "border-white/[0.08] text-white hover:bg-white/5"
                          }`}>
                          {o.label}
                          {o.extraPence > 0 && (
                            <span className={`block text-[11px] ${on ? "text-black/60" : "text-gray-500"}`}>+{money(o.extraPence)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-[auto_1fr] gap-2 mt-5">
                <button onClick={() => setChoosing(null)}
                  className="px-5 py-3 text-sm rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition">Cancel</button>
                <button onClick={confirmChoices} disabled={!chooserReady}
                  className="py-3 text-sm font-bold rounded-xl bg-gold-300 text-black hover:bg-gold-200 transition disabled:opacity-30">
                  {chooserReady
                    ? `Add${guestCount > 1 ? ` to Guest ${guest}` : ""}${chooserPrice != null ? ` · ${money(chooserPrice)}` : ""}`
                    : "Choose " + choosing.choices.filter((g) => !picks[g.title]).map((g) => g.title.toLowerCase()).join(" and ")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
