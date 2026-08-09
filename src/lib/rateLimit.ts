import { NextRequest } from "next/server";
import { getRateLimitWindowMs, sharedKvEnabled } from "./config";
import { getKv } from "./kv";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number
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

async function sharedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): Promise<{ ok: boolean; retryAfterMs: number }> {
  const windowId = Math.floor(now / windowMs);
  const bucketKey = `interview:ratelimit:${key}:${windowId}`;
  const count = await getKv().incr(bucketKey, Math.ceil(windowMs / 1000));
  if (count > limit) {
    const retryAfterMs = (windowId + 1) * windowMs - now;
    return { ok: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }
  return { ok: true, retryAfterMs: 0 };
}

export async function rateLimit(
  key: string,
  limit = 60,
  windowMs = getRateLimitWindowMs(),
  now = Date.now()
): Promise<{ ok: boolean; retryAfterMs: number }> {
  if (sharedKvEnabled()) return sharedRateLimit(key, limit, windowMs, now);
  return memoryRateLimit(key, limit, windowMs, now);
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}
