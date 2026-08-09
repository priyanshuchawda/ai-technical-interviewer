import { describe, it, expect } from "vitest";
import { backoffDelay, withRetry } from "./retry";

describe("retry", () => {
  it("applies exponential backoff with jitter bounds", () => {
    const delay = backoffDelay(2, 100, 10_000, () => 0.5);
    expect(delay).toBe(400);
  });

  it("retries a failing function then succeeds", async () => {
    let attempts = 0;
    const value = await withRetry(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("transient");
      return "ok";
    }, { retries: 3, baseMs: 0, maxMs: 0 });
    expect(value).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("stops when shouldRetry returns false", async () => {
    let attempts = 0;
    await expect(withRetry(async () => {
      attempts += 1;
      throw new Error("fatal");
    }, {
      retries: 3,
      baseMs: 0,
      shouldRetry: () => false,
    })).rejects.toThrow("fatal");
    expect(attempts).toBe(1);
  });
});
