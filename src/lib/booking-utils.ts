import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
const generate = customAlphabet(alphabet, 4);

/** Generate a confirmation code like "DEM-4K7X" */
export function generateConfirmationCode(): string {
  return `DEM-${generate()}`;
}

/** Generate a secure management token for guest magic links */
export function generateManagementToken(): string {
  const tokenGen = customAlphabet(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    32
  );
  return tokenGen();
}

/** Format pence to pounds string: 2000 → "£20.00" */
export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/** Get day of week from date string "2026-04-20" → 1 (Mon) */
export function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDay();
}

/** Format date for display: "2026-04-20" → "Sunday 20 April 2026" */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Check if a date string is in the past */
export function isDatePast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return d < today;
}

/** Get today's date as "YYYY-MM-DD" */
export function todayStr(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/** Generate an array of date strings from today to N days ahead */
export function getDateRange(days: number): string[] {
  const dates: string[] = [];
  const start = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}
