import { describe, it, expect } from "vitest";
import { processInterviewTurn } from "./interviewEngine";
import candidatesData from "../../candidates.json";

describe("Interview Intelligence State & UI Payload Tests", () => {
  const sarah = candidatesData.candidates[0];

  it("should include intelligence payload on interview initialization", async () => {
    const sessionId = "ui-intelligence-init-test-" + Date.now();
    const result = await processInterviewTurn(sessionId, sarah);

    expect(result.intelligence).toBeDefined();
    expect(result.intelligence?.currentDay).toBe(29);
    expect(result.intelligence?.currentTopic).toContain("Monitoring");
    expect(result.intelligence?.progress.turnCount).toBe(0);
    expect(result.intelligence?.difficultyState).toBe("Standard Adaptive Assessment");
    expect(result.intelligence?.whyThisQuestion).toContain("Profile signal");
    expect(result.intelligence?.focusAreas.length).toBeGreaterThan(0);
  }, 15000);

  it("should update intelligence payload and whyThisQuestion after candidate turns", async () => {
    const sessionId = "ui-intelligence-turn-test-" + Date.now();
    await processInterviewTurn(sessionId, sarah);

    // Turn 1: candidate answers "I don't know"
    const turn1Result = await processInterviewTurn(sessionId, undefined, "I don't know");
    expect(turn1Result.intelligence).toBeDefined();
    expect(turn1Result.intelligence?.difficultyState).toBe("Prerequisite Recovery");
    expect(turn1Result.intelligence?.whyThisQuestion).toContain("Previous answer");
    expect(turn1Result.intelligence?.latestEvaluation?.outcome).toBe("unknown");

    // Turn 2: candidate gives a strong answer
    const turn2Result = await processInterviewTurn(
      sessionId,
      undefined,
      "I built a vector search pipeline using cosine similarity and FAISS."
    );
    expect(turn2Result.intelligence).toBeDefined();
    expect(turn2Result.intelligence?.whyThisQuestion).toContain("Current mastery");
    expect(turn2Result.intelligence?.masteryScores.length).toBeGreaterThan(0);
  }, 25000);

  it("should maintain backward-compatible response contract (reply, done)", async () => {
    const sessionId = "ui-contract-test-" + Date.now();
    const result = await processInterviewTurn(sessionId, sarah);

    expect(result).toHaveProperty("reply");
    expect(result).toHaveProperty("done");
    expect(typeof result.reply).toBe("string");
    expect(typeof result.done).toBe("boolean");
  }, 15000);
});
