import { test, expect, type Page } from "@playwright/test";

const intelligence = {
  currentDay: 29,
  currentTopic: "Monitoring, Logging & Observability",
  progress: { turnCount: 0, totalTurns: 8, evaluatedDaysCount: 1 },
  difficultyState: "Standard Adaptive Assessment",
  focusAreas: [{ day: 29, title: "Monitoring, Logging & Observability", reason: "skipped mission" }],
  masteryScores: [],
  whyThisQuestion: "Profile signal: Selected Day 29 because it was skipped.",
};

async function mockInterviewApis(page: Page) {
  await page.route("**/api/csrf", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, cookie: true }),
    });
  });

  await page.route("**/api/interview", async (route) => {
    const body = (route.request().postDataJSON() || {}) as { candidate?: unknown; message?: string };
    if (body.candidate) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "Welcome. Walk me through your monitoring setup.",
          done: false,
          intelligence,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "Good. What metrics did you export?",
        done: false,
        intelligence: {
          ...intelligence,
          progress: { ...intelligence.progress, turnCount: 1 },
          latestEvaluation: {
            outcome: "partial",
            score: 0.5,
            demonstratedConcepts: ["metrics"],
            missingConcepts: [],
            evidence: "mentioned metrics",
          },
        },
      }),
    });
  });
}

async function openApp(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /start interview/i })).toBeVisible();
  await page.waitForTimeout(500);
}

test.beforeEach(async ({ page }) => {
  await mockInterviewApis(page);
});

test("briefing screen shows primary controls", async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole("button", { name: /start interview/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /assessment/i })).toBeVisible();
  await expect(page.locator("#candidate-selector")).toBeVisible();
  await expect(page.getByText(/8 questions/i)).toBeVisible();
});

test("assessment drawer opens and closes", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: /assessment/i }).click();
  await expect(page.locator(".drawer-panel")).toBeVisible();
  await expect(page.locator(".drawer-panel")).toContainText("Interview Plan");
  await page.getByRole("button", { name: "✕" }).click();
  await expect(page.locator(".drawer-panel")).toHaveCount(0);
});

test("start interview then submit a turn", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: /start interview/i }).click();
  await expect(page.getByText(/walk me through your monitoring setup/i)).toBeVisible();
  await expect(page.getByText(/day 29/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /submit/i })).toBeDisabled();
  await page.getByPlaceholder(/type your technical response/i).fill("Prometheus metrics and structured logs.");
  await expect(page.getByRole("button", { name: /submit/i })).toBeEnabled();
  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page.getByText(/what metrics did you export/i)).toBeVisible();
});
