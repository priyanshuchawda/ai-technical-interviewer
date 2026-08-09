import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, clearRateLimitBuckets } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    clearRateLimitBuckets();
  });

  it("allows requests under the limit", () => {
    expect(rateLimit("ip-1", 2, 1000, 0).ok).toBe(true);
    expect(rateLimit("ip-1", 2, 1000, 1).ok).toBe(true);
  });

  it("blocks requests over the limit until the window resets", () => {
    rateLimit("ip-2", 1, 1000, 0);
    const blocked = rateLimit("ip-2", 1, 1000, 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(rateLimit("ip-2", 1, 1000, 1001).ok).toBe(true);
  });
});
