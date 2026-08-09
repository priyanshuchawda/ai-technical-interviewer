import { CandidateProfile } from "../types/interview";

export function displayFirstName(candidate: CandidateProfile): string {
  const first = candidate.member.name.trim().split(/\s+/)[0];
  return first || candidate.member.id;
}
