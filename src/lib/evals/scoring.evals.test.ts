import { describe, it, expect } from "vitest";
import { scoringFixtures } from "./scoring.fixtures";
import { classifyResponseOutcome } from "../responseClassifier";
import { evaluateAnswer } from "../answerEvaluator";
import { getCurriculumDay } from "../dataService";

describe("golden scoring fixtures", () => {
  for (const fixture of scoringFixtures) {
    it(`classifies ${fixture.label} as ${fixture.expectedOutcome}`, () => {
      const day = getCurriculumDay(fixture.day);
      expect(day).toBeDefined();
      const outcome = classifyResponseOutcome(fixture.answer, day);
      expect(outcome).toBe(fixture.expectedOutcome);
      const evaluation = evaluateAnswer(fixture.answer, day);
      expect(evaluation.outcome).toBe(fixture.expectedOutcome);
      if ("maxScore" in fixture && fixture.maxScore !== undefined) {
        expect(evaluation.score).toBeLessThanOrEqual(fixture.maxScore);
      }
      if ("minScore" in fixture && fixture.minScore !== undefined) {
        expect(evaluation.score).toBeGreaterThanOrEqual(fixture.minScore);
      }
    });
  }
});
