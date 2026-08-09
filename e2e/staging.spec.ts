import { test, expect } from "@playwright/test";

const stagingUrl = process.env.STAGING_URL || "";

test.describe("live staging smoke", () => {
  test.skip(!stagingUrl, "STAGING_URL is not set");

  test("homepage, health, and csrf are live", async ({ page, request }) => {
    const health = await request.get(`${stagingUrl}/api/health?ready=1`);
    expect(health.ok()).toBeTruthy();
    const snapshot = await health.json();
    expect(snapshot.live).toBe(true);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.checks.gemini).toBe("ok");

    const csrf = await request.get(`${stagingUrl}/api/csrf`);
    expect(csrf.ok()).toBeTruthy();
    const csrfBody = await csrf.json();
    expect(csrfBody.ok).toBe(true);

    await page.goto(stagingUrl);
    await expect(page.getByRole("button", { name: /start interview/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /assessment/i })).toBeVisible();
    await expect(page.getByText(/8 questions/i)).toBeVisible();
  });
});
