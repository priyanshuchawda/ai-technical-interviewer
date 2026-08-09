import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { isAuthorized } from "./apiAuth";

function req(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/interview", { method: "POST", headers });
}

describe("apiAuth", () => {
  beforeEach(() => {
    delete process.env.INTERVIEW_API_KEY;
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
});
