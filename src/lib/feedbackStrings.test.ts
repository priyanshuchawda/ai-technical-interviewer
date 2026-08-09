import { describe, it, expect } from "vitest";
import { generateEvidenceBackedFeedback } from "./feedbackGenerator";
import candidatesData from "../../candidates.json";
import { InterviewSessionState } from "../types/interview";

describe("feedback string contracts", () => {
  const sarah = candidatesData.candidates[0];

  it("formats strengths, gaps, and next steps with canonical day titles", () => {
    const session: InterviewSessionState = {
      sessionId: "feedback-strings",
      candidate: sarah,
      turnCount: 4,
      evaluatedDays: new Set([29, 12]),
      history: [],
      done: true,
      masteryState: new Map([
        [29, {
          day: 29,
          topic: "wrong title",
          score: 0.9,
          attempts: 1,
          demonstratedConcepts: ["structured logging", "token latency"],
          missingConcepts: [],
          lastOutcome: "strong",
        }],
        [12, {
          day: 12,
          topic: "wrong title",
          score: 0.1,
          attempts: 1,
          demonstratedConcepts: [],
          missingConcepts: ["few-shot", "chain of thought"],
          lastOutcome: "weak",
        }],
      ]),
    };

    const feedback = generateEvidenceBackedFeedback(session);
    expect(feedback.summary).toContain("Sarah");
    expect(feedback.summary).not.toContain("Sarah Johnson");
    expect(feedback.strengths[0]).toMatch(/^Day 29 \(Monitoring, Logging & Observability\):/);
    expect(feedback.gaps[0]).toMatch(/^Day 12 \(Prompt Engineering Fundamentals\):/);
    expect(feedback.next[0]).toMatch(/^Review Day 12 \(Prompt Engineering Fundamentals\)/);
    expect(feedback).toMatchSnapshot();
  });
});
