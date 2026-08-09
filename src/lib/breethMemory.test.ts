import { describe, it, expect, vi } from "vitest";
import { buildInterviewerSystemPrompt } from "./prompts";
import { breethClient } from "./breethClient";
import { processInterviewTurn } from "./interviewEngine";
import candidatesData from "../../candidates.json";

describe("Breeth Graph Memory Integration Tests", () => {
  const sarah = candidatesData.candidates[0];

  it("should include retrieved Breeth memories in system prompt when available", () => {
    const targetMission = { day: 29, title: "Monitoring, Logging & Observability" };
    const memories = [
      "Candidate mentioned using Prometheus metrics for vector index latency.",
      "Candidate previously discussed chunking strategies on Day 7."
    ];

    const prompt = buildInterviewerSystemPrompt(
      sarah,
      targetMission,
      undefined,
      undefined,
      "strong",
      1,
      memories
    );

    expect(prompt).toContain("RETRIEVED BREETH GRAPH MEMORY CONTEXT");
    expect(prompt).toContain("Memory 1: Candidate mentioned using Prometheus metrics");
    expect(prompt).toContain("Memory 2: Candidate previously discussed chunking strategies");
  });

  it("should continue interview execution normally even if Breeth memory search fails or times out", async () => {
    // Mock Breeth searchMemory to simulate network failure
    const searchSpy = vi.spyOn(breethClient, "searchMemory").mockRejectedValueOnce(new Error("Breeth API Connection Timeout"));

    const sessionId = "breeth-fallback-test-" + Date.now();
    await processInterviewTurn(sessionId, sarah);

    // Turn 1 with simulated Breeth failure
    const turnResult = await processInterviewTurn(sessionId, undefined, "I implemented custom logging for our API.");

    expect(searchSpy).toHaveBeenCalled();
    expect(turnResult.done).toBe(false);
    expect(turnResult.reply).toBeDefined();
    expect(turnResult.reply.length).toBeGreaterThan(10);

    searchSpy.mockRestore();
  });

  it("should ensure no Breeth API credentials are hardcoded or exposed in client code", async () => {
    const breethApiKeyInEnv = process.env.BREETH_API_KEY;
    // Check that breethClient does not expose raw apiKey property directly
    expect((breethClient as any).apiKey).toBeUndefined();
    expect(breethApiKeyInEnv).toBeDefined();
  });
});
