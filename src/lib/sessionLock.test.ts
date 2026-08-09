import { describe, it, expect, beforeEach } from "vitest";
import { clearSessionLocks, tryAcquireSessionLock } from "./sessionLock";

describe("sessionLock", () => {
  beforeEach(() => {
    clearSessionLocks();
  });

  it("prevents concurrent turns on the same session", () => {
    const first = tryAcquireSessionLock("s1");
    const second = tryAcquireSessionLock("s1");
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    first?.();
    expect(tryAcquireSessionLock("s1")).not.toBeNull();
  });
});
