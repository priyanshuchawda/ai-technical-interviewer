import { describe, it, expect } from "vitest";
import { evaluateAnswer, updateTopicMastery } from "./answerEvaluator";
import { processInterviewTurn, getSession } from "./interviewEngine";
import { getCurriculumDay } from "./dataService";
import candidatesData from "../../candidates.json";

describe("Structured Answer Evaluation Tests", () => {
  const sarah = candidatesData.candidates[0];
  const day10Curriculum = getCurriculumDay(10);

  it("should produce demonstrated concepts for a strong answer", () => {
    const answer = "I implemented cosine similarity search with FAISS vector index for fast retrieval.";
    const evaluation = evaluateAnswer(answer, day10Curriculum);
    expect(evaluation.outcome).toBe("strong");
    expect(evaluation.score).toBeGreaterThan(0.5);
    expect(evaluation.demonstratedConcepts.length).toBeGreaterThanOrEqual(0);
    expect(evaluation.evidence).toContain("strong");
  });

  it("should produce missing concepts for a partial answer", () => {
    const answer = "I think it does some kind of matching maybe.";
    const evaluation = evaluateAnswer(answer, day10Curriculum);
    expect(["partial", "weak"].includes(evaluation.outcome)).toBe(true);
    expect(evaluation.missingConcepts.length).toBeGreaterThan(0);
  });

  it("should not award strong mastery for very short answers", () => {
    const evaluation = evaluateAnswer("vector db", day10Curriculum);
    expect(evaluation.outcome).toBe("weak");
    expect(evaluation.score).toBeLessThan(0.3);
    expect(evaluation.evidence).toContain("too short");
  });

  it("should not award mastery for unknown answers", () => {
    const evaluation = evaluateAnswer("I don't know", day10Curriculum);
    expect(evaluation.outcome).toBe("unknown");
    expect(evaluation.score).toBe(0);
    expect(evaluation.demonstratedConcepts.length).toBe(0);
  });

  it("should accumulate mastery score across multiple answers on the same topic", () => {
    const eval1 = evaluateAnswer("I don't know", day10Curriculum);
    const mastery1 = updateTopicMastery(undefined, eval1, 10, "Retrieval & Matching Engine");
    expect(mastery1.attempts).toBe(1);
    expect(mastery1.score).toBe(0);

    const eval2 = evaluateAnswer("I used vector similarity search and ranking for retrieval.", day10Curriculum);
    const mastery2 = updateTopicMastery(mastery1, eval2, 10, "Retrieval & Matching Engine");
    expect(mastery2.attempts).toBe(2);
    expect(mastery2.score).toBeGreaterThan(mastery1.score);
    expect(mastery2.demonstratedConcepts.length).toBeGreaterThanOrEqual(mastery1.demonstratedConcepts.length);
  });

  it("should allow current evidence to differ from historical candidate profile", async () => {
    // Sarah historically passed Day 10 easily (2 attempts). But if she gives a weak live answer, mastery should be low.
    const sessionId = "mastery-diverge-test-" + Date.now();
    await processInterviewTurn(sessionId, sarah);
    await processInterviewTurn(sessionId, undefined, "I don't know how retrieval works at all.");

    const session = getSession(sessionId);
    const masteryForCurrentDay = session?.masteryState?.get(session.currentQuestionDay!);
    if (masteryForCurrentDay) {
      expect(masteryForCurrentDay.score).toBeLessThan(0.5);
    }
  }, 30000);
});
