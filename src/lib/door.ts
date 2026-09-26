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
