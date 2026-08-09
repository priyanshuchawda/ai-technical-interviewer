import { describe, it, expect } from "vitest";
import { displayFirstName } from "./pii";
import candidatesData from "../../candidates.json";

describe("displayFirstName", () => {
  it("returns only the first name", () => {
    expect(displayFirstName(candidatesData.candidates[0])).toBe("Sarah");
  });
});
