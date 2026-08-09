import { describe, it, expect } from "vitest";
import { getCurriculumDay, getCandidateById, getCandidateFocusAreas } from "./dataService";
import candidatesData from "../../candidates.json";

describe("DataService Tests", () => {
  it("should retrieve curriculum day details by day number", () => {
    const day = getCurriculumDay(7);
    expect(day).toBeDefined();
    expect(day?.title).toBe("Embeddings Explained");
  });

  it("should return undefined for invalid curriculum day", () => {
    const day = getCurriculumDay(999);
    expect(day).toBeUndefined();
  });

  it("should retrieve candidate profile by ID", () => {
    const candidate = getCandidateById("CAND-001");
    expect(candidate).toBeDefined();
    expect(candidate?.member.name).toBe("Sarah Johnson");
  });

  it("should correctly extract focus areas for a candidate", () => {
    const candidate = candidatesData.candidates[0];
    const focusAreas = getCandidateFocusAreas(candidate);
    expect(focusAreas.availableDays.length).toBeGreaterThan(0);
    expect(focusAreas.completedMissions.length).toBeGreaterThan(0);
  });
});
