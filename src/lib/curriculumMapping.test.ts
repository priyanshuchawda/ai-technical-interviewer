import { describe, it, expect } from "vitest";
import { getCurriculumDay } from "./dataService";
import { generateCandidateProfile } from "./candidateProfiler";
import { processInterviewTurn, getSession } from "./interviewEngine";
import { generateEvidenceBackedFeedback } from "./feedbackGenerator";
import { InterviewSessionState } from "../types/interview";
import candidatesData from "../../candidates.json";

describe("Canonical Curriculum Day Mapping & State Integrity Tests", () => {
  const sarah = candidatesData.candidates[0];

  it("should return canonical day titles for key cohort days", () => {
    expect(getCurriculumDay(7)?.title).toBe("Embeddings Explained");
    expect(getCurriculumDay(12)?.title).toBe("Prompt Engineering Fundamentals");
    expect(getCurriculumDay(28)?.title).toBe("Docker & Kubernetes Deployment");
    expect(getCurriculumDay(29)?.title).toBe("Monitoring, Logging & Observability");
  });

  it("should preserve canonical day numbers and titles in candidate focus areas", () => {
    const profile = generateCandidateProfile(sarah);

    const day29Focus = profile.recommendedFocusAreas.find((f) => f.day === 29);
    expect(day29Focus).toBeDefined();
    expect(day29Focus?.title).toBe("Monitoring, Logging & Observability");

    const day12Focus = profile.recommendedFocusAreas.find((f) => f.day === 12);
    expect(day12Focus).toBeDefined();
    expect(day12Focus?.title).toBe("Prompt Engineering Fundamentals");

    const day28Focus = profile.recommendedFocusAreas.find((f) => f.day === 28);
    expect(day28Focus).toBeDefined();
    expect(day28Focus?.title).toBe("Docker & Kubernetes Deployment");

    const day7Focus = profile.recommendedFocusAreas.find((f) => f.day === 7);
    expect(day7Focus).toBeDefined();
    expect(day7Focus?.title).toBe("Embeddings Explained");
  });

  it("[REGRESSION TEST] Day 29 question + strong answer => mastery key 29 must be Monitoring, Logging & Observability", async () => {
    const sessionId = "mapping-regression-test-" + Date.now();

    // 1. Initialize session for Sarah (starts on Day 29)
    const initResult = await processInterviewTurn(sessionId, sarah);
    expect(initResult.intelligence?.currentDay).toBe(29);
    expect(initResult.intelligence?.currentTopic).toBe("Monitoring, Logging & Observability");

    // 2. Candidate answers Day 29 with a strong logging answer
    const turn1Result = await processInterviewTurn(
      sessionId,
      undefined,
      "I implemented structured logging using Python structlog to record JSON logs with trace IDs, token latency, and error metrics."
    );

    const session = getSession(sessionId);
    expect(session).toBeDefined();

    // Check masteryState key 29
    const mastery29 = session?.masteryState.get(29);
    expect(mastery29).toBeDefined();
    expect(mastery29?.day).toBe(29);
    expect(mastery29?.topic).toBe("Monitoring, Logging & Observability");

    // Check UI intelligence payload serialization for Day 29
    const masteryScore29 = turn1Result.intelligence?.masteryScores.find((m) => m.day === 29);
    expect(masteryScore29).toBeDefined();
    expect(masteryScore29?.topic).toBe("Monitoring, Logging & Observability");
  }, 15000);

  it("should preserve canonical day and title pairing in multi-turn mastery state and intelligence payload", async () => {
    const sessionId = "multiturn-mapping-test-" + Date.now();

    // Init (Day 29)
    await processInterviewTurn(sessionId, sarah);

    // Turn 1 on Day 29 -> strong answer -> advances to Day 12
    const turn1 = await processInterviewTurn(
      sessionId,
      undefined,
      "I implemented structured logging with Python structlog to capture JSON metrics and token latency."
    );

    expect(turn1.intelligence?.currentDay).toBe(12);
    expect(turn1.intelligence?.currentTopic).toBe("Prompt Engineering Fundamentals");

    // Turn 2 on Day 12 -> strong answer -> advances to Day 28
    const turn2 = await processInterviewTurn(
      sessionId,
      undefined,
      "I designed system prompts using few-shot example templates and chain of thought reasoning."
    );

    expect(turn2.intelligence?.currentDay).toBe(28);
    expect(turn2.intelligence?.currentTopic).toBe("Docker & Kubernetes Deployment");

    const session = getSession(sessionId);

    // Assert key 29 has title "Monitoring, Logging & Observability"
    const m29 = session?.masteryState.get(29);
    expect(m29?.topic).toBe("Monitoring, Logging & Observability");

    // Assert key 12 has title "Prompt Engineering Fundamentals"
    const m12 = session?.masteryState.get(12);
    expect(m12?.topic).toBe("Prompt Engineering Fundamentals");
  }, 25000);

  it("should preserve canonical day numbers and titles in final feedback recommendations", () => {
    const session: InterviewSessionState = getSession("nonexistent-session") || {
      sessionId: "canonical-feedback-test",
      candidate: sarah,
      turnCount: 2,
      evaluatedDays: new Set([29, 12, 28, 7]),
      history: [],
      done: false,
      masteryState: new Map([
        [29, { day: 29, topic: "Monitoring, Logging & Observability", score: 0.2, attempts: 1, demonstratedConcepts: [], missingConcepts: ["structured logging"], lastOutcome: "weak" }],
        [12, { day: 12, topic: "Prompt Engineering Fundamentals", score: 0.8, attempts: 1, demonstratedConcepts: ["few-shot"], missingConcepts: [], lastOutcome: "strong" }],
      ]),
    };

    const feedback = generateEvidenceBackedFeedback(session);

    expect(feedback.gaps.some((g) => g.includes("Day 29 (Monitoring, Logging & Observability)"))).toBe(true);
    expect(feedback.next.some((n) => n.includes("Day 29 (Monitoring, Logging & Observability)"))).toBe(true);
  });
});
