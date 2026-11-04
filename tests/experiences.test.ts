/**
 * Checks for the bookable experiences (see docs/ADDING-AN-EXPERIENCE.md).
 * Run with: npm run test:experiences
 *
 * These catch the mistakes that are easy to make when an experience changes:
 * a price updated in one place but not another, times outside opening hours,
 * the wrong weekday, or old wording left on the page.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  BRUNCH_PRICE, ARRIVAL_SLOTS, SERVICE_END, BRUNCH_END_MIN, BOOKABLE_WEEKS,
  FEAST_MIN_PARTY, FEAST_MAX_PARTY, upcomingFeastDate, upcomingFeastDates,
  packagePrice, packageLabel,
} from "../src/lib/saturday-brunch";

const ROOT = path.join(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

// The feast runs on Sundays. Change this if SERVICE_WEEKDAY changes.
const FEAST_WEEKDAY = 0;

// ── Settings and the copies of them that must stay in step ──

test("door check-in price matches the settings price", () => {
  const m = read("src/app/brunch-checkin/page.tsx").match(/const FEAST_PRICE = (\d+)/);
  assert.ok(m, "FEAST_PRICE not found in the door check-in screen");
  assert.equal(Number(m[1]), BRUNCH_PRICE);
});

test("booking form fallback times match the settings times", () => {
  const src = read("src/app/sunday-feast/FeastBooking.tsx");
  const m = src.match(/const ARRIVAL_SLOTS = \[([^\]]*)\]/);
  assert.ok(m, "ARRIVAL_SLOTS not found in the booking form");
  const formSlots = Array.from(m[1].matchAll(/"(\d\d:\d\d)"/g), (x) => x[1]);
  assert.deepEqual(formSlots, ARRIVAL_SLOTS);
});

test("arrival times are in order, on the half hour, and before closing", () => {
  assert.ok(ARRIVAL_SLOTS.length > 0);
  const sorted = [...ARRIVAL_SLOTS].sort();
  assert.deepEqual(ARRIVAL_SLOTS, sorted, "arrival times are out of order");
  for (const t of ARRIVAL_SLOTS) {
    assert.match(t, /^([01]\d|2[0-3]):(00|30)$/, `${t} isn't on the hour or half hour`);
    assert.ok(t < SERVICE_END, `${t} is at or after closing (${SERVICE_END})`);
  }
  const [h, m] = SERVICE_END.split(":").map(Number);
  assert.equal(BRUNCH_END_MIN, h * 60 + m, "BRUNCH_END_MIN doesn't match SERVICE_END");
});

test("party size limits make sense", () => {
  assert.ok(FEAST_MIN_PARTY >= 1);
  assert.ok(FEAST_MAX_PARTY >= FEAST_MIN_PARTY);
});

// ── Dates ──

test("the next bookable date is always the right weekday", () => {
  // Every day for two months, at noon London time.
  for (let i = 0; i < 60; i++) {
    const day = new Date(Date.UTC(2026, 10, 1 + i, 12));
    const next = upcomingFeastDate(day);
    assert.equal(new Date(`${next}T12:00:00Z`).getUTCDay(), FEAST_WEEKDAY, `from ${day.toISOString()} got ${next}`);
    assert.ok(next >= day.toISOString().slice(0, 10), "next date is in the past");
  }
});

test("on the day, bookings roll to next week after closing", () => {
  // 8 Nov 2026 is a Sunday; London is on GMT in November, so UTC = local time.
  const before = new Date(`2026-11-08T${String(Math.floor((BRUNCH_END_MIN - 1) / 60)).padStart(2, "0")}:59:00Z`);
  const after = new Date(`2026-11-08T${SERVICE_END}:01Z`);
  assert.equal(upcomingFeastDate(before), "2026-11-08");
  assert.equal(upcomingFeastDate(after), "2026-11-15");
});

test("the right number of dates is offered, a week apart", () => {
  const dates = upcomingFeastDates();
  assert.equal(dates.length, BOOKABLE_WEEKS);
  for (let i = 1; i < dates.length; i++) {
    const gap = (Date.parse(dates[i]) - Date.parse(dates[i - 1])) / 86_400_000;
    assert.equal(gap, 7);
  }
});

// ── Packages ──

test("the feast costs the settings price; old brunch bookings still read right", () => {
  assert.equal(packagePrice("feast"), BRUNCH_PRICE);
  assert.equal(packageLabel("feast"), "Sunday Feast");
  assert.equal(packagePrice("food"), 35);
  assert.equal(packagePrice("drinks"), 50);
});

// ── Links and wording ──

test("the old brunch URL redirects to the feast page", () => {
  const cfg = read("next.config.mjs");
  assert.match(cfg, /source:\s*"\/saturday-brunch",\s*destination:\s*"\/sunday-feast"/);
});

test("the site links to the feast page", () => {
  for (const file of [
    "src/components/FloatingMenu.tsx",
    "src/components/BookingWidget.tsx",
    "src/app/events/page.tsx",
    "src/app/sitemap.ts",
  ]) {
    assert.match(read(file), /\/sunday-feast/, `${file} doesn't link to /sunday-feast`);
  }
});

test("no Saturday or brunch wording is left where guests see it", () => {
  // Strip comments and identifiers that legitimately say "brunch" (API path, table names).
  const visible = (src: string) =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .replace(/\/api\/saturday-brunch|@\/lib\/saturday-brunch|brunch-[\w-]+|Brunch(?=[A-Z])|brunch(?=[A-Z])|BRUNCH_\w+/g, "");
  for (const file of ["src/app/sunday-feast/page.tsx", "src/app/sunday-feast/FeastBooking.tsx"]) {
    assert.doesNotMatch(visible(read(file)), /saturday|brunch/i, `${file} still mentions Saturday or brunch`);
  }
  // The emails the booking API sends.
  const api = visible(read("src/app/api/saturday-brunch/route.ts"));
  const emailText = (api.match(/function (adminEmailHtml|guestEmailHtml)[\s\S]*?\n}\n/g) || []).join("\n");
  assert.ok(emailText.length > 0, "couldn't find the email templates");
  assert.doesNotMatch(emailText, /saturday|brunch/i, "the booking emails still mention Saturday or brunch");
});
