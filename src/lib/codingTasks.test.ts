import { describe, expect, it } from "vitest";
import { evaluateCodeSubmission, getCodingTask, getOptionalCodingTask } from "./codingTasks";

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

