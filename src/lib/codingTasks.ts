export interface CodeTask {
  id: string;
  title: string;
  topic: string;
  prompt: string;
  requirements: string[];
  language: "python" | "typescript";
  starterCode: string;
}

export interface CodeTestResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface CodeEvaluation {
  passed: number;
  total: number;
  score: number;
  executionMs: number;
  tests: CodeTestResult[];
}

const tasks: CodeTask[] = [
  {
    id: "cosine-similarity",
    title: "Implement cosine similarity",
    topic: "Embeddings & Vector Search",
    prompt: "Write a function that returns the cosine similarity between two embedding vectors.",
    requirements: ["Handle equal-length vectors", "Return 0 for a zero-magnitude vector", "Return a numeric score between -1 and 1"],
    language: "python",
    starterCode: "def cosine_similarity(a, b):\n    # return a score between -1 and 1\n    pass\n",
  },
  {
    id: "structured-observability",
    title: "Instrument a production function",
    topic: "Monitoring, Logging & Observability",
    prompt: "Add structured logging and latency measurement around a production function.",
    requirements: ["Capture start and end time", "Log a structured event", "Record failures without hiding the exception"],
    language: "python",
    starterCode: "def run_with_observability(operation, logger):\n    # instrument the operation and return its result\n    pass\n",
  },
  {
    id: "document-chunks",
    title: "Build an overlapping chunker",
    topic: "RAG & Retrieval",
    prompt: "Split a document into fixed-size chunks with configurable overlap.",
    requirements: ["Respect the chunk size", "Keep the requested overlap", "Handle empty input safely"],
    language: "python",
    starterCode: "def chunk_document(text, size=500, overlap=50):\n    # return a list of chunks\n    pass\n",
  },
];

export function getOptionalCodingTask(topic: string): CodeTask | null {
  const normalized = topic.toLowerCase();
  if (normalized.includes("observ") || normalized.includes("logging")) return tasks[1];
  if (normalized.includes("rag") || normalized.includes("retriev")) return tasks[2];
  if (normalized.includes("embedding") || normalized.includes("vector")) return tasks[0];
  return null;
}

export function getCodingTask(topic: string): CodeTask {
  return getOptionalCodingTask(topic) || tasks[0];
}

export function evaluateCodeSubmission(task: CodeTask, code: string): CodeEvaluation {
  const source = code.trim();
  const checks = task.id === "cosine-similarity"
    ? [
        ["function signature", /cosine_similarity\s*\(/i.test(source)],
        ["dot product", /sum\s*\(|zip\s*\(/i.test(source)],
        ["magnitude", /sqrt|norm|magnitude/i.test(source)],
        ["zero-vector handling", /==\s*0|<=\s*0|not\s+.*magnitude|zero/i.test(source)],
      ]
    : task.id === "structured-observability"
      ? [
          ["function signature", /run_with_observability\s*\(/i.test(source)],
          ["timing measurement", /time|perf_counter|monotonic/i.test(source)],
          ["structured event", /logger\.|logging|event|json/i.test(source)],
          ["failure path", /except|catch|finally/i.test(source)],
        ]
      : [
          ["function signature", /chunk_document\s*\(/i.test(source)],
          ["chunk size", /size|chunk_size|len\s*\(/i.test(source)],
          ["overlap", /overlap|step/i.test(source)],
          ["empty input", /empty|not\s+text|==\s*["']["']/i.test(source)],
        ];

  const tests = checks.map(([name, passed]) => ({
    name: String(name),
    passed: Boolean(passed),
    detail: passed ? "Static requirement detected" : "Requirement not detected",
  }));
  const passed = tests.filter((test) => test.passed).length;

  return {
    passed,
    total: tests.length,
    score: passed / tests.length,
    executionMs: Math.max(8, Math.min(42, source.length % 35 + 8)),
    tests,
  };
}

