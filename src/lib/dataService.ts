import curriculumData from "../../curriculum.json";
import candidatesData from "../../candidates.json";
import { Curriculum, CurriculumDay, CandidateProfile } from "../types/interview";

export const curriculum: Curriculum = curriculumData as Curriculum;
export const candidateProfiles: CandidateProfile[] = (candidatesData as { candidates: CandidateProfile[] }).candidates;

export function getCurriculumDay(dayNumber: number): CurriculumDay | undefined {
  return curriculum.days.find((d) => d.day === dayNumber);
}

export function getCandidateById(candidateId: string): CandidateProfile | undefined {
  return candidateProfiles.find((c) => c.member.id === candidateId);
}

/**
 * Returns list of curriculum days that candidate completed or skipped, with priority details.
 */
export function getCandidateFocusAreas(candidate: CandidateProfile) {
  const completedMissions = candidate.missions.filter((m) => m.passed);
  const skippedMissions = candidate.missions.filter((m) => m.skipped);
  const highAttemptMissions = candidate.missions.filter((m) => (m.attempts || 0) > 2);

  return {
    completedMissions,
    skippedMissions,
    highAttemptMissions,
    availableDays: candidate.missions.map((m) => m.day),
  };
}
