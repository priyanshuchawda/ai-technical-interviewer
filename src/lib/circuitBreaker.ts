export type CircuitState = "closed" | "open" | "half_open";

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: CircuitState = "closed";

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 15_000
  ) {}

  getState(now = Date.now()): CircuitState {
    if (this.state === "open" && now - this.openedAt >= this.cooldownMs) {
      this.state = "half_open";
    }
    return this.state;
  }

  canRequest(now = Date.now()): boolean {
    return this.getState(now) !== "open";
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  recordFailure(now = Date.now()): void {
    this.failures += 1;
    if (this.state === "half_open" || this.failures >= this.failureThreshold) {
      this.state = "open";
      this.openedAt = now;
    }
  }

  reset(): void {
    this.failures = 0;
    this.openedAt = 0;
    this.state = "closed";
  }
}

export const llmCircuit = new CircuitBreaker();
