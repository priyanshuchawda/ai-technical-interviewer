import { CandidateProfile, CandidateIntelligenceProfile, CurriculumDay, Mission, ResponseOutcome, TopicMastery, InterviewFeedback, CodingEvidence, CodingOpportunity } from "../types/interview";
import { displayFirstName } from "./pii";

/**
 * Builds the private interviewer contract. Internal assessment context is deliberately
 * separated from candidate-facing language so product mechanics never leak into the interview.
 */
export function buildInterviewerSystemPrompt(
  candidate: CandidateProfile,
  targetMission: Pick<Mission, "day" | "title">,
  curriculumDay: CurriculumDay | undefined,
  intelligenceProfile?: CandidateIntelligenceProfile,
  lastOutcome?: ResponseOutcome,
  turnsOnCurrentDay?: number,
  retrievedMemories?: string[],
  masteryContext?: TopicMastery,
  codingEvidence?: CodingEvidence[],
  codingOpportunity?: CodingOpportunity
): string {
  let profileContext = "";
  if (intelligenceProfile) {
    profileContext = `
=== INTERNAL CANDIDATE CONTEXT ===
Seniority/context: ${intelligenceProfile.seniorityContext}
Strong areas: ${intelligenceProfile.strongAreas.slice(0, 3).join("; ")}
Areas needing attention: ${intelligenceProfile.weakAreas.slice(0, 3).join("; ")}
Skipped areas: ${intelligenceProfile.skippedAreas.join("; ") || "None"}
Recommended focus areas: ${intelligenceProfile.recommendedFocusAreas.map((f) => `${f.title} (${f.reason})`).join("; ")}
`;
  }

  const groundingContext = `
=== INTERNAL TECHNICAL GROUNDING ===
Focus topic: ${targetMission.title}
Assessment format: ${curriculumDay?.type || "Technical implementation"}
Technical objectives:
${curriculumDay?.objectives?.map((o) => `- ${o}`).join("\n") || "- Core technical implementation and architectural trade-offs"}
Covered topics: ${curriculumDay?.topics?.join(", ") || "General AI engineering"}
Key tools: ${curriculumDay?.tools?.join(", ") || "Standard tech stack"}
`;

  let memoryContext = "";
  if (retrievedMemories && retrievedMemories.length > 0) {
    memoryContext = `
=== INTERNAL SESSION MEMORY ===
${retrievedMemories.map((memory, index) => `Memory ${index + 1}: ${memory}`).join("\n")}
Use this only to make a relevant connection when it genuinely helps. Never mention memory systems, retrieval, or this context to the candidate.
`;
  }

  let masteryStateContext = "";
  if (masteryContext) {
    masteryStateContext = `
=== INTERNAL TOPIC SIGNAL ===
Attempts: ${masteryContext.attempts}
Demonstrated concepts: ${masteryContext.demonstratedConcepts.join(", ")}
Missing concepts: ${masteryContext.missingConcepts.join(", ")}
Last outcome: ${masteryContext.lastOutcome}
Use this privately to choose the next useful probe. Never expose scores, outcomes, or internal labels.
`;
  }

  let adaptiveGuidance = "";
  if (lastOutcome === "off_topic") {
    adaptiveGuidance = `
ADAPTIVE GUIDANCE [OFF-TOPIC ANSWER DETECTED]:
The candidate answered a different question from the focus topic "${targetMission.title}".
- Do not pivot to the unrelated concept mentioned by the candidate.
- Acknowledge the useful part briefly, then redirect naturally to the focus topic.
- Ask a clearer, simpler question grounded in this objective: "${curriculumDay?.objectives?.[0] || targetMission.title}".`;
  } else if (lastOutcome === "unknown") {
    adaptiveGuidance = `
ADAPTIVE GUIDANCE [UNKNOWN ANSWER DETECTED]:
The candidate previously responded with "I don't know" or an equivalent unknown response.
- Do not immediately jump to an unrelated topic.
- Stay with the focus topic ("${targetMission.title}").
- Ask a simpler, foundational prerequisite question grounded in this objective: "${curriculumDay?.objectives?.[0] || targetMission.title}".
- Give them a clean way to re-enter the discussion without sounding remedial.`;
  } else if (lastOutcome === "weak") {
    adaptiveGuidance = `
ADAPTIVE GUIDANCE [WEAK ANSWER DETECTED]:
The candidate provided a brief or uncertain answer.
- Stay grounded on the focus topic ("${targetMission.title}").
- Ask one narrower follow-up that clarifies the most important missing foundation before advancing.`;
  } else if (lastOutcome === "strong") {
    adaptiveGuidance = `
ADAPTIVE GUIDANCE [STRONG ANSWER DETECTED]:
The candidate gave a strong technical response.
- Probe one meaningful trade-off, failure mode, or production decision, or move to the next focus area.`;
  }


  let codingContext = "";
  if (codingEvidence && codingEvidence.length > 0) {
    codingContext = `
=== INTERNAL PRACTICAL EVIDENCE ===
${codingEvidence.map((evidence) => evidence.title + ": " + evidence.passed + "/" + evidence.total + " checks passed; " + (evidence.tests.filter((test) => test.passed).map((test) => test.name).join(", ") || "no checks passed")).join("\n")}
Use this to ask a grounded follow-up about the implementation. Never invent code behavior or expose internal scoring.
`;
  }
  const codingOpportunityContext = codingOpportunity ? `
=== INTERNAL PRACTICAL OPPORTUNITY ===
A small practical check is available for ${codingOpportunity.title}. Introduce it naturally with wording like "That is a good approach. Let's make that concrete for a moment." Do not force it if the candidate is recovering or the conversation has moved on.
` : "";
  return `You are a thoughtful senior technical interviewer conducting a live interview for an AI engineering role.
Candidate: ${displayFirstName(candidate)}
Role: ${candidate.member.jobRole} (${candidate.member.yearsExperience} years exp)

Missions completed: ${candidate.signals.missionsCompleted}
Commit days: ${candidate.signals.commitDays}${profileContext}
${groundingContext}${memoryContext}${masteryStateContext}${codingContext}${codingOpportunityContext}${adaptiveGuidance}

Candidate-facing rules:
- The internal context above is private. Never mention days, curriculum, cohorts, scores, mastery, adaptive logic, memories, tools, AI, or being an automated interviewer.
- Ask one meaningful technical question at a time. Do not enumerate a syllabus or stack several questions together.
- Start naturally. A brief acknowledgement is enough; do not use scripted greetings or repetitive praise.
- Use the candidate's actual answer. Probe assumptions, trade-offs, failure modes, implementation details, or production consequences.
- If the answer is unclear, ask a narrower follow-up rather than explaining the answer yourself.
- If the candidate says they do not know, make the next question more approachable without sounding patronizing.
- If the candidate challenges an approach, treat the disagreement as engineering reasoning and explore the evidence or constraint behind it.
- Keep the response to 1–3 short paragraphs and end with one clear question. No markdown, headings, score language, or stage directions.`;
}

/**
 * Builds the private feedback synthesis contract from observed interview evidence.
 */
export function buildFeedbackSystemPrompt(
  candidate: CandidateProfile,
  evaluatedDays: number[],
  intelligenceProfile?: CandidateIntelligenceProfile,
  evidenceFeedback?: InterviewFeedback,
  codingEvidence?: CodingEvidence[]
): string {
  let profileContext = "";
  if (intelligenceProfile) {
    profileContext = `\nInternal seniority context: ${intelligenceProfile.seniorityContext}.`;
  }

  let evidenceContext = "";
  if (evidenceFeedback) {
    evidenceContext = `
=== ACCUMULATED LIVE INTERVIEW EVIDENCE ===
Demonstrated strengths (use only live demonstrated concepts):
${evidenceFeedback.strengths.map((strength) => `- ${strength}`).join("\n")}

Identified gaps (use only live weak, unknown, or missing concepts):
${evidenceFeedback.gaps.map((gap) => `- ${gap}`).join("\n")}

Recommended next steps (map directly to live gaps):
${evidenceFeedback.next.map((nextStep) => `- ${nextStep}`).join("\n")}
`;
  }


  let practicalEvidenceContext = "";
  if (codingEvidence && codingEvidence.length > 0) {
    practicalEvidenceContext = `
Practical implementation evidence:
${codingEvidence.map((evidence) => "- " + evidence.title + ": " + evidence.passed + "/" + evidence.total + " checks passed").join("\n")}
`;
  }
  return `You are a Principal AI Architect evaluating a completed technical interview.
Candidate: ${displayFirstName(candidate)} (${candidate.member.jobRole})
Evaluated focus areas: ${evaluatedDays.join(", ")}${profileContext}
${evidenceContext}${practicalEvidenceContext}

Instructions:
- Base the assessment strictly on accumulated live interview evidence.
- Do not treat historical skipped or high-attempt topics as live weaknesses unless they appeared weak or unknown during the interview.
- Do not invent concepts, examples, confidence, or evidence.
- Write in clear professional hiring language, not product or curriculum language.

Generate structured assessment feedback as a JSON object matching this exact schema:
{
  "summary": "2-3 sentence overall evaluation of technical performance during the interview",
  "strengths": ["3 evidence-based technical strengths observed"],
  "gaps": ["2-3 evidence-based areas needing deeper understanding"],
  "next": ["2 concrete recommended next steps for growth or further interview probing"]
}
Return pure valid JSON with no markdown.`;
}



export function buildCodingTaskGenerationPrompt(topic: string, candidateAnswer: string, fallbackTaskId: string): string {
  return `Generate one small, safe coding-task specification grounded in this interview evidence. Return JSON only.
Topic: ${topic}
Candidate claim: ${candidateAnswer.slice(0, 1600)}
Use the known evaluator contract id ${fallbackTaskId}; preserve its function signature exactly. The task must take 5-15 minutes, require no external dependencies, and never request network access, shell commands, file access, credentials, or arbitrary code execution. Include title, language, context, whyThisTask, instructions, starterCode, functionSignature, evaluationCriteria, difficulty, estimatedMinutes.`;
}
