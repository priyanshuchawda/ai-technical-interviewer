import { CandidateProfile, CandidateIntelligenceProfile } from "../types/interview";
import { getCurriculumDay } from "./dataService";

/**
 * Generates a deterministic candidate intelligence profile from candidate data.
 * Always resolves canonical curriculum day titles via getCurriculumDay(day).
 */
export function generateCandidateProfile(candidate: CandidateProfile): CandidateIntelligenceProfile {
  const { member, missions } = candidate;

  // Helper to get canonical title for any mission day
  const getCanonicalTitle = (m: { day: number; title: string }) => {
    const cDay = getCurriculumDay(m.day);
    return cDay?.title || m.title;
  };

  // 1. Calculate Seniority / Context
  let seniorityBand = "Junior / Entry Level";
  if (member.yearsExperience >= 8) {
    seniorityBand = "Senior / Principal";
  } else if (member.yearsExperience >= 4) {
    seniorityBand = "Mid-Senior Level";
  }
  const seniorityContext = `${seniorityBand} (${member.yearsExperience} yrs exp as ${member.jobRole}, ${member.education})`;

  // 2. Identify Mission Categories
  const passedMissions = missions.filter((m) => m.passed === true);
  const failedMissions = missions.filter((m) => m.passed === false && !m.skipped);
  const skippedMissions = missions.filter((m) => m.skipped === true);
  const highAttemptMissions = missions.filter((m) => (m.attempts || 0) >= 3);

  // 3. Strong Areas: Passed missions with low attempts (1 or 2)
  const strongAreas: string[] = passedMissions
    .filter((m) => (m.attempts || 1) <= 2)
    .map((m) => `Day ${m.day}: ${getCanonicalTitle(m)}`);

  // 4. Weak Areas: Failed missions or missions requiring high attempts (>= 3)
  const weakAreas: string[] = [
    ...failedMissions.map((m) => `Day ${m.day}: ${getCanonicalTitle(m)} (Failed)`),
    ...highAttemptMissions.map((m) => `Day ${m.day}: ${getCanonicalTitle(m)} (${m.attempts} attempts required)`),
  ];

  // 5. Skipped / Unknown Areas
  const skippedAreas: string[] = skippedMissions.map((m) => `Day ${m.day}: ${getCanonicalTitle(m)}`);

  // 6. High Attempt Topics
  const highAttemptTopics: string[] = highAttemptMissions.map(
    (m) => `Day ${m.day}: ${getCanonicalTitle(m)} (${m.attempts} attempts)`
  );

  // 7. Recommended Focus Areas for Adaptive Interviewer
  const recommendedFocusAreas: Array<{ day: number; title: string; reason: string }> = [];

  // Priority 1: Skipped missions (Unassessed potential gaps)
  for (const m of skippedMissions) {
    recommendedFocusAreas.push({
      day: m.day,
      title: getCanonicalTitle(m),
      reason: "Skipped mission during cohort; needs direct knowledge evaluation.",
    });
  }

  // Priority 2: High attempt / failed missions (Identified struggles)
  for (const m of [...failedMissions, ...highAttemptMissions]) {
    if (!recommendedFocusAreas.some((f) => f.day === m.day)) {
      recommendedFocusAreas.push({
        day: m.day,
        title: getCanonicalTitle(m),
        reason: `Required ${m.attempts || "multiple"} attempts during cohort; evaluate depth & resilience.`,
      });
    }
  }

  // Priority 3: Core passed missions (Verify hands-on competency)
  for (const m of passedMissions) {
    if (!recommendedFocusAreas.some((f) => f.day === m.day)) {
      recommendedFocusAreas.push({
        day: m.day,
        title: getCanonicalTitle(m),
        reason: "Passed mission; assess architectural trade-offs and best practices.",
      });
    }
  }

  return {
    candidateId: member.id,
    candidateName: member.name,
    seniorityContext,
    strongAreas,
    weakAreas,
    skippedAreas,
    highAttemptTopics,
    recommendedFocusAreas: recommendedFocusAreas.slice(0, 5),
  };
}
