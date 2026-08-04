import { serviceDate } from "@/lib/checkin-auth";

// Brunch service details
export const BRUNCH_LOCATION = "Streatham Hill";
export const BRUNCH_ADDRESS = "67 Streatham Hill, London SW2 4TX";
export const BRUNCH_PRICE = 35; // £ per person, food only
export const BRUNCH_PRICE_DRINKS = 50; // £ per person, food + 90 minutes of bottomless drinks
export const BRUNCH_WINDOW_MIN = 90; // dining window at the door

export const BRUNCH_START = "11:00am";
export const BRUNCH_END = "4:00pm";

/** Arrival slots guests pick from — every 30 minutes across the 11am–4pm service. */
export const ARRIVAL_SLOTS = [
  "11:00", "11:30",
  "12:00", "12:30",
  "13:00", "13:30",
  "14:00", "14:30",
  "15:00", "15:30",
  "16:00",
];
export function isArrivalSlot(t: string): boolean {
  return ARRIVAL_SLOTS.includes(t);
}

/**
 * The upcoming Saturday (UK time), YYYY-MM-DD. Today if it's Saturday and
 * service hasn't finished; once today's brunch has ended (after 4pm), rolls on.
 */
export function upcomingSaturday(from: Date = new Date()): string {
  const [y, m, d] = serviceDate(from).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  let add = (6 - dt.getUTCDay() + 7) % 7; // 6 = Saturday
  if (add === 0) {
    const hour = parseInt(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }).format(from),
      10
    );
    if (hour >= 16) add = 7;
  }
  dt.setUTCDate(dt.getUTCDate() + add);
  return dt.toISOString().slice(0, 10);
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
