import { ALL_CATEGORIES } from "@/data/menuData";
import { SECTIONS } from "@/data/drinksData";

/**
 * What door staff can pick from when taking an order: the food menu and the
 * drinks list, the same data the public menu and drinks pages show.
 *
 * A drink's price is taken from wherever the drinks page states it: on the
 * item, in its sub-heading ("Bottles — £12") or in the section note
 * ("£15 each"). Where none is stated the price is left null rather than guessed.
 */

export type OrderKind = "food" | "drink";

export type CatalogItem = {
  name: string;
  kind: OrderKind;
  group: string;
  pricePence: number | null;
};

/** One line on a guest's order. Saved as JSON on the visit. */
export type OrderLine = {
  name: string;
  kind: OrderKind;
  group: string;
  qty: number;
  pricePence: number | null;
};

function pounds(text: string | undefined): number | null {
  const m = String(text || "").match(/£\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Math.round(parseFloat(m[1]) * 100) : null;
}

const food: CatalogItem[] = ALL_CATEGORIES.flatMap((c) =>
  c.items.map((i) => ({
    name: i.name,
    kind: "food" as const,
    group: c.title,
    pricePence: typeof i.price === "number" ? Math.round(i.price * 100) : null,
  }))
);

const drinks: CatalogItem[] = SECTIONS.flatMap((sec) => {
  const sectionPrice = pounds(sec.note);
  const direct = (sec.items || []).map((i) => ({
    name: i.name,
    kind: "drink" as const,
    group: sec.label,
    pricePence: pounds(i.price) ?? sectionPrice,
  }));
  const nested = (sec.subsections || []).flatMap((sub) => {
    const subPrice = pounds(sub.title) ?? pounds(sub.note) ?? sectionPrice;
    const group = sub.title.replace(/\s*[—-]\s*£.*$/, "").trim();
    return sub.items.map((i) => ({
      name: i.name,
      kind: "drink" as const,
      group: `${sec.label} · ${group}`,
      pricePence: pounds(i.price) ?? subPrice,
    }));
  });
  return [...direct, ...nested];
});

export const DOOR_CATALOG: CatalogItem[] = [...food, ...drinks];

const MAX_LINES = 80;

/** Clean a client-sent order. Anything malformed is dropped rather than trusted. */
export function sanitiseOrder(input: unknown): OrderLine[] {
  if (!Array.isArray(input)) return [];
  const out: OrderLine[] = [];
  for (const raw of input.slice(0, MAX_LINES)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = String(r.name || "").trim().slice(0, 80);
    if (!name) continue;
    const kind: OrderKind = r.kind === "drink" ? "drink" : "food";
    const qty = Math.max(1, Math.min(50, Math.floor(Number(r.qty) || 1)));
    const p = Number(r.pricePence);
    const pricePence = r.pricePence === null || r.pricePence === undefined || !Number.isFinite(p) || p < 0
      ? null
      : Math.min(1_000_000, Math.round(p));
    out.push({ name, kind, group: String(r.group || "").slice(0, 60), qty, pricePence });
  }
  return out;
}

/** Total of the lines that have a price, and how many lines don't. */
export function orderTotal(lines: OrderLine[]): { pence: number; unpriced: number } {
  let pence = 0, unpriced = 0;
  for (const l of lines) {
    if (l.pricePence == null) unpriced++;
    else pence += l.pricePence * l.qty;
  }
  return { pence, unpriced };
}
