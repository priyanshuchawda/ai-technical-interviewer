import { describe, it, expect } from "vitest";
import { interviewFeedbackSchema } from "./feedbackSchema";

describe("interviewFeedbackSchema", () => {
  it("accepts a valid feedback payload", () => {
    const parsed = interviewFeedbackSchema.safeParse({
      summary: "Solid multi-turn performance across retrieval topics.",
      strengths: ["Clear vector search explanation"],
      gaps: ["Needs stronger deployment detail"],
      next: ["Review Kubernetes health probes"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects malformed feedback", () => {
    const parsed = interviewFeedbackSchema.safeParse({
      summary: "Too short",
      strengths: [],
      gaps: ["ok"],
      next: ["ok"],
    });
    expect(parsed.success).toBe(false);
  });
});
