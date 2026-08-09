import { describe, it, expect } from "vitest";
import { estimateTokens, idfWeightedOverlap, jaccard, tokenize } from "./textStats";

describe("textStats", () => {
  it("tokenizes and drops stopwords", () => {
    expect(tokenize("Using the vector database for retrieval")).toEqual([
      "vector",
      "database",
      "retrieval",
    ]);
  });

  it("computes Jaccard overlap", () => {
    expect(jaccard(["logging", "metrics"], ["logging", "metrics", "grafana"])).toBeCloseTo(2 / 3);
    expect(jaccard(["embeddings"], ["logging"])).toBe(0);
  });

  it("weights rare terms higher in IDF overlap", () => {
    const df = new Map([
      ["logging", 10],
      ["prometheus", 1],
      ["the", 20],
    ]);
    const query = ["prometheus", "logging"];
    const rare = idfWeightedOverlap(query, ["prometheus", "other"], df, 20);
    const common = idfWeightedOverlap(query, ["logging", "other"], df, 20);
    expect(rare).toBeGreaterThan(common);
  });

  it("estimates tokens from character length", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
  });
});
