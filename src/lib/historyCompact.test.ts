import { describe, it, expect } from "vitest";
import { compactHistory } from "./historyCompact";

describe("compactHistory", () => {
  it("keeps the most recent turns within the token budget", () => {
    const history = [
      { role: "interviewer" as const, content: "Q1 ".repeat(40) },
      { role: "candidate" as const, content: "A1 ".repeat(40) },
      { role: "interviewer" as const, content: "Q2 recent question" },
      { role: "candidate" as const, content: "A2 recent answer" },
    ];
    const compact = compactHistory(history, { maxTokens: 20, maxTurns: 8 });
    expect(compact.at(-1)?.content).toContain("recent answer");
    expect(compact.length).toBeLessThan(history.length);
  });

  it("never drops the newest message even if it is large", () => {
    const history = [{ role: "candidate" as const, content: "x".repeat(400) }];
    const compact = compactHistory(history, { maxTokens: 10 });
    expect(compact).toHaveLength(1);
  });
});
