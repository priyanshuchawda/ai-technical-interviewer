import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getHealthSnapshot } from "./health";
import { resetKvCache } from "./kv";

describe("health", () => {
  const previous = { ...process.env };

  beforeEach(() => {
    delete process.env.INTERVIEW_REQUIRE_AUTH;
    delete process.env.INTERVIEW_API_KEY;
    delete process.env.UI_SESSION_SECRET;
    delete process.env.GEMINI_API_KEY;
    delete process.env.BREETH_API_KEY;
    delete process.env.SESSION_STORE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    resetKvCache();
  });

  afterEach(() => {
    process.env = { ...previous };
    resetKvCache();
  });

  it("is live and ready in local open mode", async () => {
    const snap = await getHealthSnapshot();
    expect(snap.live).toBe(true);
    expect(snap.ready).toBe(true);
    expect(snap.checks.auth).toBe("ok");
    expect(snap.checks.sessionStore).toBe("ok");
    expect(snap.checks.gemini).toBe("skip");
  });

  it("is not ready when production auth cannot be enforced", async () => {
    process.env.INTERVIEW_REQUIRE_AUTH = "true";
    const snap = await getHealthSnapshot();
    expect(snap.ready).toBe(false);
    expect(snap.status).toBe("degraded");
    expect(snap.checks.auth).toBe("fail");
  });
});
