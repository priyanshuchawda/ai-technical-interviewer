import { describe, it, expect } from "vitest";
import { classifyResponseOutcome } from "./responseClassifier";
import { evaluateAnswer } from "./answerEvaluator";
import { processInterviewTurn } from "./interviewEngine";
import { getCurriculumDay } from "./dataService";
import candidatesData from "../../candidates.json";

describe("Relevance-First Answer Evaluation & Off-Topic Prevention Tests", () => {
  const sarah = candidatesData.candidates[0];
  const day29Logging = getCurriculumDay(29); // Monitoring, Logging & Observability
  const day7Embeddings = getCurriculumDay(7); // Text Embeddings & Vector Search

  it("[REGRESSION TEST] logging question + embeddings answer => off_topic", () => {
    const embeddingsAnswer = "Embeddings convert text into numerical vectors using cosine similarity search with FAISS.";
    const outcome = classifyResponseOutcome(embeddingsAnswer, day29Logging);

    expect(outcome).toBe("off_topic");

    const evaluation = evaluateAnswer(embeddingsAnswer, day29Logging);
    expect(evaluation.outcome).toBe("off_topic");
    expect(evaluation.score).toBe(0);
    expect(evaluation.demonstratedConcepts.length).toBe(0);
    expect(evaluation.evidence).toContain("unrelated topic");
  });

  it("off_topic answer does not increase logging mastery", () => {
    const embeddingsAnswer = "Embeddings convert text into numerical vectors using cosine similarity search with FAISS.";
    const evaluation = evaluateAnswer(embeddingsAnswer, day29Logging);

    expect(evaluation.score).toBe(0);
    expect(evaluation.demonstratedConcepts).toEqual([]);
  });

  it("off_topic answer does not switch the interview to embeddings topic", async () => {
    const sessionId = "offtopic-stay-test-" + Date.now();

    // Init session for Sarah (starts on Day 29 - Monitoring/Logging)
    const initResult = await processInterviewTurn(sessionId, sarah);
    expect(initResult.intelligence?.currentDay).toBe(29);

    // Turn 1: Candidate gives off-topic embeddings answer
    const turn1Result = await processInterviewTurn(
      sessionId,
      undefined,
      "Embeddings convert text into numerical vectors using FAISS and cosine similarity."
    );

    // Interview MUST stay on Day 29 and set difficultyState to "Redirecting / Off-Topic"
    expect(turn1Result.intelligence?.currentDay).toBe(29);
    expect(turn1Result.intelligence?.latestEvaluation?.outcome).toBe("off_topic");
    expect(turn1Result.intelligence?.difficultyState).toBe("Redirecting / Off-Topic");
    expect(turn1Result.intelligence?.whyThisQuestion).toContain("Candidate gave an off-topic response");
  }, 15000);

  it("relevant strong logging answer => strong", () => {
    const loggingAnswer = "I implemented structured logging using Python structlog to log JSON metrics for request tracing and latency monitoring.";
    const outcome = classifyResponseOutcome(loggingAnswer, day29Logging);

    expect(outcome).toBe("strong");

    const evaluation = evaluateAnswer(loggingAnswer, day29Logging);
    expect(evaluation.outcome).toBe("strong");
    expect(evaluation.score).toBeGreaterThan(0.5);
    expect(evaluation.demonstratedConcepts.length).toBeGreaterThan(0);
  });

  it("relevant partial logging answer => partial or weak", () => {
    const partialAnswer = "I guess logging is used for checking errors.";
    const outcome = classifyResponseOutcome(partialAnswer, day29Logging);

    expect(["partial", "weak"].includes(outcome)).toBe(true);
  });

  it("relevant unknown answer => unknown", () => {
    const unknownAnswer = "I don't know how to implement structured logging.";
    const outcome = classifyResponseOutcome(unknownAnswer, day29Logging);

    expect(outcome).toBe("unknown");
  });

  it("relevant embeddings answer to embeddings question (Day 7) => strong", () => {
    const embeddingsAnswer = "Embeddings convert text into numerical vectors using FAISS and cosine similarity search.";
    const outcome = classifyResponseOutcome(embeddingsAnswer, day7Embeddings);

    expect(outcome).toBe("strong");
  });
});
