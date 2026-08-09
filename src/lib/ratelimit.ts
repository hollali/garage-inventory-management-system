import { headers } from "next/headers";

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

const buckets = new Map<string, number[]>();
const PRUNE_THRESHOLD = 1000;

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const fresh = (buckets.get(key) ?? []).filter((t) => now - t < opts.windowMs);
  buckets.set(key, fresh);

  if (fresh.length >= opts.limit) {
    const oldest = fresh[0];
    return {
      allowed: false,
      retryAfterMs: Math.max(0, oldest + opts.windowMs - now),
    };
  }

  fresh.push(now);
  buckets.set(key, fresh);

  if (buckets.size > PRUNE_THRESHOLD) {
    for (const [k, timestamps] of buckets) {
      const kept = timestamps.filter((t) => now - t < opts.windowMs);
      if (kept.length === 0) {
        buckets.delete(k);
      } else {
        buckets.set(k, kept);
      }
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

export async function clientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || "local";
  } catch {
    return "local";
  }
}
