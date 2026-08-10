import { serviceDate } from "@/lib/checkin-auth";

// Brunch service details
export const BRUNCH_LOCATION = "Streatham Hill";
export const BRUNCH_ADDRESS = "67 Streatham Hill, London SW2 4TX";
export const BRUNCH_PRICE = 35; // £ per person, food only
export const BRUNCH_PRICE_DRINKS = 50; // £ per person, food + 90 minutes of bottomless drinks
export const BRUNCH_WINDOW_MIN = 90; // dining window at the door

export const BRUNCH_START = "1:00pm";
export const BRUNCH_END = "4:30pm";
export const BRUNCH_END_MIN = 16 * 60 + 30; // 4:30pm as minutes past midnight, London

/** Arrival slots guests pick from — every 30 minutes across the 1pm–4:30pm service. */
export const ARRIVAL_SLOTS = [
  "13:00", "13:30",
  "14:00", "14:30",
  "15:00", "15:30",
  "16:00", "16:30",
];
export function isArrivalSlot(t: string): boolean {
  return ARRIVAL_SLOTS.includes(t);
}

/** The two packages. Guests pick one per head; the door check-in is what's charged. */
export const BRUNCH_PACKAGES = {
  food: { key: "food", label: "Food only", price: BRUNCH_PRICE },
  drinks: { key: "drinks", label: "Food & bottomless drinks", price: BRUNCH_PRICE_DRINKS },
} as const;

export type BrunchPackage = keyof typeof BRUNCH_PACKAGES;

export function isBrunchPackage(v: unknown): v is BrunchPackage {
  return v === "food" || v === "drinks";
}

/** £ per head for a package key. Anything unrecognised (incl. pre-package rows) is food-only. */
export function packagePrice(v: unknown): number {
  return isBrunchPackage(v) ? BRUNCH_PACKAGES[v].price : BRUNCH_PRICE;
}

export function packageLabel(v: unknown): string {
  return isBrunchPackage(v) ? BRUNCH_PACKAGES[v].label : BRUNCH_PACKAGES.food.label;
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
 * The upcoming Saturday (UK time), YYYY-MM-DD. Today if it's Saturday and
 * service hasn't finished; once today's brunch has ended (after 4:30pm), rolls on.
 */
export function upcomingSaturday(from: Date = new Date()): string {
  const [y, m, d] = serviceDate(from).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  let add = (6 - dt.getUTCDay() + 7) % 7; // 6 = Saturday
  if (add === 0 && londonMinutes(from) >= BRUNCH_END_MIN) add = 7;
  dt.setUTCDate(dt.getUTCDate() + add);
  return dt.toISOString().slice(0, 10);
}

/** How many Saturdays ahead guests can book. */
export const BOOKABLE_WEEKS = 4;

/** The next N bookable Saturdays, starting with the upcoming one. */
export function upcomingSaturdays(count: number = BOOKABLE_WEEKS, from: Date = new Date()): string[] {
  const first = upcomingSaturday(from);
  const [y, m, d] = first.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + i * 7);
    return dt.toISOString().slice(0, 10);
  });
}

/** Pretty UK date, e.g. "Saturday 8 August". */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
