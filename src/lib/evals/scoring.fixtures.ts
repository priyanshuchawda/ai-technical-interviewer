export const scoringFixtures = [
  {
    label: "off_topic_embeddings_on_logging",
    day: 29,
    answer: "Embeddings convert text into numerical vectors using cosine similarity search with FAISS.",
    expectedOutcome: "off_topic",
  },
  {
    label: "strong_logging",
    day: 29,
    answer: "I implemented structured logging using Python structlog to log JSON metrics for request tracing and latency monitoring.",
    expectedOutcome: "strong",
  },
  {
    label: "unknown_logging",
    day: 29,
    answer: "I don't know how to implement structured logging.",
    expectedOutcome: "unknown",
  },
  {
    label: "weak_logging",
    day: 29,
    answer: "I guess logging is used for checking errors.",
    expectedOutcome: "weak",
  },
  {
    label: "strong_retrieval",
    day: 10,
    answer: "I implemented cosine similarity search with FAISS vector index for fast retrieval.",
    expectedOutcome: "strong",
  },
] as const;
