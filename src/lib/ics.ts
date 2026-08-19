/**
 * Minimal iCalendar (.ics) builder for booking confirmations.
 *
 * An attached .ics is the only mechanism every mail client understands:
 * iOS Mail and Apple Calendar show an event banner, Outlook renders a real
 * invite, and Gmail offers "Add to calendar" on the attachment.
 */

/** Escape per RFC 5545: backslash, semicolon, comma and newlines are special. */
function esc(s: string): string {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 caps lines at 75 octets; continuations start with a single space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(" " + rest);
  return parts.join("\r\n");
}

/** "2026-08-23" + "12:30" in Europe/London → the correct UTC instant (handles BST). */
export function londonToUtc(dateIso: string, time: string): Date {
  const guess = new Date(`${dateIso}T${time}:00Z`);
  const asLondon = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/London" }));
  const asUtc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (asLondon.getTime() - asUtc.getTime()));
}

/** UTC timestamp in iCalendar basic format: 20260823T113000Z */
export function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export type IcsEvent = {
  uid: string; // stable per booking, so a re-send updates rather than duplicates
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  organizerEmail?: string;
  organizerName?: string;
};

/** Build the .ics file body. */
export function buildIcs(e: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Demi's Restaurant//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(e.start)}`,
    `DTEND:${icsStamp(e.end)}`,
    `SUMMARY:${esc(e.summary)}`,
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.url ? `URL:${e.url}` : "",
    e.organizerEmail ? `ORGANIZER;CN=${esc(e.organizerName || "Demi's Restaurant")}:mailto:${e.organizerEmail}` : "",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    // Nudge an hour before, most clients honour this.
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** "Add to Google Calendar" link, for clients that hide attachments. */
export function googleCalendarUrl(e: IcsEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.summary,
    dates: `${icsStamp(e.start)}/${icsStamp(e.end)}`,
    details: e.description || "",
    location: e.location || "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
