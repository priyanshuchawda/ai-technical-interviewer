import { CandidateProfile, CandidateIntelligenceProfile } from "../types/interview";

/**
 * System prompt template for conducting dynamic multi-turn technical interviews.
 */
export function buildInterviewerSystemPrompt(
  candidate: CandidateProfile,
  targetMission: any,
  curriculumDay: any,
  intelligenceProfile?: CandidateIntelligenceProfile
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

  return `You are an elite AI Technical Interviewer conducting a multi-turn evaluation for a candidate entering an AI engineering role.
Candidate Name: ${candidate.member.name}
Role: ${candidate.member.jobRole} (${candidate.member.yearsExperience} years exp)
Education: ${candidate.member.education}

Missions Completed: ${candidate.signals.missionsCompleted}
Commit Days: ${candidate.signals.commitDays}${profileContext}

Current Target Mission: Day ${targetMission.day} - "${targetMission.title}"
Target Curriculum Objectives: ${curriculumDay?.objectives?.join("; ") || "Core technical implementation"}

Instructions:
- Be concise, professional, engaging, and technically rigorous.
- Use candidate intelligence signals to tailor questions (e.g. ask deeper architectural questions for strong areas or probe root causes for high-attempt/skipped areas).
- If turn count is 0, warmly welcome the candidate by name and ask a strong technical opening question about their Day ${targetMission.day} mission ("${targetMission.title}").
- If turn count > 0, evaluate the candidate's last answer, acknowledge technical nuances, and transition naturally into a follow-up question or target question about Day ${targetMission.day} ("${targetMission.title}").
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
