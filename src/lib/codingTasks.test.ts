import { describe, expect, it } from "vitest";
import { evaluateCodeSubmission, getCodingTask, getOptionalCodingTask, getOpportunisticCodingTask, validateGeneratedCodingTask } from "./codingTasks";

describe("deterministic coding assessment", () => {
  it("scores a cosine similarity implementation from observable requirements", () => {
    const task = getCodingTask("Embeddings & Vector Search");
    const result = evaluateCodeSubmission(task, [
      "def cosine_similarity(a, b):",
      "    dot = sum(x * y for x, y in zip(a, b))",
      "    magnitude = sqrt(sum(x * x for x in a))",
      "    if magnitude == 0: return 0",
      "    return dot / magnitude",
    ].join("\n"));

    expect(result.passed).toBe(4);
    expect(result.total).toBe(4);
    expect(result.score).toBe(1);
  });

  it("returns concrete failures for an empty submission", () => {
    const result = evaluateCodeSubmission(getCodingTask("Monitoring, Logging & Observability"), "");

    expect(result.passed).toBe(0);
    expect(result.total).toBeGreaterThan(0);
    expect(result.tests.every((test) => !test.passed)).toBe(true);
  });
  it("keeps implementation checks contextual to the interview topic", () => {
    expect(getOptionalCodingTask("Security, Privacy & Guardrails")).toBeNull();
    expect(getOptionalCodingTask("Monitoring, Logging & Observability")?.id).toBe("structured-observability");
  });
});



describe("opportunistic coding decisions", () => {
  it("does not offer coding for recovery or off-topic outcomes", () => {
    expect(getOpportunisticCodingTask("Monitoring, Logging & Observability", "unknown", ["latency"], 0)).toBeNull();
    expect(getOpportunisticCodingTask("Monitoring, Logging & Observability", "off_topic", ["latency"], 0)).toBeNull();
  });

  it("offers one contextual fallback task for concrete evidence", () => {
    const task = getOpportunisticCodingTask("Monitoring, Logging & Observability", "strong", ["structured logging"], 0);
    expect(task?.id).toBe("structured-observability");
    expect(getOpportunisticCodingTask("Monitoring, Logging & Observability", "strong", ["structured logging"], 1)).toBeNull();
    expect(task?.functionSignature).toBe("run_with_observability(operation, logger)");
  });

  it("accepts a safe generated contract and rejects malformed or incompatible contracts", () => {
    const valid = validateGeneratedCodingTask({
      title: "Implement cosine similarity", language: "python", context: "Vector search check",
      whyThisTask: "Validate the similarity claim", instructions: ["Implement the function"],
      starterCode: "def cosine_similarity(a, b):\n    pass", functionSignature: "cosine_similarity(a, b)",
      evaluationCriteria: ["Compute similarity"], difficulty: "basic", estimatedMinutes: 5,
    });
    expect(valid?.functionSignature).toBe("cosine_similarity(a, b)");
    expect(validateGeneratedCodingTask({ title: "Unsafe", language: "python" })).toBeNull();
    expect(validateGeneratedCodingTask({
      title: "Missing contract", language: "python", context: "A valid context here", whyThisTask: "A valid reason here",
      instructions: ["Implement it"], starterCode: "def other(): pass", functionSignature: "expected(a)",
      evaluationCriteria: ["Check it"], difficulty: "basic", estimatedMinutes: 5,
    })).toBeNull();
  });
});
