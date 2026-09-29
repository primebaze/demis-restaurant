import { DOOR_FOOD } from "@/data/doorMenu";
import { SECTIONS } from "@/data/drinksData";

/**
 * What door staff can pick from when taking an order: the printed food menu
 * used in the restaurant (src/data/doorMenu.ts, not the website menu) and the
 * drinks list from the drinks page.
 *
 * A drink's price is taken from wherever the drinks page states it: on the
 * item, in its sub-heading ("Bottles — £12") or in the section note
 * ("£15 each"). Where none is stated the price is left null rather than guessed.
 */

export type OrderKind = "food" | "drink";

/** A "comes with" choice, e.g. Protein: Assorted meat / Asun (+£10) / Beef … */
export type ChoiceGroup = { title: string; options: { label: string; extraPence: number }[] };

export type CatalogItem = {
  name: string;
  kind: OrderKind;
  group: string;
  pricePence: number | null;
  choices: ChoiceGroup[];
  /** Short hint under the dish, e.g. "with plantain + protein" or "rice only". */
  note?: string;
  /** Extra search words. */
  keywords?: string;
};

/** What was picked for one choice group on an order line. */
export type PickedChoice = { group: string; label: string; extraPence: number };

/** One line on a guest's order. Saved as JSON on the visit. */
export type OrderLine = {
  name: string;
  kind: OrderKind;
  group: string;
  qty: number;
  /** Base price of the dish; choice extras are added on top. */
  pricePence: number | null;
  /** Which guest at the table, 1-based. */
  guest: number;
  choices: PickedChoice[];
};

function pounds(text: string | undefined): number | null {
  const m = String(text || "").match(/£\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Math.round(parseFloat(m[1]) * 100) : null;
}

const food: CatalogItem[] = DOOR_FOOD.flatMap((sec) =>
  sec.dishes.map((d) => ({
    name: d.name,
    kind: "food" as const,
    group: sec.title,
    pricePence: Math.round(d.price * 100),
    note: d.note,
    keywords: (d.keywords || []).join(" "),
    choices: (d.choices || []).map((c) => ({
      title: c.title,
      options: c.options.map((o) => ({ label: o.label, extraPence: Math.round((o.extra || 0) * 100) })),
    })),
  }))
);

const drinks: CatalogItem[] = SECTIONS.flatMap((sec) => {
  const sectionPrice = pounds(sec.note);
  const direct = (sec.items || []).map((i) => ({
    name: i.name,
    kind: "drink" as const,
    group: sec.label,
    pricePence: pounds(i.price) ?? sectionPrice,
    choices: [] as ChoiceGroup[],
  }));
  const nested = (sec.subsections || []).flatMap((sub) => {
    const subPrice = pounds(sub.title) ?? pounds(sub.note) ?? sectionPrice;
    const group = sub.title.replace(/\s*[—-]\s*£.*$/, "").trim();
    return sub.items.map((i) => ({
      name: i.name,
      kind: "drink" as const,
      group: `${sec.label} · ${group}`,
      pricePence: pounds(i.price) ?? subPrice,
      choices: [] as ChoiceGroup[],
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
    const guest = Math.max(1, Math.min(30, Math.floor(Number(r.guest) || 1)));
    const choices: PickedChoice[] = (Array.isArray(r.choices) ? r.choices : [])
      .slice(0, 6)
      .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
      .map((c) => ({
        group: String(c.group || "").slice(0, 30),
        label: String(c.label || "").slice(0, 40),
        extraPence: Math.max(0, Math.min(100_000, Math.round(Number(c.extraPence) || 0))),
      }))
      .filter((c) => c.label);
    out.push({ name, kind, group: String(r.group || "").slice(0, 60), qty, pricePence, guest, choices });
  }
  return out;
}

/** Price of one of this line, including any choice extras. Null if the dish has no price. */
export function unitPence(l: Pick<OrderLine, "pricePence" | "choices">): number | null {
  if (l.pricePence == null) return null;
  return l.pricePence + (l.choices || []).reduce((s, c) => s + c.extraPence, 0);
}

/** Total of the lines that have a price, and how many lines don't. */
export function orderTotal(lines: OrderLine[]): { pence: number; unpriced: number } {
  let pence = 0, unpriced = 0;
  for (const l of lines) {
    const u = unitPence(l);
    if (u == null) unpriced++;
    else pence += u * l.qty;
  }
  return { pence, unpriced };
}

/** "Jollof Rice (Chicken)" or "Egusi (Pounded Yam, Goat Meat)". */
export function lineName(l: Pick<OrderLine, "name" | "choices">): string {
  const c = (l.choices || []).map((x) => x.label);
  return c.length ? `${l.name} (${c.join(", ")})` : l.name;
}
