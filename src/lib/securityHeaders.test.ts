import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";

describe("security headers", () => {
  it("includes CSP and HSTS", async () => {
    const headersFn = nextConfig.headers;
    expect(headersFn).toBeTypeOf("function");
    const blocks = await headersFn!();
    const headers = Object.fromEntries(blocks[0].headers.map((h) => [h.key, h.value]));
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });
});
