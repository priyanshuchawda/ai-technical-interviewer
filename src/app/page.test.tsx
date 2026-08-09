/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InterviewPage from "./page";

const intelligence = {
  currentDay: 29,
  currentTopic: "Monitoring, Logging & Observability",
  progress: { turnCount: 0, totalTurns: 8, evaluatedDaysCount: 1 },
  difficultyState: "Standard Adaptive Assessment",
  focusAreas: [{ day: 29, title: "Monitoring, Logging & Observability", reason: "skipped mission" }],
  masteryScores: [],
  whyThisQuestion: "Profile signal: Selected Day 29 because it was skipped.",
};

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

describe("Interview page controls", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/csrf")) return jsonResponse({ ok: true, cookie: true });
        return jsonResponse({ error: "Unhandled fetch", code: "TEST" }, 500);
      })
    );
  });

  it("renders briefing copy, start, assessment, and candidate selector", async () => {
    render(<InterviewPage />);
    expect(screen.getByRole("button", { name: /start interview/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /assessment/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /candidate/i })).toBeInTheDocument();
    expect(screen.getByText("8 questions · Conversation + practical exercises")).toBeInTheDocument();
    expect(document.querySelector(".start-cand-name")).toHaveTextContent(/sarah johnson/i);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });

  it("opens and closes the assessment drawer", async () => {
    const user = userEvent.setup();
    render(<InterviewPage />);
    await user.click(screen.getByRole("button", { name: /assessment/i }));
    expect(screen.getByText("Interview Plan")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "✕" }));
    expect(screen.queryByText("Interview Plan")).not.toBeInTheDocument();
  });

  it("switches the briefing candidate", async () => {
    const user = userEvent.setup();
    render(<InterviewPage />);
    await user.selectOptions(screen.getByRole("combobox", { name: /candidate/i }), "CAND-002");
    expect(screen.getAllByText(/alex turner/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/backend software engineer/i).length).toBeGreaterThan(0);
  });

  it("starts an interview and enables submit only after text", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/csrf")) return jsonResponse({ ok: true, cookie: true });
        if (url.includes("/api/interview") && init?.method === "POST") {
          return jsonResponse({
            reply: "Welcome Sarah. How did you approach monitoring?",
            done: false,
            intelligence,
          });
        }
        return jsonResponse({ error: "nope" }, 500);
      })
    );

    render(<InterviewPage />);
    await user.click(screen.getByRole("button", { name: /start interview/i }));
    expect(await screen.findByText(/how did you approach monitoring/i)).toBeInTheDocument();
    expect(screen.getByText(/monitoring, logging & observability/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /speak/i })).toBeInTheDocument();
    expect(document.querySelector(".topic-meta")).not.toHaveTextContent(/day 29/i);

    const submit = screen.getByRole("button", { name: /submit/i });
    expect(submit).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/type your technical response/i), "I used Prometheus.");
    expect(submit).toBeEnabled();
  });

  it("shows cancel while a turn is in flight", async () => {
    const user = userEvent.setup();
    let releaseTurn: (() => void) | undefined;
    const turnGate = new Promise<void>((resolve) => {
      releaseTurn = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/csrf")) return jsonResponse({ ok: true, cookie: true });
        if (url.includes("/api/interview") && init?.method === "POST") {
          const body = JSON.parse(String(init.body || "{}")) as { message?: string };
          if (!body.message) {
            return jsonResponse({
              reply: "First question about observability.",
              done: false,
              intelligence,
            });
          }
          return turnGate.then(() =>
            jsonResponse({
              reply: "Thanks, let's continue.",
              done: false,
              intelligence: { ...intelligence, progress: { ...intelligence.progress, turnCount: 1 } },
            })
          );
        }
        return jsonResponse({ error: "nope" }, 500);
      })
    );

    render(<InterviewPage />);
    await user.click(screen.getByRole("button", { name: /start interview/i }));
    await screen.findByPlaceholderText(/type your technical response/i);
    await user.type(screen.getByPlaceholderText(/type your technical response/i), "structlog json logs");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByRole("button", { name: /cancel/i })).toBeInTheDocument();
    releaseTurn?.();
    expect(await screen.findByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("shows a start error on the briefing screen", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/csrf")) return jsonResponse({ ok: true, cookie: true });
        return jsonResponse({ error: "Unauthorized", code: "INTERVIEW_UNAUTHORIZED" }, 401);
      })
    );

    render(<InterviewPage />);
    await user.click(screen.getByRole("button", { name: /start interview/i }));
    expect(await screen.findByText(/unauthorized/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start interview/i })).toBeEnabled();
  });
});
