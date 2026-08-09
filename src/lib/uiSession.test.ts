import { describe, it, expect } from "vitest";
import { mintUiSessionToken, verifyUiSessionToken } from "./uiSession";

describe("uiSession", () => {
  const secret = "ui-test-secret";

  it("mints and verifies a signed token", () => {
    const token = mintUiSessionToken(1_000_000, secret);
    expect(token).toBeTruthy();
    expect(verifyUiSessionToken(token!, 1_000_000, secret)).toBe(true);
  });

  it("rejects expired or tampered tokens", () => {
    const token = mintUiSessionToken(1_000_000, secret)!;
    expect(verifyUiSessionToken(token, 1_000_000 + 13 * 60 * 60 * 1000, secret)).toBe(false);
    expect(verifyUiSessionToken(token.replace(/\.[a-f0-9]+$/, ".deadbeef"), 1_000_000, secret)).toBe(false);
    expect(verifyUiSessionToken(token, 1_000_000, "other-secret")).toBe(false);
  });
});
