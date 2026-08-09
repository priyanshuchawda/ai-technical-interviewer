import { describe, it, expect } from "vitest";
import { ErrorCode } from "./errorCodes";

describe("ErrorCode contract", () => {
  it("keeps stable public API error codes", () => {
    expect(ErrorCode).toMatchSnapshot();
    expect(Object.values(ErrorCode).every((code) => code.startsWith("INTERVIEW_"))).toBe(true);
  });
});
