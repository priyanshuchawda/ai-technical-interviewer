import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const pageSource = readFileSync(path.resolve(__dirname, "../app/page.tsx"), "utf8");

const requiredCopy = [
  "Autonomous Interviewer",
  "Start interview",
  "Assessment",
  "8 questions",
  "Candidate",
  "Your Response",
  "Type your technical response",
  "⌘/Ctrl Enter to submit",
  "Submit →",
  "Cancel",
  "Technical assessment complete",
  "What stood out",
  "Areas to probe",
  "Recommended follow-through",
  "Interview Plan",
  "Thinking through that",
  "Open coding task",
  "Speak",
];

describe("interview UI copy", () => {
  it("keeps required user-visible strings in the page", () => {
    for (const snippet of requiredCopy) {
      expect(pageSource, `missing UI copy: ${snippet}`).toContain(snippet);
    }
  });

  it("snapshots the required copy list", () => {
    expect(requiredCopy).toMatchSnapshot();
  });
});
