import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { resetKvCache } from "@/lib/kv";

describe("GET /api/health", () => {
  beforeEach(() => {
    delete process.env.INTERVIEW_REQUIRE_AUTH;
    delete process.env.INTERVIEW_API_KEY;
    delete process.env.UI_SESSION_SECRET;
    delete process.env.SESSION_STORE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    resetKvCache();
  });

  it("returns live ok", async () => {
    const res = await GET(new NextRequest("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.live).toBe(true);
    expect(body.checks.auth).toBe("ok");
  });

  it("fails readiness when production auth cannot be enforced", async () => {
    process.env.INTERVIEW_REQUIRE_AUTH = "true";
    const res = await GET(new NextRequest("http://localhost/api/health?ready=1"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ready).toBe(false);
    expect(body.checks.auth).toBe("fail");
  });
});
