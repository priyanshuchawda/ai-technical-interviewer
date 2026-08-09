import { describe, it, expect, beforeEach } from "vitest";
import {
  authIsRequired,
  getSessionStoreKind,
  isDeployMisconfigured,
  sharedKvEnabled,
} from "./config";

describe("config", () => {
  beforeEach(() => {
    delete process.env.INTERVIEW_REQUIRE_AUTH;
    delete process.env.INTERVIEW_API_KEY;
    delete process.env.UI_SESSION_SECRET;
    delete process.env.SESSION_STORE;
    delete process.env.RATE_LIMIT_STORE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  it("does not require auth outside production unless explicitly enabled", () => {
    expect(authIsRequired()).toBe(false);
    process.env.INTERVIEW_REQUIRE_AUTH = "true";
    expect(authIsRequired()).toBe(true);
  });

  it("fails closed when auth is required without a secret", () => {
    process.env.INTERVIEW_REQUIRE_AUTH = "true";
    expect(isDeployMisconfigured()).toBe(true);
    process.env.UI_SESSION_SECRET = "ui-secret";
    expect(isDeployMisconfigured()).toBe(false);
  });

  it("enables shared kv for file and upstash stores", () => {
    expect(getSessionStoreKind()).toBe("memory");
    expect(sharedKvEnabled()).toBe(false);
    process.env.SESSION_STORE = "file";
    expect(getSessionStoreKind()).toBe("file");
    expect(sharedKvEnabled()).toBe(true);
  });
});
