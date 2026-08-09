import { ResponseOutcome } from "../types/interview";

const UNKNOWN_PATTERNS = [
  "i don't know",
  "dont know",
  "don't know",
  "no idea",
  "nope",
  "not sure",
  "no clue",
  "idk",
  "pass",
  "have no idea",
  "unfamiliar",
  "not familiar",
  "can't recall",
  "cant recall",
];

const WEAK_PATTERNS = [
  "maybe",
  "i think",
  "guess",
  "not completely sure",
  "sort of",
  "kind of",
];

export function classifyResponseOutcome(message?: string): ResponseOutcome {
  if (!message || !message.trim()) {
    return "unknown";
  }

  const lower = message.trim().toLowerCase();

  // Check unknown pattern match
  if (UNKNOWN_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return "unknown";
  }

  // Check weak pattern match or extremely brief answer
  if (WEAK_PATTERNS.some((pattern) => lower.includes(pattern)) || lower.length < 15) {
    return "weak";
  }

  // Check strong response indicators
  const words = lower.split(/\s+/);
  const technicalKeywords = [
    "vector", "embedding", "pipeline", "latency", "rag", "mcp", "docker",
    "kubernetes", "api", "architecture", "prompt", "memory", "agent",
    "retrieval", "database", "index", "scaling", "observability", "metrics"
  ];

  const hasTechnicalTerm = technicalKeywords.some((term) => lower.includes(term));

  if (words.length >= 15 || (words.length >= 8 && hasTechnicalTerm)) {
    return "strong";
  }

  return "partial";
}
