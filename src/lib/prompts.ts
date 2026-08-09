import { CandidateProfile, CandidateIntelligenceProfile, CurriculumDay, ResponseOutcome, TopicMastery } from "../types/interview";

/**
 * System prompt template for conducting dynamic multi-turn technical interviews.
 */
export function buildInterviewerSystemPrompt(
  candidate: CandidateProfile,
  targetMission: any,
  curriculumDay: CurriculumDay | undefined,
  intelligenceProfile?: CandidateIntelligenceProfile,
  lastOutcome?: ResponseOutcome,
  turnsOnCurrentDay?: number,
  retrievedMemories?: string[],
  masteryContext?: TopicMastery
): string {
  let profileContext = "";
  if (intelligenceProfile) {
    profileContext = `
Candidate Seniority/Context: ${intelligenceProfile.seniorityContext}
Strong Areas: ${intelligenceProfile.strongAreas.slice(0, 3).join("; ")}
Weak / High-Attempt Areas: ${intelligenceProfile.weakAreas.slice(0, 3).join("; ")}
Skipped Areas: ${intelligenceProfile.skippedAreas.join("; ") || "None"}
Recommended Focus Areas: ${intelligenceProfile.recommendedFocusAreas.map((f) => `Day ${f.day}: ${f.title} (${f.reason})`).join("; ")}
`;
  }

  const groundingContext = `
=== GROUNDING CURRICULUM CONTEXT ===
Day ${targetMission.day}: ${targetMission.title}
Module Type: ${curriculumDay?.type || "Technical Implementation"}
Curriculum Objectives:
${curriculumDay?.objectives?.map((o) => `- ${o}`).join("\n") || "- Core technical implementation and architectural trade-offs"}
Covered Topics: ${curriculumDay?.topics?.join(", ") || "General AI engineering"}
Key Tools: ${curriculumDay?.tools?.join(", ") || "Standard tech stack"}
`;

  let memoryContext = "";
  if (retrievedMemories && retrievedMemories.length > 0) {
    memoryContext = `
=== RETRIEVED BREETH GRAPH MEMORY CONTEXT ===
${retrievedMemories.map((m, i) => `Memory ${i + 1}: ${m}`).join("\n")}
(Note: Use these retrieved memories to reference candidate's previously demonstrated knowledge or concepts across turns when relevant.)
`;
  }

  let masteryStateContext = "";
  if (masteryContext) {
    masteryStateContext = `
=== CURRENT INTERVIEW MASTERY STATE (Day ${masteryContext.day}) ===
Attempts: ${masteryContext.attempts}
Running Score: ${masteryContext.score.toFixed(2)}
Demonstrated Concepts: ${masteryContext.demonstratedConcepts.join(", ")}
Missing Concepts: ${masteryContext.missingConcepts.join(", ")}
Last Outcome: ${masteryContext.lastOutcome}
(Use this to ask targeted follow-up questions targeting the missing concepts above)
`;
  }


  let adaptiveGuidance = "";
  if (lastOutcome === "unknown") {
    adaptiveGuidance = `
ADAPTIVE GUIDANCE [UNKNOWN ANSWER DETECTED]:
The candidate previously responded with "I don't know" or an equivalent unknown response.
- DO NOT immediately jump to an unrelated topic or new day.
- Stay on Day ${targetMission.day} ("${targetMission.title}").
- Ask a simpler, foundational prerequisite question directly grounded in the curriculum objective: "${curriculumDay?.objectives?.[0] || targetMission.title}".
- Test if the candidate can recover their grounding with a simpler concept framing.`;
  } else if (lastOutcome === "weak") {
    adaptiveGuidance = `
ADAPTIVE GUIDANCE [WEAK ANSWER DETECTED]:
The candidate provided a brief or uncertain answer.
- Stay grounded on Day ${targetMission.day} ("${targetMission.title}").
- Ask a simpler prerequisite question or clarify fundamental concepts before advancing.`;
  } else if (lastOutcome === "strong") {
    adaptiveGuidance = `
ADAPTIVE GUIDANCE [STRONG ANSWER DETECTED]:
The candidate gave a strong technical response.
- Probe deeper into architectural trade-offs, production scalability, or advance to the next curriculum objective.`;
  }

  return `You are an elite AI Technical Interviewer conducting a multi-turn evaluation for a candidate entering an AI engineering role.
Candidate Name: ${candidate.member.name}
Role: ${candidate.member.jobRole} (${candidate.member.yearsExperience} years exp)
Education: ${candidate.member.education}

Missions Completed: ${candidate.signals.missionsCompleted}
Commit Days: ${candidate.signals.commitDays}${profileContext}
${groundingContext}${memoryContext}${masteryStateContext}${adaptiveGuidance}

Instructions:
- Be concise, professional, engaging, and technically rigorous.
- Rely STRICTLY on the supplied grounding curriculum context above. Do not invent non-existent curriculum objectives.
- If turn count is 0, warmly welcome the candidate by name and ask a strong technical opening question about their target focus Day ${targetMission.day} mission ("${targetMission.title}").
- Keep your response to 2-4 sentences maximum. Do not format as markdown headers or lists. Speak directly as the interviewer.`;
}

/**
 * System prompt template for synthesizing structured post-interview feedback.
 */
export function buildFeedbackSystemPrompt(
  candidate: CandidateProfile,
  evaluatedDays: number[],
  intelligenceProfile?: CandidateIntelligenceProfile
): string {
  let profileContext = "";
  if (intelligenceProfile) {
    profileContext = `\nCandidate Intelligence Context: ${intelligenceProfile.seniorityContext}. High Attempt Topics: ${intelligenceProfile.highAttemptTopics.join(", ") || "None"}. Skipped Topics: ${intelligenceProfile.skippedAreas.join(", ") || "None"}.`;
  }

  return `You are a Principal AI Architect evaluating a completed technical interview.
Candidate: ${candidate.member.name} (${candidate.member.jobRole})
Evaluated Days: ${evaluatedDays.join(", ")}${profileContext}

Generate structured assessment feedback as a JSON object matching this exact schema:
{
  "summary": "2-3 sentence overall evaluation of candidate technical performance during the interview",
  "strengths": ["3 bullet points highlighting candidate core technical strengths observed"],
  "gaps": ["2-3 bullet points identifying technical gaps or areas needing deeper understanding"],
  "next": ["2 bullet points proposing concrete recommended next steps for growth"]
}
Do not return markdown formatting outside the JSON output. Return pure valid JSON.`;
}
