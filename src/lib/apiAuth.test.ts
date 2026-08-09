import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { isAuthorized } from "./apiAuth";
import { mintUiSessionToken, UI_SESSION_COOKIE } from "./uiSession";

function req(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/interview", { method: "POST", headers });
}

describe("apiAuth", () => {
  beforeEach(() => {
    delete process.env.INTERVIEW_API_KEY;
    delete process.env.UI_SESSION_SECRET;
    delete process.env.INTERVIEW_REQUIRE_AUTH;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  it("allows all requests when no API key is configured", () => {
    expect(isAuthorized(req())).toBe(true);
  });

  it("accepts x-api-key or bearer token when configured", () => {
    process.env.INTERVIEW_API_KEY = "secret-key";
    expect(isAuthorized(req())).toBe(false);
    expect(isAuthorized(req({ "x-api-key": "secret-key" }))).toBe(true);
    expect(isAuthorized(req({ authorization: "Bearer secret-key" }))).toBe(true);
    expect(isAuthorized(req({ "x-api-key": "wrong" }))).toBe(false);
  });

  it("accepts a signed UI cookie when a secret is configured", () => {
    process.env.INTERVIEW_API_KEY = "secret-key";
    const token = mintUiSessionToken()!;
    expect(isAuthorized(req({ cookie: `${UI_SESSION_COOKIE}=${token}` }))).toBe(true);
  });

  it("fails closed when auth is required without secrets", () => {
    process.env.INTERVIEW_REQUIRE_AUTH = "true";
    expect(isAuthorized(req())).toBe(false);
  });
});
