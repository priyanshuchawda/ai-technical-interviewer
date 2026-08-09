import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { getGeminiTimeoutMs } from "./geminiClient";

describe("geminiClient", () => {
  beforeEach(() => {
    delete process.env.GEMINI_TIMEOUT_MS;
  });

  it("defaults timeout to 20s and allows override", () => {
    expect(getGeminiTimeoutMs()).toBe(20_000);
    process.env.GEMINI_TIMEOUT_MS = "15000";
    expect(getGeminiTimeoutMs()).toBe(15_000);
  });

  it("uses header-based API key instead of query string", () => {
    const source = readFileSync(path.join(__dirname, "geminiClient.ts"), "utf8");
    expect(source).toContain("x-goog-api-key");
    expect(source).not.toContain("?key=");
  });
});
