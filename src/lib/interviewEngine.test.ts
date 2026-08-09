import { describe, it, expect } from "vitest";
import { processInterviewTurn, getSession } from "./interviewEngine";
import candidatesData from "../../candidates.json";

describe("InterviewEngine Unit Tests", () => {
  const testCandidate = candidatesData.candidates[0];

  it("should initialize a new session", async () => {
    const sessionId = "unit-test-session-1";
    const res = await processInterviewTurn(sessionId, testCandidate);
    expect(res.done).toBe(false);
    expect(res.reply.length).toBeGreaterThan(10);
    expect(await getSession(sessionId)).toBeDefined();
  }, 15000);

  it("should accumulate turns and evaluate curriculum days", async () => {
    const sessionId = "unit-test-session-2";
    await processInterviewTurn(sessionId, testCandidate);

    for (let i = 1; i <= 7; i++) {
      const turn = await processInterviewTurn(sessionId, undefined, `In mission ${i}, I implemented similarity search and prompt engineering.`);
      expect(turn.done).toBe(false);
      expect(turn.reply).toBeDefined();
    }

    const finalTurn = await processInterviewTurn(sessionId, undefined, "Final turn answer wrapping up the interview.");
    expect(finalTurn.done).toBe(true);
    expect(finalTurn.feedback).toBeDefined();
    expect(finalTurn.feedback?.summary.length).toBeGreaterThan(10);
  }, 45000);
});
