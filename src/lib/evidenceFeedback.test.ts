import { describe, it, expect } from "vitest";
import { generateEvidenceBackedFeedback } from "./feedbackGenerator";
import { processInterviewTurn, createSession } from "./interviewEngine";
import candidatesData from "../../candidates.json";

describe("Evidence-Backed Final Interview Feedback Tests", () => {
  const sarah = candidatesData.candidates[0];

  it("should contain all four required conceptual fields in feedback", () => {
    const session = createSession("feedback-fields-test", sarah);
    const feedback = generateEvidenceBackedFeedback(session);

    expect(feedback).toHaveProperty("summary");
    expect(feedback).toHaveProperty("strengths");
    expect(feedback).toHaveProperty("gaps");
    expect(feedback).toHaveProperty("next");

    expect(typeof feedback.summary).toBe("string");
    expect(Array.isArray(feedback.strengths)).toBe(true);
    expect(Array.isArray(feedback.gaps)).toBe(true);
    expect(Array.isArray(feedback.next)).toBe(true);
  });

  it("should generate strengths from live demonstrated concepts in actual interview turns", async () => {
    const sessionId = "feedback-strengths-test-" + Date.now();
    await processInterviewTurn(sessionId, sarah);

    // Turn 1: Candidate demonstrates strong answer on FAISS and similarity search
    await processInterviewTurn(
      sessionId,
      undefined,
      "I implemented cosine similarity search with FAISS vector index for fast retrieval and matching."
    );

    const session = createSession(sessionId, sarah);
    // Simulate mastery entry for Day 10
    session.masteryState.set(10, {
      day: 10,
      topic: "The Retrieval & Matching Engine",
      score: 0.85,
      attempts: 1,
      demonstratedConcepts: ["FAISS vector index", "cosine similarity search"],
      missingConcepts: [],
      lastOutcome: "strong",
    });

    const feedback = generateEvidenceBackedFeedback(session);

    expect(feedback.strengths.some((s) => s.includes("FAISS vector index") || s.includes("cosine similarity"))).toBe(true);
  });

  it("should generate gaps from live weak/unknown answers and NOT automatically treat historical high-attempt data as a gap", async () => {
    const sessionId = "feedback-gaps-test-" + Date.now();

    const session = createSession(sessionId, sarah);
    // Sarah historically had 4 attempts on Day 12 (Prompt Engineering).
    // But during the live interview, she gives a strong answer on Day 12.
    session.masteryState.set(12, {
      day: 12,
      topic: "Prompt Engineering Fundamentals",
      score: 0.9,
      attempts: 1,
      demonstratedConcepts: ["system prompts", "few-shot examples"],
      missingConcepts: [],
      lastOutcome: "strong",
    });

    // And gives an unknown answer on Day 29
    session.masteryState.set(29, {
      day: 29,
      topic: "Monitoring, Logging & Observability",
      score: 0.0,
      attempts: 1,
      demonstratedConcepts: [],
      missingConcepts: ["structured logging", "token latency"],
      lastOutcome: "unknown",
    });

    const feedback = generateEvidenceBackedFeedback(session);

    // Live gap MUST be Day 29 (unknown response)
    expect(feedback.gaps.some((g) => g.includes("Day 29"))).toBe(true);
    // Historical high-attempt Day 12 MUST NOT be listed as a gap because live performance was strong!
    expect(feedback.gaps.some((g) => g.includes("Day 12"))).toBe(false);
  });

  it("should map next steps directly to identified live curriculum gaps", async () => {
    const sessionId = "feedback-next-test-" + Date.now();
    const session = createSession(sessionId, sarah);

    session.masteryState.set(29, {
      day: 29,
      topic: "Monitoring, Logging & Observability",
      score: 0.1,
      attempts: 1,
      demonstratedConcepts: [],
      missingConcepts: ["OpenTelemetry metrics"],
      lastOutcome: "weak",
    });

    const feedback = generateEvidenceBackedFeedback(session);

    expect(feedback.next.some((n) => n.includes("Day 29") || n.includes("Monitoring"))).toBe(true);
  });
});
