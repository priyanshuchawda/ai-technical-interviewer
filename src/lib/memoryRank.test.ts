import { describe, it, expect } from "vitest";
import { rankMemorySnippets } from "./memoryRank";

describe("rankMemorySnippets", () => {
  it("ranks snippets with more query overlap first", () => {
    const ranked = rankMemorySnippets(
      "prometheus metrics latency logging",
      [
        "Candidate discussed embeddings and chunking.",
        "Candidate used Prometheus metrics to track API latency.",
        "Unrelated note about docker only.",
      ],
      2
    );
    expect(ranked[0]).toContain("Prometheus");
    expect(ranked).toHaveLength(2);
  });
});
