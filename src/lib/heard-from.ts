/**
 * "Where did you hear about us?" — an optional question on booking forms, for
 * marketing analytics. No server-only imports, so the form can use it too.
 * Add an option here and it appears on the form, is accepted by the API, and is
 * counted in admin.
 */
export const HEARD_FROM_OPTIONS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "friend", label: "From a friend" },
] as const;

export type HeardFrom = (typeof HEARD_FROM_OPTIONS)[number]["key"];

/** A known key, or "" when the guest skipped the question (or sent anything else). */
export function parseHeardFrom(v: unknown): HeardFrom | "" {
  return HEARD_FROM_OPTIONS.some((o) => o.key === v) ? (v as HeardFrom) : "";
}

export function heardFromLabel(v: string): string {
  return HEARD_FROM_OPTIONS.find((o) => o.key === v)?.label ?? "";
}
