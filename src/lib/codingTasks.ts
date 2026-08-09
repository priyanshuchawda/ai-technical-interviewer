import { z } from "zod";

export interface CodeTask {
  id: string;
  title: string;
  topic: string;
  prompt: string;
  requirements: string[];
  language: "python" | "typescript";
  starterCode: string;
  context: string;
  whyThisTask: string;
  functionSignature: string;
  evaluationCriteria: string[];
  difficulty: "basic" | "intermediate" | "advanced";
  estimatedMinutes: number;
}

export interface GeneratedCodingTask {
  id?: string;
  title: string;
  language: "python" | "javascript" | "typescript";
  context: string;
  whyThisTask: string;
  instructions: string[];
  starterCode: string;
  functionSignature: string;
  evaluationCriteria: string[];
  difficulty: "basic" | "intermediate" | "advanced";
  estimatedMinutes: number;
}

export const generatedCodingTaskSchema = z.object({
  id: z.string().max(80).optional(),
  title: z.string().min(3).max(140),
  language: z.enum(["python", "javascript", "typescript"]),
  context: z.string().min(10).max(700),
  whyThisTask: z.string().min(10).max(500),
  instructions: z.array(z.string().min(3).max(240)).min(1).max(6),
  starterCode: z.string().max(12000),
  functionSignature: z.string().min(3).max(240),
  evaluationCriteria: z.array(z.string().min(3).max(180)).min(1).max(6),
  difficulty: z.enum(["basic", "intermediate", "advanced"]),
  estimatedMinutes: z.number().int().min(5).max(15),
});

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
    context: "You described normalized vectors and similarity search in the interview.",
    whyThisTask: "You mentioned cosine similarity; a small implementation will make that reasoning concrete.",
    functionSignature: "cosine_similarity(a, b)",
    evaluationCriteria: ["Compute the dot product", "Handle vector magnitude", "Return 0 for a zero vector"],
    difficulty: "basic",
    estimatedMinutes: 5,
    requirements: ["Handle equal-length vectors", "Return 0 for a zero-magnitude vector", "Return a numeric score between -1 and 1"],
    language: "python",
    starterCode: "def cosine_similarity(a, b):\n    # return a score between -1 and 1\n    pass\n",
  },
  {
    id: "structured-observability",
    title: "Instrument a production function",
    topic: "Monitoring, Logging & Observability",
    prompt: "Add structured logging and latency measurement around a production function.",
    context: "You described structured logs, correlation IDs, and latency tracking for a production request.",
    whyThisTask: "You made a practical observability claim; a small implementation will show how you would instrument it.",
    functionSignature: "run_with_observability(operation, logger)",
    evaluationCriteria: ["Measure execution time", "Emit a structured event", "Preserve failures"],
    difficulty: "intermediate",
    estimatedMinutes: 8,
    requirements: ["Capture start and end time", "Log a structured event", "Record failures without hiding the exception"],
    language: "python",
    starterCode: "def run_with_observability(operation, logger):\n    # instrument the operation and return its result\n    pass\n",
  },
  {
    id: "document-chunks",
    title: "Build an overlapping chunker",
    topic: "RAG & Retrieval",
    prompt: "Split a document into fixed-size chunks with configurable overlap.",
    context: "You described chunking and overlap as part of a retrieval pipeline.",
    whyThisTask: "You mentioned overlap; implementing a small chunker will validate the boundary behavior.",
    functionSignature: "chunk_document(text, size=500, overlap=50)",
    evaluationCriteria: ["Respect chunk size", "Preserve overlap", "Handle empty input"],
    difficulty: "basic",
    estimatedMinutes: 7,
    requirements: ["Respect the chunk size", "Keep the requested overlap", "Handle empty input safely"],
    language: "python",
    starterCode: "def chunk_document(text, size=500, overlap=50):\n    # return a list of chunks\n    pass\n",
  },
];

export function validateGeneratedCodingTask(value: unknown): GeneratedCodingTask | null {
  const parsed = generatedCodingTaskSchema.safeParse(value);
  if (!parsed.success || !parsed.data.starterCode.includes(parsed.data.functionSignature.split("(")[0])) return null;
  return parsed.data;
}

export function getOpportunisticCodingTask(topic: string, outcome: string, demonstratedConcepts: string[], priorAssessments: number): CodeTask | null {
  if (priorAssessments >= 1 || outcome !== "strong") return null;
  if (demonstratedConcepts.length < 1) return null;
  return getOptionalCodingTask(topic);
}

export function resolveGeneratedCodingTask(value: unknown): CodeTask | null {
  const generated = validateGeneratedCodingTask(value);
  if (!generated) return null;
  const known = generated.id ? getCodingTaskById(generated.id) : null;
  if (!known || known.functionSignature !== generated.functionSignature) return null;
  return {
    ...known,
    title: generated.title,
    prompt: generated.instructions.join(" "),
    context: generated.context,
    whyThisTask: generated.whyThisTask,
    starterCode: generated.starterCode,
    requirements: generated.evaluationCriteria,
    language: generated.language === known.language ? generated.language : known.language,
    difficulty: generated.difficulty,
    estimatedMinutes: generated.estimatedMinutes,
  };
}

export function getOptionalCodingTask(topic: string): CodeTask | null {
  const normalized = topic.toLowerCase();
  if (normalized.includes("observ") || normalized.includes("logging")) return tasks[1];
  if (normalized.includes("rag") || normalized.includes("retriev")) return tasks[2];
  if (normalized.includes("embedding") || normalized.includes("vector")) return tasks[0];
  return null;
}

export function getCodingTaskById(taskId: string): CodeTask | null {
  return tasks.find((task) => task.id === taskId) || null;
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

