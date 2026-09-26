import { serviceDate } from "@/lib/checkin-auth";

export { serviceDate };

/** The two sites guests check in at. Slugs match the Location table. */
export const DOOR_LOCATIONS = [
  { slug: "cricklewood", name: "Cricklewood" },
  { slug: "streatham", name: "Streatham Hill" },
] as const;

export type DoorLocationSlug = (typeof DOOR_LOCATIONS)[number]["slug"];

export function isDoorLocation(v: unknown): v is DoorLocationSlug {
  return DOOR_LOCATIONS.some((l) => l.slug === v);
}

export function locationName(slug: string): string {
  return DOOR_LOCATIONS.find((l) => l.slug === slug)?.name ?? slug;
}

export const VISIT_TYPES = ["dining", "takeaway"] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export function isVisitType(v: unknown): v is VisitType {
  return v === "dining" || v === "takeaway";
}

/** Name to show when the guest gave none. */
export function displayName(v: { name: string; seq: number }): string {
  return v.name.trim() || `Customer ${v.seq}`;
}

/** Pence to "£45.50". */
export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/** "45.50" or "45" from a staff-typed field → pence. Returns null if unparseable. */
export function parseAmountToPence(input: string): number | null {
  const cleaned = String(input).replace(/[£,\s]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/**
 * Order the day's list by table number: numbered tables first, low to high,
 * then anything lettered, then rows with no table at all in arrival order.
 * "10" must sort after "2", so the leading digits are compared as a number.
 */
export function byTableNumber(
  a: { tableNo: string; seq: number },
  b: { tableNo: string; seq: number },
): number {
  const ta = a.tableNo.trim();
  const tb = b.tableNo.trim();
  if (!ta && !tb) return a.seq - b.seq;
  if (!ta) return 1;
  if (!tb) return -1;

  const na = parseInt(ta, 10);
  const nb = parseInt(tb, 10);
  const aNum = Number.isFinite(na);
  const bNum = Number.isFinite(nb);
  if (aNum && bNum && na !== nb) return na - nb;
  if (aNum !== bNum) return aNum ? -1 : 1;

  const cmp = ta.localeCompare(tb, "en", { numeric: true, sensitivity: "base" });
  return cmp !== 0 ? cmp : a.seq - b.seq;
}
