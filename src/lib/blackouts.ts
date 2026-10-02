/**
 * Blackouts for table bookings. A blackout with no times blocks the whole day;
 * one with fromTime/toTime ("HH:mm", London) blocks only the arrival slots that
 * start inside that window: from inclusive, to exclusive, so 19:00 to 21:00
 * blocks 19:00, 19:30, 20:00 and 20:30 and leaves 21:00 open.
 */

export type BlackoutWindow = { fromTime: string | null; toTime: string | null };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isWholeDay(b: BlackoutWindow): boolean {
  return !b.fromTime || !b.toTime;
}

/** Does this blackout stop a slot that starts at `startTime`? */
export function blocksSlot(b: BlackoutWindow, startTime: string): boolean {
  if (isWholeDay(b)) return true;
  return startTime >= b.fromTime! && startTime < b.toTime!;
}

/**
 * Validate an admin-entered window. Both empty means whole day.
 * Returns the cleaned times, or an error message.
 */
export function parseWindow(from: unknown, to: unknown):
  { ok: true; fromTime: string | null; toTime: string | null } | { ok: false; error: string } {
  const f = typeof from === "string" ? from.trim() : "";
  const t = typeof to === "string" ? to.trim() : "";
  if (!f && !t) return { ok: true, fromTime: null, toTime: null };
  if (!f || !t) return { ok: false, error: "Set both From and To, or leave both empty to block the whole day" };
  if (!HHMM.test(f) || !HHMM.test(t)) return { ok: false, error: "Times must look like 19:00" };
  if (f >= t) return { ok: false, error: "To must be later than From" };
  return { ok: true, fromTime: f, toTime: t };
}

/** "19:00 to 21:00", or "" for a whole-day blackout. */
export function windowLabel(b: BlackoutWindow): string {
  return isWholeDay(b) ? "" : `${b.fromTime} to ${b.toTime}`;
}
