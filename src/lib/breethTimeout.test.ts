import { describe, it, expect, beforeEach } from "vitest";
import { getSearchTimeoutMs } from "./breethClient";

describe("Breeth timeout", () => {
  beforeEach(() => {
    delete process.env.BREETH_TIMEOUT_MS;
  });

  it("defaults to 8 seconds so live search can complete", () => {
    expect(getSearchTimeoutMs()).toBe(8000);
  });

  it("honors BREETH_TIMEOUT_MS", () => {
    process.env.BREETH_TIMEOUT_MS = "12000";
    expect(getSearchTimeoutMs()).toBe(12000);
  });
});
