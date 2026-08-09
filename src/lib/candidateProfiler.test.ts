import { describe, it, expect } from "vitest";
import { generateCandidateProfile } from "./candidateProfiler";
import candidatesData from "../../candidates.json";

describe("Candidate Intelligence Profiler Tests", () => {
  const candidates = candidatesData.candidates;
  const sarah = candidates[0]; // CAND-001 (Senior Data Engineer, 9 yrs)
  const alex = candidates[1];  // CAND-002 (Backend Software Engineer, 5 yrs)
  const david = candidates[3]; // CAND-004 (Business Analyst, 8 yrs, high attempts)

  it("should generate sensible profile signals for Sarah Johnson", () => {
    const profile = generateCandidateProfile(sarah);

    expect(profile.candidateId).toBe("CAND-001");
    expect(profile.candidateName).toBe("Sarah Johnson");
    expect(profile.seniorityContext).toContain("Senior / Principal");
    expect(profile.seniorityContext).toContain("9 yrs exp as Senior Data Engineer");

    // Sarah skipped Day 29
    expect(profile.skippedAreas).toContain("Day 29: Monitoring, Logging & Observability");
    
    // Sarah had high attempts on Prompt Engineering (4 attempts) & Docker (3 attempts)
    expect(profile.highAttemptTopics.some((t) => t.includes("Prompt Engineering"))).toBe(true);

    // Recommended focus areas should highlight skipped Day 29 first
    expect(profile.recommendedFocusAreas.length).toBeGreaterThan(0);
    expect(profile.recommendedFocusAreas[0].day).toBe(29);
  });

  it("should generate distinct profile signals for Alex Turner vs Sarah Johnson", () => {
    const sarahProfile = generateCandidateProfile(sarah);
    const alexProfile = generateCandidateProfile(alex);

    expect(alexProfile.candidateId).toBe("CAND-002");
    expect(alexProfile.seniorityContext).toContain("Mid-Senior Level");
    expect(alexProfile.seniorityContext).not.toEqual(sarahProfile.seniorityContext);

    // Alex has 0 skipped missions, Sarah has 1 skipped mission
    expect(alexProfile.skippedAreas.length).toBe(0);
    expect(sarahProfile.skippedAreas.length).toBe(1);

    // High attempt topics should differ
    expect(alexProfile.highAttemptTopics).not.toEqual(sarahProfile.highAttemptTopics);
  });

  it("should generate distinct profile signals for David Miller", () => {
    const davidProfile = generateCandidateProfile(david);

    expect(davidProfile.candidateId).toBe("CAND-004");
    expect(davidProfile.highAttemptTopics.length).toBeGreaterThan(3);
    expect(davidProfile.skippedAreas).toContain("Day 28: Docker & Kubernetes Deployment");
  });
});
