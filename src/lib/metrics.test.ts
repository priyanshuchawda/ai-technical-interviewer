import { describe, it, expect, beforeEach } from "vitest";
import {
  recordInterviewTurn,
  recordRateLimited,
  recordUnauthorized,
  renderPrometheusMetrics,
  resetMetrics,
  snapshotMetrics,
} from "./metrics";

describe("metrics", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("tracks turn latency and denial counters", () => {
    recordInterviewTurn(120, true);
    recordInterviewTurn(80, false);
    recordUnauthorized();
    recordRateLimited();
    const snap = snapshotMetrics();
    expect(snap.interview_turns_total).toBe(2);
    expect(snap.interview_errors_total).toBe(1);
    expect(snap.interview_unauthorized_total).toBe(1);
    expect(snap.interview_rate_limited_total).toBe(1);
    expect(snap.interview_duration_ms_avg).toBe(100);
    expect(renderPrometheusMetrics()).toContain("interview_turns_total 2");
  });
});
