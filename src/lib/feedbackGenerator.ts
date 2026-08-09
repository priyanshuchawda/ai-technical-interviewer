import { InterviewFeedback, InterviewSessionState, TopicMastery } from "../types/interview";
import { getCurriculumDay } from "./dataService";
import { displayFirstName } from "./pii";

/** Generates a concise hiring read from live answer and implementation evidence only. */
export function generateEvidenceBackedFeedback(session: InterviewSessionState): InterviewFeedback {
  const masteryEntries: TopicMastery[] = Array.from(session.masteryState.values());
  const strongTopics = masteryEntries.filter((mastery) => mastery.score >= 0.5 || mastery.lastOutcome === "strong");
  const weakTopics = masteryEntries.filter((mastery) => mastery.score < 0.5 || ["weak", "unknown", "off_topic"].includes(mastery.lastOutcome));

  const strengths: string[] = [];
  for (const mastery of strongTopics) {
    const topic = getCurriculumDay(mastery.day)?.title || mastery.topic;
    const concepts = mastery.demonstratedConcepts.slice(0, 3).join(", ") || "core technical implementation";
    strengths.push(topic + ": Demonstrated clear understanding of " + concepts + ".");
  }
  for (const evidence of session.codingEvidence || []) {
    if (evidence.passed === evidence.total) {
      strengths.push("Practical implementation: " + evidence.title + " passed all " + evidence.total + " deterministic checks.");
    }
  }
  if (strengths.length === 0) strengths.push("Limited evidence of strong technical mastery was demonstrated during the live interview.");

  const gaps: string[] = [];
  for (const mastery of weakTopics) {
    const topic = getCurriculumDay(mastery.day)?.title || mastery.topic;
    const missing = mastery.missingConcepts.slice(0, 3).join(", ") || "foundational principles";
    gaps.push(topic + ": Still unproven in " + missing + ".");
  }
  for (const evidence of session.codingEvidence || []) {
    if (evidence.passed < evidence.total) gaps.push("Practical implementation: " + evidence.title + " passed " + evidence.passed + " of " + evidence.total + " checks.");
  }
  if (gaps.length === 0) gaps.push("No major technical gaps were observed across the evaluated topics.");

  const next: string[] = [];
  for (const mastery of weakTopics) {
    const curriculumDay = getCurriculumDay(mastery.day);
    const topic = curriculumDay?.title || mastery.topic;
    const objective = curriculumDay?.objectives?.[0] || topic;
    next.push("Probe " + topic + " with a concrete scenario covering " + objective + ".");
  }
  if (next.length === 0) {
    next.push("Continue with a deeper systems-design interview focused on production trade-offs.");
    next.push("Test end-to-end reliability and evaluation decisions under realistic scale.");
  }

  const candidateName = displayFirstName(session.candidate);
  const summary = candidateName + " completed " + session.turnCount + " live technical response(s) across " + session.evaluatedDays.size + " focus area(s). The interview captured " + strongTopics.length + " strong topic signal(s) and " + weakTopics.length + " area(s) for further probing.";

  return { summary, strengths, gaps, next };
}
