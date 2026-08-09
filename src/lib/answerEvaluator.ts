import { AnswerEvaluation, CurriculumDay } from "../types/interview";
import { classifyResponseOutcome } from "./responseClassifier";

/**
 * Deterministically evaluates a candidate answer against curriculum day objectives.
 * Does NOT call any external API - derived from the response text and curriculum context.
 */
export function evaluateAnswer(
  answer: string,
  curriculumDay: CurriculumDay | undefined
): AnswerEvaluation {
  const outcome = classifyResponseOutcome(answer, curriculumDay);
  const lowerAnswer = answer.toLowerCase().trim();

  const objectives = curriculumDay?.objectives ?? [];
  const topics = curriculumDay?.topics ?? [];
  const tools = curriculumDay?.tools ?? [];

  const allConcepts = [...objectives, ...topics, ...tools];

  // If off_topic: 0 score, 0 demonstrated concepts for current topic
  if (outcome === "off_topic") {
    const missingConcepts = allConcepts.filter((c) => c.length < 80);
    const evidence = `Response discussed an unrelated topic, but the current question tested Day ${curriculumDay?.day || ""}: ${curriculumDay?.title || "current topic"}.`;
    return {
      outcome,
      score: 0.0,
      demonstratedConcepts: [],
      missingConcepts,
      evidence,
    };
  }

  // Map curriculum concepts to keywords that would appear in a candidate answer
  const demonstratedConcepts: string[] = [];
  const missingConcepts: string[] = [];

  for (const concept of allConcepts) {
    const keywords = concept.toLowerCase().split(/[\s,&]+/).filter((w) => w.length > 4);
    const mentioned = keywords.some((kw) => lowerAnswer.includes(kw));
    if (mentioned) {
      demonstratedConcepts.push(concept);
    } else if (concept.length < 80) { // skip overly long objectives from missing list
      missingConcepts.push(concept);
    }
  }

  // Score calculation: base on outcome + concept coverage
  let baseScore: number;
  switch (outcome) {
    case "strong": baseScore = 0.8; break;
    case "partial": baseScore = 0.5; break;
    case "weak": baseScore = 0.2; break;
    case "unknown": baseScore = 0.0; break;
  }

  const conceptCoverage = allConcepts.length > 0
    ? demonstratedConcepts.length / allConcepts.length
    : 0;

  // Weighted: 70% outcome, 30% concept coverage
  const score = Math.min(1, parseFloat((baseScore * 0.7 + conceptCoverage * 0.3).toFixed(2)));

  // Evidence: concise summary
  let evidence = "";
  if (outcome === "unknown") {
    evidence = "Candidate indicated no knowledge of this topic.";
  } else if (outcome === "weak") {
    evidence = `Candidate gave a brief/uncertain answer. Demonstrated ${demonstratedConcepts.length} of ${allConcepts.length} expected concepts.`;
  } else if (outcome === "partial") {
    evidence = `Candidate showed partial understanding. Demonstrated: ${demonstratedConcepts.slice(0, 2).join(", ") || "some familiarity"}.`;
  } else {
    evidence = `Candidate gave a strong answer demonstrating: ${demonstratedConcepts.slice(0, 3).join(", ") || "core concepts"}.`;
  }

  return { outcome, score, demonstratedConcepts, missingConcepts, evidence };
}

/**
 * Merges a new evaluation into existing mastery state for a topic.
 * Running average score, accumulated concepts.
 */
export function updateTopicMastery(
  existing: { score: number; attempts: number; demonstratedConcepts: string[]; missingConcepts: string[] } | undefined,
  evaluation: AnswerEvaluation,
  day: number,
  topic: string
): import("../types/interview").TopicMastery {
  const prevAttempts = existing?.attempts ?? 0;
  const prevScore = existing?.score ?? 0;
  const newAttempts = prevAttempts + 1;

  // Running weighted average: new answers get slightly more weight
  const newScore = parseFloat(((prevScore * prevAttempts + evaluation.score) / newAttempts).toFixed(2));

  // Accumulate demonstrated concepts (deduplicated)
  const accumulated = Array.from(new Set([
    ...(existing?.demonstratedConcepts ?? []),
    ...evaluation.demonstratedConcepts,
  ]));

  // Missing = original missing minus now-demonstrated
  const stillMissing = evaluation.missingConcepts.filter((c) => !accumulated.includes(c));

  return {
    day,
    topic,
    score: newScore,
    attempts: newAttempts,
    demonstratedConcepts: accumulated,
    missingConcepts: stillMissing,
    lastOutcome: evaluation.outcome,
  };
}
