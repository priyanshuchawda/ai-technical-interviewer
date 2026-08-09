import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { UI_SESSION_COOKIE } from "@/lib/uiSession";

describe("GET /api/csrf", () => {
  beforeEach(() => {
    delete process.env.INTERVIEW_REQUIRE_AUTH;
    delete process.env.INTERVIEW_API_KEY;
    delete process.env.UI_SESSION_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  it("returns ok without a cookie when no secret is configured", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, cookie: false });
  });

  it("sets a signed httpOnly cookie when a secret exists", async () => {
    process.env.UI_SESSION_SECRET = "test-ui-secret";
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, cookie: true });
    const cookie = res.cookies.get(UI_SESSION_COOKIE);
    expect(cookie?.value).toMatch(/^\d+\.[a-f0-9]+$/);
    expect(cookie?.httpOnly).toBe(true);
  });

  it("fails closed when auth is required without a secret", async () => {
    process.env.INTERVIEW_REQUIRE_AUTH = "true";
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("INTERVIEW_MISCONFIGURED");
  });
});
