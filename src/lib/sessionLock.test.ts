import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { clearSessionLocks, tryAcquireSessionLock } from "./sessionLock";
import { resetKvCache } from "./kv";

describe("sessionLock", () => {
  beforeEach(() => {
    clearSessionLocks();
    delete process.env.SESSION_STORE;
    resetKvCache();
  });

  it("prevents concurrent turns on the same session", async () => {
    const first = await tryAcquireSessionLock("s1");
    const second = await tryAcquireSessionLock("s1");
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    await first?.();
    expect(await tryAcquireSessionLock("s1")).not.toBeNull();
  });
});

describe("shared sessionLock", () => {
  let dir = "";

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-lock-"));
    process.env.SESSION_STORE = "file";
    process.env.SESSION_STORE_PATH = dir;
    process.env.SESSION_LOCK_TTL_SEC = "60";
    resetKvCache();
  });

  afterEach(async () => {
    delete process.env.SESSION_STORE;
    delete process.env.SESSION_STORE_PATH;
    delete process.env.SESSION_LOCK_TTL_SEC;
    resetKvCache();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("uses the shared backend so a second acquire fails until release", async () => {
    const first = await tryAcquireSessionLock("durable-lock");
    expect(first).not.toBeNull();
    expect(await tryAcquireSessionLock("durable-lock")).toBeNull();
    await first?.();
    expect(await tryAcquireSessionLock("durable-lock")).not.toBeNull();
  });
});
