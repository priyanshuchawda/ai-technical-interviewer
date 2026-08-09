import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./geminiClient", () => ({
  generateGeminiContent: vi.fn().mockResolvedValue("What trade-off would you make if this system had to handle ten times the traffic?"),
}));
vi.mock("./breethClient", () => ({
  breethClient: {
    addEpisode: vi.fn().mockResolvedValue(true),
    searchMemory: vi.fn().mockResolvedValue([]),
  },
}));

import { processInterviewTurn, getSession } from "./interviewEngine";
import { generateGeminiContent } from "./geminiClient";
import candidatesData from "../../candidates.json";

describe("deterministic adaptive interview trajectories", () => {
  const sarah = candidatesData.candidates[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deepens strong answers, records coding evidence, and completes exactly once", async () => {
    const sessionId = "trajectory-strong-" + Date.now();
    await processInterviewTurn(sessionId, sarah);

    const answers = [
      "I use structured JSON logs, Prometheus counters, histograms, and trace IDs to measure latency and failures.",
      "I would separate metrics from logs, then use correlation IDs to follow a request across retrieval and tool calls.",
      "I use few-shot examples, explicit constraints, and evaluation cases to keep prompts reliable in production.",
      "I would version prompt changes and monitor regressions before shipping them to users.",
      "I deploy containerized services with health checks, staged rollouts, and clear rollback paths.",
      "I isolate failures with timeouts, retries, and idempotent operations rather than hiding exceptions.",
      "I normalize embedding vectors and use cosine similarity with dimension validation.",
      "I would batch vector work and monitor index freshness, memory pressure, and retrieval quality.",
    ];

    let finalResult;
    for (let index = 0; index < answers.length; index += 1) {
      finalResult = await processInterviewTurn(sessionId, undefined, answers[index]);
      if (index < answers.length - 1) expect(finalResult.done).toBe(false);
    }

    expect(finalResult?.done).toBe(true);
    expect(finalResult?.feedback).toBeDefined();
    const session = await getSession(sessionId);
    expect(session?.turnCount).toBe(8);
    expect(session?.masteryState.size).toBeGreaterThanOrEqual(3);
    expect(session?.codingEvidence).toEqual([]);

    const codingResult = await processInterviewTurn(sessionId, undefined, "The coding check is complete.", {
      taskId: "cosine-similarity",
      code: "def cosine_similarity(a, b):\n    return sum(x * y for x, y in zip(a, b)) / (1 or 1)\n    # sqrt magnitude zero handling",
    });
    expect(codingResult.done).toBe(true);
    expect(codingResult.reply).toBe(finalResult?.reply);
    const afterDuplicate = await getSession(sessionId);
    expect(afterDuplicate?.history.length).toBe(session?.history.length);
  });

  it("keeps recovery answers on-topic and redirects off-topic answers", async () => {
    const sessionId = "trajectory-recovery-" + Date.now();
    await processInterviewTurn(sessionId, sarah);
    const initialDay = (await getSession(sessionId))?.currentQuestionDay;

    const recoveryAnswers = ["maybe", "I do not know", "I have not used Prometheus directly, but I have used Datadog.", "I think logs are mostly for checking errors."];
    const recoveryDays: Array<number | undefined> = [];
    for (const answer of recoveryAnswers) {
      await processInterviewTurn(sessionId, undefined, answer);
      recoveryDays.push((await getSession(sessionId))?.currentQuestionDay);
    }
    expect(recoveryDays.slice(0, 3).every((day) => day === initialDay)).toBe(true);
    expect(recoveryDays[3]).not.toBe(initialDay);

    const offTopicSession = "trajectory-offtopic-" + Date.now();
    await processInterviewTurn(offTopicSession, sarah);
    const offTopicResult = await processInterviewTurn(offTopicSession, undefined, "Embeddings convert text into vectors using cosine similarity and FAISS.");
    expect(offTopicResult.intelligence?.currentDay).toBe(29);
    expect(offTopicResult.intelligence?.latestEvaluation?.outcome).toBe("off_topic");
  });

  it("passes practical evidence into the next interviewer prompt", async () => {
    const sessionId = "trajectory-coding-" + Date.now();
    await processInterviewTurn(sessionId, sarah);
    await processInterviewTurn(sessionId, undefined, "I use observability metrics and structured logs to track latency.", {
      taskId: "structured-observability",
      code: `def run_with_observability(operation, logger):\n    import time\n    try:\n        start = time.monotonic()\n        return operation()\n    except Exception:\n        logger.error({"event": "failure"})\n        raise\n    finally:\n        logger.info({"duration": time.monotonic() - start})`,
    });
    const systemPrompts = vi.mocked(generateGeminiContent).mock.calls.map((call) => String(call[1] || ""));
    expect(systemPrompts.some((prompt) => prompt.includes("INTERNAL PRACTICAL EVIDENCE"))).toBe(true);
    expect((await getSession(sessionId))?.codingEvidence?.[0].passed).toBe(4);
  });
});
