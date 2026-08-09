import { describe, it, expect } from "vitest";
import { scoringFixtures } from "./scoring.fixtures";
import { classifyResponseOutcome } from "../responseClassifier";
import { evaluateAnswer } from "../answerEvaluator";
import { getCurriculumDay } from "../dataService";

describe("golden scoring fixtures", () => {
  for (const fixture of scoringFixtures) {
    it(`classifies ${fixture.label} as ${fixture.expectedOutcome}`, () => {
      const day = getCurriculumDay(fixture.day);
      const outcome = classifyResponseOutcome(fixture.answer, day);
      expect(outcome).toBe(fixture.expectedOutcome);
      const evaluation = evaluateAnswer(fixture.answer, day);
      expect(evaluation.outcome).toBe(fixture.expectedOutcome);
      if (fixture.expectedOutcome === "off_topic" || fixture.expectedOutcome === "unknown") {
        expect(evaluation.score).toBe(0);
      }
      if (fixture.expectedOutcome === "strong") {
        expect(evaluation.score).toBeGreaterThan(0.5);
      }
    });
  }
});
