/**
 * In-memory sliding-window rate limiter.
 *
 * Works well for Vercel serverless — each cold-start gets a fresh map,
 * but within a warm instance it blocks rapid sequential abuse (brute-force,
 * booking floods, etc.).
 *
 * To upgrade to Upstash Redis (persistent across all instances):
 *   npm i @upstash/ratelimit @upstash/redis
 *   and swap this module for the Upstash adapter.
 */

type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

// Clean up every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const key of Array.from(store.keys())) {
    const entry = store.get(key)!;
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export type RateLimitConfig = {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetMs: number;
};

/**
 * Check if a request from the given key is allowed.
 *
 * @param key   Unique identifier (e.g. IP address, email)
 * @param config  Rate limit configuration
 * @returns       Whether the request is allowed + remaining count
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const { maxRequests, windowMs } = config;
  const now = Date.now();

  cleanup(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const resetMs = oldest + windowMs - now;
    return { success: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);
  return {
    success: true,
    remaining: maxRequests - entry.timestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Extract client IP from request headers (works on Vercel).
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
