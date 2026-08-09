import { NextRequest } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
  now = Date.now()
): { ok: boolean; retryAfterMs: number } {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (current.count >= limit) {
    return { ok: false, retryAfterMs: Math.max(0, current.resetAt - now) };
  }
  current.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}
