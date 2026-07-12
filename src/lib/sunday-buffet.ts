import { serviceDate, priceTierFor, groupPrice } from "@/lib/checkin-auth";

export { priceTierFor, groupPrice };

// Buffet service details
export const BUFFET_LOCATION = "Streatham Hill";
export const BUFFET_ADDRESS = "67 Streatham Hill, London SW2 4TX";
export const BUFFET_START = "12:30pm";
export const BUFFET_END = "4:00pm";

// Tier structure (matches the door check-in)
export const TIERS = [
  { price: 20, upto: 20 },   // covers 1-20
  { price: 25, upto: 45 },   // covers 21-45
  { price: 30, upto: Infinity }, // 46+
];

/**
 * The Sunday people can reserve for (UK time), YYYY-MM-DD. On any weekday it's the
 * coming Sunday; on Sunday itself it rolls to the NEXT Sunday (that day is walk-in).
 */
export function upcomingSunday(from: Date = new Date()): string {
  const [y, m, d] = serviceDate(from).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  let add = (7 - dt.getUTCDay()) % 7; // 0 = today is Sunday
  if (add === 0) add = 7; // on Sunday, take reservations for next Sunday
  dt.setUTCDate(dt.getUTCDate() + add);
  return dt.toISOString().slice(0, 10);
}

/** Pretty UK date, e.g. "Sunday 12 July". */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** How many covers remain at each tier given how many are already booked. */
export function tiersLeft(bookedCovers: number) {
  return [
    { price: 20, left: Math.max(0, 20 - bookedCovers) },
    { price: 25, left: Math.max(0, 45 - Math.max(bookedCovers, 20)) },
  ];
}
