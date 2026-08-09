import { describe, it, expect } from "vitest";
import { processInterviewTurn, getSession } from "./interviewEngine";
import { classifyResponseOutcome } from "./responseClassifier";
import { buildInterviewerSystemPrompt } from "./prompts";
import candidatesData from "../../candidates.json";
import { getCurriculumDay } from "./dataService";

describe("Profile-Driven Adaptive Questioning Tests", () => {
  const sarah = candidatesData.candidates[0]; // Sarah Johnson (CAND-001)

  it("should classify responses into structured outcomes (strong, weak, unknown, partial)", () => {
    expect(classifyResponseOutcome("i don't know")).toBe("unknown");
    expect(classifyResponseOutcome("I have no idea about this")).toBe("unknown");
    expect(classifyResponseOutcome("nope")).toBe("unknown");
    expect(classifyResponseOutcome("maybe")).toBe("weak");
    expect(classifyResponseOutcome("In mission 1, I built a scalable vector search pipeline using cosine similarity and RAG.")).toBe("strong");
  });

  it("should select initial focus area based on candidate intelligence profile", async () => {
    const sessionId = "adaptive-init-test-" + Date.now();
    const result = await processInterviewTurn(sessionId, sarah);

    const session = getSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.intelligenceProfile).toBeDefined();

    // Initial focus area for Sarah is Day 29 (her skipped mission)
    const expectedTopFocus = session?.intelligenceProfile?.recommendedFocusAreas[0].day;
    expect(session?.currentQuestionDay).toBe(expectedTopFocus);
    expect(result.done).toBe(false);
  });

  it("should stay on same topic/day with a prerequisite follow-up when candidate responds 'I don't know'", async () => {
    const sessionId = "adaptive-unknown-test-" + Date.now();
    // Turn 0: Init
    await processInterviewTurn(sessionId, sarah);
    const initialDay = getSession(sessionId)?.currentQuestionDay;

    // Turn 1: Candidate says "I don't know"
    const result = await processInterviewTurn(sessionId, undefined, "I don't know");
    const sessionAfterUnknown = getSession(sessionId);

    // Current day MUST remain on the same day (Day 29), and lastOutcome must be "unknown"
    expect(sessionAfterUnknown?.lastOutcome).toBe("unknown");
    expect(sessionAfterUnknown?.currentQuestionDay).toBe(initialDay);
    expect(sessionAfterUnknown?.turnsOnCurrentDay).toBe(2);
    expect(result.done).toBe(false);
  });

  it("should allow topic progression when candidate gives a strong technical answer", async () => {
    const sessionId = "adaptive-strong-test-" + Date.now();
    // Turn 0: Init
    await processInterviewTurn(sessionId, sarah);
    const initialDay = getSession(sessionId)?.currentQuestionDay;

    // Turn 1: Candidate gives a strong response
    await processInterviewTurn(
      sessionId,
      undefined,
      "In our production environment, we implemented structured Prometheus metrics and OpenTelemetry logs for vector index latency."
    );
    const sessionAfterStrong = getSession(sessionId);

    expect(sessionAfterStrong?.lastOutcome).toBe("strong");
    // Should progress to the next focus day
    expect(sessionAfterStrong?.currentQuestionDay).not.toBe(initialDay);
    expect(sessionAfterStrong?.turnsOnCurrentDay).toBe(1);
  });

  it("should include grounding curriculum day/title/objectives in generated system prompt context", () => {
    const day29Curriculum = getCurriculumDay(29);
    const targetMission = sarah.missions.find((m) => m.day === 29) || { day: 29, title: "Monitoring, Logging & Observability" };

    const systemPrompt = buildInterviewerSystemPrompt(sarah, targetMission, day29Curriculum, undefined, "unknown", 1);

    expect(systemPrompt).toContain("GROUNDING CURRICULUM CONTEXT");
    expect(systemPrompt).toContain("Day 29: Monitoring, Logging & Observability");
    expect(systemPrompt).toContain("ADAPTIVE GUIDANCE [UNKNOWN ANSWER DETECTED]");
  });
});
