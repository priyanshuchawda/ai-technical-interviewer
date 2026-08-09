import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { rateLimit, clearRateLimitBuckets } from "./rateLimit";
import { resetKvCache } from "./kv";

describe("rateLimit", () => {
  beforeEach(() => {
    clearRateLimitBuckets();
    delete process.env.SESSION_STORE;
    delete process.env.RATE_LIMIT_STORE;
    resetKvCache();
  });

  it("allows requests under the limit", async () => {
    expect((await rateLimit("ip-1", 2, 1000, 0)).ok).toBe(true);
    expect((await rateLimit("ip-1", 2, 1000, 1)).ok).toBe(true);
  });

  it("blocks requests over the limit until the window resets", async () => {
    await rateLimit("ip-2", 1, 1000, 0);
    const blocked = await rateLimit("ip-2", 1, 1000, 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect((await rateLimit("ip-2", 1, 1000, 1001)).ok).toBe(true);
  });
});

describe("shared rateLimit", () => {
  let dir = "";

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-rl-"));
    process.env.SESSION_STORE = "file";
    process.env.SESSION_STORE_PATH = dir;
    resetKvCache();
  });

  afterEach(async () => {
    delete process.env.SESSION_STORE;
    delete process.env.SESSION_STORE_PATH;
    resetKvCache();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("blocks after the shared counter hits the limit", async () => {
    expect((await rateLimit("shared-ip", 1, 1000, 5_000)).ok).toBe(true);
    const blocked = await rateLimit("shared-ip", 1, 1000, 5_010);
    expect(blocked.ok).toBe(false);
  });
});
