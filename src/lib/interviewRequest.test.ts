import { describe, it, expect } from "vitest";
import { interviewRequestSchema } from "./interviewRequest";
import candidatesData from "../../candidates.json";

describe("interviewRequestSchema", () => {
  const candidate = candidatesData.candidates[0];

  it("accepts a valid start payload", () => {
    const parsed = interviewRequestSchema.safeParse({
      sessionId: "abc-123",
      candidate,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a valid turn payload", () => {
    const parsed = interviewRequestSchema.safeParse({
      sessionId: "abc-123",
      message: "I used vector search.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing sessionId", () => {
    const parsed = interviewRequestSchema.safeParse({ message: "hello" });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const parsed = interviewRequestSchema.safeParse({
      sessionId: "abc-123",
      extra: true,
    });
    expect(parsed.success).toBe(false);
  });
});
