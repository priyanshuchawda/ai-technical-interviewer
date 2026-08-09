import { describe, it, expect } from "vitest";
import { decodeSession, encodeSession } from "./sessionCodec";
import { InterviewSessionState } from "../types/interview";
import candidatesData from "../../candidates.json";

describe("sessionCodec", () => {
  it("round-trips Set and Map session fields", () => {
    const session: InterviewSessionState = {
      sessionId: "codec-1",
      candidate: candidatesData.candidates[0],
      turnCount: 2,
      evaluatedDays: new Set([7, 29]),
      history: [{ role: "interviewer", content: "hello" }],
      done: false,
      masteryState: new Map([
        [7, {
          day: 7,
          topic: "RAG",
          score: 0.8,
          attempts: 1,
          demonstratedConcepts: ["retrieval"],
          missingConcepts: [],
          lastOutcome: "strong",
        }],
      ]),
    };

    const restored = decodeSession(encodeSession(session));
    expect(restored?.sessionId).toBe("codec-1");
    expect(restored?.evaluatedDays.has(29)).toBe(true);
    expect(restored?.masteryState.get(7)?.score).toBe(0.8);
  });

  it("returns null for invalid payloads", () => {
    expect(decodeSession("{not json")).toBeNull();
    expect(decodeSession("{}")).toBeNull();
  });
});
