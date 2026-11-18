"use client";

import type { CSSProperties } from "react";

/**
 * Shared bits for Demi's Meetings screens. Values come from the design canvas
 * (claude.ai/artifact/NtYJeV3fySso3CRCF7iCMq).
 */

// Every Material Symbol the app uses (Google needs them sorted). Add new ones here.
const ICONS = [
  "record_voice_over", "assignment_late", "visibility",
  "add", "add_photo_alternate", "add_task", "admin_panel_settings", "arrow_back", "arrow_forward", "assignment_ind",
  "auto_awesome", "auto_stories", "backspace", "badge", "beach_access", "build", "calendar_month", "calendar_today",
  "call", "call_end", "campaign", "cancel", "chat", "check", "check_circle", "chevron_left", "chevron_right", "cleaning_services",
  "close", "closed_caption", "content_copy", "delete", "description", "download", "edit_note", "event", "event_busy",
  "expand_more", "face", "flag", "folder_open", "format_quote", "front_hand", "graphic_eq", "group", "groups", "health_and_safety",
  "history", "home", "hourglass_top", "how_to_reg", "image", "info", "inventory_2", "ios_share", "keyboard_arrow_down",
  "link", "lock", "lock_open", "logout", "mail", "mic", "mic_off", "more_horiz", "notifications", "notifications_active",
  "notifications_off", "open_in_full", "open_in_new", "pause", "person", "person_add", "photo_camera", "play_arrow",
  "policy", "priority_high", "push_pin", "radio_button_checked", "radio_button_unchecked", "repeat", "report", "restaurant_menu",
  "savings", "schedule", "screen_lock_portrait", "search", "send", "sentiment_dissatisfied", "settings", "shield_person",
  "smartphone", "south", "speaker_phone", "stop_circle", "storefront", "swap_horiz", "sync", "task_alt", "timer", "toggle_off",
  "touch_app", "verified_user", "videocam", "videocam_off", "view_timeline", "visibility_lock", "visibility_off", "warning",
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

/** Phone photos are huge: shrink to 1600px JPEG before uploading. Other files go as they are. */
async function shrinkPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("shrink"))), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

/**
 * Upload a file straight to private storage (photos are shrunk first) and return
 * the saved path, to send with the task, report or post.
 */
export async function uploadFile(folder: "tasks" | "reports" | "news" | "docs", file: File): Promise<{ path: string; size: number; mime: string }> {
  const photo = file.type.startsWith("image/") && folder !== "docs";
  const body = photo ? await shrinkPhoto(file) : file;
  const mime = photo ? "image/jpeg" : file.type || "application/octet-stream";
  const ext = photo ? "jpg" : (file.name.split(".").pop() || "").toLowerCase();
  const res = await fetch("/api/meet/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder, ext }) });
  const up = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(up.error || "Couldn't add the file");
  const put = await fetch(up.url, { method: "PUT", headers: { "Content-Type": mime, "x-upsert": "false", "cache-control": "max-age=3600" }, body });
  if (!put.ok) throw new Error("The upload didn't finish. Try again.");
  return { path: up.path as string, size: body.size, mime };
}
