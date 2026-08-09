import { describe, it, expect } from "vitest";
import { timingSafeEqualString } from "./safeEqual";

describe("timingSafeEqualString", () => {
  it("accepts matching secrets and rejects mismatches", () => {
    expect(timingSafeEqualString("secret-key", "secret-key")).toBe(true);
    expect(timingSafeEqualString("secret-key", "wrong-key1")).toBe(false);
    expect(timingSafeEqualString("short", "much-longer")).toBe(false);
  });
});
