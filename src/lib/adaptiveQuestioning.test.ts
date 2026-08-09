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
    expect(classifyResponseOutcome("Not sure, but I would probably use Prometheus counters and histograms for latency.")).not.toBe("unknown");
    expect(classifyResponseOutcome("I have not used Prometheus directly, but I have used Datadog.")).toBe("partial");
    expect(classifyResponseOutcome("Can you give me an example?")).toBe("partial");
  });

  it("should select initial focus area based on candidate intelligence profile", async () => {
    const sessionId = "adaptive-init-test-" + Date.now();
    const result = await processInterviewTurn(sessionId, sarah);

    const session = await getSession(sessionId);
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
    const initialDay = (await getSession(sessionId))?.currentQuestionDay;

    // Turn 1: Candidate says "I don't know"
    const result = await processInterviewTurn(sessionId, undefined, "I don't know");
    const sessionAfterUnknown = await getSession(sessionId);

    // Current day MUST remain on the same day (Day 29), and lastOutcome must be "unknown"
    expect(sessionAfterUnknown?.lastOutcome).toBe("unknown");
    expect(sessionAfterUnknown?.currentQuestionDay).toBe(initialDay);
    expect(sessionAfterUnknown?.turnsOnCurrentDay).toBe(2);
    expect(result.done).toBe(false);
  });

  it("should keep a strong answer on-topic for a deeper probe before progressing", async () => {
    const sessionId = "adaptive-strong-test-" + Date.now();
    await processInterviewTurn(sessionId, sarah);
    const initialDay = (await getSession(sessionId))?.currentQuestionDay;

    await processInterviewTurn(
      sessionId,
      undefined,
      "In our production environment, we implemented structured Prometheus metrics and OpenTelemetry logs for vector index latency."
    );
    const sessionAfterStrong = await getSession(sessionId);

    expect(sessionAfterStrong?.lastOutcome).toBe("strong");
    expect(sessionAfterStrong?.currentQuestionDay).toBe(initialDay);
    expect(sessionAfterStrong?.turnsOnCurrentDay).toBe(2);

    await processInterviewTurn(sessionId, undefined, "We added trace IDs, failure counters, and dashboards for the slowest requests.");
    const sessionAfterProbe = await getSession(sessionId);
    expect(sessionAfterProbe?.currentQuestionDay).not.toBe(initialDay);
    expect(sessionAfterProbe?.turnsOnCurrentDay).toBe(1);
  });

  it("should include grounding curriculum day/title/objectives in generated system prompt context", () => {
    const day29Curriculum = getCurriculumDay(29);
    const targetMission = sarah.missions.find((m) => m.day === 29) || { day: 29, title: "Monitoring, Logging & Observability" };

    const systemPrompt = buildInterviewerSystemPrompt(sarah, targetMission, day29Curriculum, undefined, "unknown", 1);

    expect(systemPrompt).toContain("INTERNAL TECHNICAL GROUNDING");
    expect(systemPrompt).toContain("Focus topic: Monitoring, Logging & Observability");
    expect(systemPrompt).toContain("ADAPTIVE GUIDANCE [UNKNOWN ANSWER DETECTED]");
  });
});
