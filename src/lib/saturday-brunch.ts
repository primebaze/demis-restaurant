import { serviceDate } from "@/lib/checkin-auth";

/*
 * Sunday Feast at Cricklewood.
 *
 * Runs on the booking system first built for the Saturday bottomless brunch
 * (same reservations table, admin page, door check-in and on/off switch), so
 * file and table names still say "brunch". Everything guests see says Sunday Feast.
 */

export const FEAST_NAME = "Sunday Feast";
export const BRUNCH_LOCATION = "Cricklewood";
export const BRUNCH_ADDRESS = "89 Cricklewood Broadway, London NW2 3JG";
/** £ per person: all five dishes to share at the table, plus one winter warmer drink. */
export const BRUNCH_PRICE = 30;
export const BRUNCH_WINDOW_MIN = 90; // dining window timed at the door
/** The feast is a sharing menu for two or more. */
export const FEAST_MIN_PARTY = 2;
export const FEAST_MAX_PARTY = 15;

/** Day of the week the feast runs, 0 = Sunday. */
const SERVICE_WEEKDAY = 0;

// Arrival times guests can pick. Change these to change the feast's hours.
export const ARRIVAL_SLOTS = [
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00",
];
export const BRUNCH_START = "12pm";
export const BRUNCH_END = "late";
/** After this time on a Sunday (London), the booking form rolls on to next week. */
export const BRUNCH_END_MIN = 20 * 60;
/** How long a booking blocks out in the guest's calendar. */
export const SITTING_MIN = 120;

export function isArrivalSlot(t: string): boolean {
  return ARRIVAL_SLOTS.includes(t);
}

/**
 * One package now: the feast. "food" (£35) and "drinks" (£50) are the old
 * brunch packages, kept so past brunch bookings still read correctly in admin.
 */
export const BRUNCH_PACKAGES = {
  feast: { key: "feast", label: FEAST_NAME, price: BRUNCH_PRICE },
} as const;
const LEGACY_PACKAGES: Record<string, { label: string; price: number }> = {
  food: { label: "Brunch, food only", price: 35 },
  drinks: { label: "Brunch with bottomless drinks", price: 50 },
};

export type BrunchPackage = keyof typeof BRUNCH_PACKAGES;

export function isBrunchPackage(v: unknown): v is BrunchPackage {
  return v === "feast";
}

/** £ per head for a package key, including old brunch bookings. */
export function packagePrice(v: unknown): number {
  if (isBrunchPackage(v)) return BRUNCH_PACKAGES[v].price;
  return LEGACY_PACKAGES[String(v)]?.price ?? BRUNCH_PRICE;
}

export function packageLabel(v: unknown): string {
  if (isBrunchPackage(v)) return BRUNCH_PACKAGES[v].label;
  return LEGACY_PACKAGES[String(v)]?.label ?? FEAST_NAME;
}

/** Minutes past midnight in London, for comparing against the service window. */
function londonMinutes(d: Date): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(d)
    .split(":")
    .map(Number);
  return (h % 24) * 60 + m;
}

/**
 * The next feast day (UK time), YYYY-MM-DD. Today if it's Sunday and the last
 * arrival hasn't passed; after that it rolls on to next Sunday.
 */
export function upcomingFeastDate(from: Date = new Date()): string {
  const [y, m, d] = serviceDate(from).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  let add = (SERVICE_WEEKDAY - dt.getUTCDay() + 7) % 7;
  if (add === 0 && londonMinutes(from) >= BRUNCH_END_MIN) add = 7;
  dt.setUTCDate(dt.getUTCDate() + add);
  return dt.toISOString().slice(0, 10);
}

/** How many Sundays ahead guests can book. */
export const BOOKABLE_WEEKS = 4;

/** The next N bookable Sundays, starting with the upcoming one. */
export function upcomingFeastDates(count: number = BOOKABLE_WEEKS, from: Date = new Date()): string[] {
  const first = upcomingFeastDate(from);
  const [y, m, d] = first.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + i * 7);
    return dt.toISOString().slice(0, 10);
  });
}

/** "HH:mm" plus minutes, e.g. addMinutes("19:30", 120) = "21:30". */
export function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Pretty UK date, e.g. "Sunday 9 November". */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
