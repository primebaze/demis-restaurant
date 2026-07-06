"use client";

import { useEffect } from "react";

/**
 * Fires once when a post page mounts to register a view.
 * The API dedupes per browser via a cookie, so refreshes don't re-count.
 */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/blog/posts/${slug}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);
  return null;
}
