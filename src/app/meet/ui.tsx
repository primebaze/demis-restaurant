"use client";

import type { CSSProperties } from "react";

/**
 * Shared bits for Demi's Meetings screens. Values come from the design canvas
 * (claude.ai/artifact/NtYJeV3fySso3CRCF7iCMq).
 */

// Every Material Symbol the app uses (Google needs them sorted). Add new ones here.
const ICONS = [
  "add_box", "arrow_back", "auto_stories", "backspace", "badge", "calendar_month", "campaign", "check", "check_circle",
  "chevron_right", "expand_more", "face", "flag", "groups", "home", "hourglass_top", "how_to_reg", "info", "ios_share",
  "lock", "logout", "mail", "more_horiz", "notifications", "notifications_active", "notifications_off", "person",
  "schedule", "search", "smartphone", "south", "storefront", "task_alt", "toggle_off", "touch_app", "videocam",
  "view_timeline", "add", "chevron_left", "close", "content_copy", "delete", "send", "swap_horiz", "beach_access", "sync", "radio_button_checked", "arrow_forward", "warning", "cancel", "savings",
].sort();

export function IconFont() {
  return (
    // eslint-disable-next-line @next/next/no-page-custom-font
    <link
      rel="stylesheet"
      href={`https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=${ICONS.join(",")}&display=block`}
    />
  );
}

/** Google's Material Symbols, the design's icon set. */
export function Icon({ name, size = 24, fill = false, style }: { name: string; size?: number; fill?: boolean; style?: CSSProperties }) {
  return (
    <span
      className="material-symbols-rounded"
      aria-hidden="true"
      style={{ fontSize: size, lineHeight: 1, fontVariationSettings: `"FILL" ${fill ? 1 : 0}, "wght" ${fill ? 400 : 350}, "GRAD" 0, "opsz" 24`, userSelect: "none", ...style }}
    >
      {name}
    </span>
  );
}

// Person colours, picked by staff id so each person keeps theirs everywhere.
// Dark screens (staff phone) and light screens (manager pages) use matching hues.
const DARK = [
  { bg: "#1e3a8a", fg: "#bfdbfe" },
  { bg: "#134e4a", fg: "#99f6e4" },
  { bg: "#4c1d95", fg: "#ddd6fe" },
  { bg: "#7c2d12", fg: "#fed7aa" },
  { bg: "#831843", fg: "#fbcfe8" },
];
const LIGHT = [
  { bg: "#e0f2fe", fg: "#0369a1" },
  { bg: "#ccfbf1", fg: "#0f766e" },
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#fef3c7", fg: "#92400e" },
  { bg: "#fce7f3", fg: "#be185d" },
];
export const personColour = (id: number) => DARK[Math.abs(id) % DARK.length];
export const personColourLight = (id: number) => LIGHT[Math.abs(id) % LIGHT.length];
export const initial = (name: string) => (name.trim()[0] || "?").toUpperCase();
export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export const BRANCH: Record<string, string> = { cricklewood: "Cricklewood", streatham: "Streatham", both: "Both branches" };

export function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
