import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreaker } from "./circuitBreaker";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(2, 1000);
  });

  it("opens after the failure threshold and fail-fasts", () => {
    expect(breaker.canRequest(0)).toBe(true);
    breaker.recordFailure(0);
    expect(breaker.canRequest(0)).toBe(true);
    breaker.recordFailure(0);
    expect(breaker.canRequest(0)).toBe(false);
    expect(breaker.getState(0)).toBe("open");
  });

  it("half-opens after cooldown and closes on success", () => {
    breaker.recordFailure(0);
    breaker.recordFailure(0);
    expect(breaker.getState(1000)).toBe("half_open");
    breaker.recordSuccess();
    expect(breaker.getState(1001)).toBe("closed");
    expect(breaker.canRequest(1001)).toBe(true);
  });
});
