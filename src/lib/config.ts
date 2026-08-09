export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function authIsRequired(): boolean {
  const explicit = (process.env.INTERVIEW_REQUIRE_AUTH || "").trim().toLowerCase();
  if (explicit === "true" || explicit === "1") return true;
  if (explicit === "false" || explicit === "0") return false;
  return isProduction();
}

export function getInterviewApiKey(): string {
  return (process.env.INTERVIEW_API_KEY || "").trim();
}

export function getUiSessionSecret(): string {
  return (process.env.UI_SESSION_SECRET || getInterviewApiKey()).trim();
}

export function isDeployMisconfigured(): boolean {
  return authIsRequired() && !getUiSessionSecret() && !getInterviewApiKey();
}

export function getSessionStoreKind(): "memory" | "file" | "upstash" {
  const raw = (process.env.SESSION_STORE || "memory").trim().toLowerCase();
  if (raw === "file") return "file";
  if (raw === "upstash" || raw === "redis") return "upstash";
  return "memory";
}

export function getFileStorePath(): string {
  return (process.env.SESSION_STORE_PATH || "data/kv").trim() || "data/kv";
}

export function getUpstashConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function sharedKvEnabled(): boolean {
  const kind = getSessionStoreKind();
  if (kind !== "memory") return true;
  const rate = (process.env.RATE_LIMIT_STORE || "").trim().toLowerCase();
  return rate === "file" || rate === "upstash" || rate === "redis";
}

export function getSessionTtlMs(): number {
  const raw = Number(process.env.SESSION_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 30 * 60 * 1000;
}

export function getMaxSessions(): number {
  const raw = Number(process.env.MAX_SESSIONS);
  return Number.isFinite(raw) && raw > 0 ? raw : 500;
}

export function getMaxBodyBytes(): number {
  const raw = Number(process.env.MAX_BODY_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 64 * 1024;
}

export function getRateLimitMax(): number {
  const raw = Number(process.env.RATE_LIMIT_MAX);
  return Number.isFinite(raw) && raw > 0 ? raw : 60;
}

export function getRateLimitWindowMs(): number {
  const raw = Number(process.env.RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
}

export function getLockTtlSec(): number {
  const raw = Number(process.env.SESSION_LOCK_TTL_SEC);
  return Number.isFinite(raw) && raw > 0 ? raw : 45;
}
