import { InterviewFeedback, InterviewSessionState, TopicMastery } from "../types/interview";
import { getCurriculumDay } from "./dataService";
import { displayFirstName } from "./pii";

/**
 * Deterministically generates evidence-backed feedback strictly from live interview evaluation state.
 * Always maps day numbers to canonical curriculum titles via getCurriculumDay(day).
 */
export function generateEvidenceBackedFeedback(session: InterviewSessionState): InterviewFeedback {
  const candidate = session.candidate;
  const masteryEntries: TopicMastery[] = Array.from(session.masteryState.values());

  const strongTopics = masteryEntries.filter((m) => m.score >= 0.5 || m.lastOutcome === "strong");
  const weakTopics = masteryEntries.filter((m) => m.score < 0.5 || m.lastOutcome === "weak" || m.lastOutcome === "unknown" || m.lastOutcome === "off_topic");

  // 1. STRENGTHS (Only live demonstrated concepts from interview)
  const strengths: string[] = [];
  for (const m of strongTopics) {
    const canonicalTitle = getCurriculumDay(m.day)?.title || m.topic;
    const conceptsText = m.demonstratedConcepts.length > 0
      ? m.demonstratedConcepts.join(", ")
      : "core technical implementation";
    strengths.push(`Day ${m.day} (${canonicalTitle}): Demonstrated clear understanding of ${conceptsText}.`);
  }

  if (strengths.length === 0) {
    strengths.push("Insufficient evidence of strong technical concept mastery demonstrated during live interview turns.");
  }

  // 2. GAPS (Only live weak/unknown/missing concepts from interview)
  const gaps: string[] = [];
  for (const m of weakTopics) {
    const canonicalTitle = getCurriculumDay(m.day)?.title || m.topic;
    const missingText = m.missingConcepts.length > 0
      ? m.missingConcepts.slice(0, 3).join(", ")
      : "foundational principles";
    gaps.push(`Day ${m.day} (${canonicalTitle}): Struggled with key concepts (${missingText}) during live evaluation.`);
  }

  if (gaps.length === 0) {
    gaps.push("No major technical gaps observed across evaluated interview modules.");
  }

  // 3. NEXT (Actionable recommendations mapped directly to live gaps)
  const next: string[] = [];
  for (const m of weakTopics) {
    const curriculumDay = getCurriculumDay(m.day);
    const canonicalTitle = curriculumDay?.title || m.topic;
    const keyObjective = curriculumDay?.objectives?.[0] || canonicalTitle;
    next.push(`Review Day ${m.day} (${canonicalTitle}) curriculum module focusing on ${keyObjective}.`);
  }

  if (next.length === 0) {
    next.push("Advance to senior AI system architecture challenges, multi-agent orchestration, and production deployment.");
    next.push("Practice explaining end-to-end evaluation metrics (Ragas, TruLens) in enterprise environments.");
  }

  // 4. SUMMARY (Concise assessment of demonstrated performance)
  const summary = `${displayFirstName(candidate)} completed a multi-turn technical evaluation covering ${session.evaluatedDays.size} curriculum days. Demonstrated technical proficiency across ${strongTopics.length} topic(s) and identified ${weakTopics.length} area(s) needing further depth.`;

  return {
    summary,
    strengths,
    gaps,
    next,
  };
}
