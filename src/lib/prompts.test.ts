import { describe, it, expect } from "vitest";
import { buildFeedbackSystemPrompt, buildInterviewerSystemPrompt } from "./prompts";
import { generateCandidateProfile } from "./candidateProfiler";
import { getCurriculumDay } from "./dataService";
import candidatesData from "../../candidates.json";

describe("interviewer prompts", () => {
  const sarah = candidatesData.candidates[0];
  const profile = generateCandidateProfile(sarah);
  const day29 = getCurriculumDay(29);

  it("grounds the opening prompt and uses first name only", () => {
    const prompt = buildInterviewerSystemPrompt(
      sarah,
      { day: 29, title: "Monitoring, Logging & Observability" },
      day29,
      profile
    );
    expect(prompt).toContain("Candidate: Sarah");
    expect(prompt).not.toContain("Sarah Johnson");
    expect(prompt).toContain("INTERNAL TECHNICAL GROUNDING");
    expect(prompt).toContain("Focus topic: Monitoring, Logging & Observability");
    expect(prompt).toContain("Never mention days, curriculum, cohorts, scores, mastery, adaptive logic, memories, tools, AI");
    expect(prompt).toContain("Monitoring, Logging & Observability");
    expect(prompt).toMatchSnapshot();
  });

  it("adds off-topic redirect guidance without pivoting", () => {
    const prompt = buildInterviewerSystemPrompt(
      sarah,
      { day: 29, title: "Monitoring, Logging & Observability" },
      day29,
      profile,
      "off_topic"
    );
    expect(prompt).toContain("OFF-TOPIC ANSWER DETECTED");
    expect(prompt).toContain("Do not pivot");
    expect(prompt).toContain("redirect naturally to the focus topic");
    expect(prompt).toMatchSnapshot();
  });

  it("builds feedback prompt from live evidence only", () => {
    const prompt = buildFeedbackSystemPrompt(
      sarah,
      [29, 12],
      profile,
      {
        summary: "Solid logging, weak prompting.",
        strengths: ["Day 29 (Monitoring, Logging & Observability): Demonstrated structured logging."],
        gaps: ["Day 12 (Prompt Engineering Fundamentals): Struggled with few-shot prompts."],
        next: ["Review Day 12 (Prompt Engineering Fundamentals)."],
      }
    );
    expect(prompt).toContain("Candidate: Sarah");
    expect(prompt).not.toContain("Sarah Johnson");
    expect(prompt).toContain("ACCUMULATED LIVE INTERVIEW EVIDENCE");
    expect(prompt).toContain("Do not treat historical skipped");
    expect(prompt).toMatchSnapshot();
  });
});
