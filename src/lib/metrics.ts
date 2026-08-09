type CounterName =
  | "interview.turns"
  | "interview.errors"
  | "interview.unauthorized"
  | "interview.rate_limited"
  | "interview.misconfigured"
  | "interview.duration_ms_sum"
  | "interview.duration_ms_count";

const counters = new Map<CounterName, number>();

function bump(name: CounterName, amount = 1): void {
  counters.set(name, (counters.get(name) || 0) + amount);
}

export function recordInterviewTurn(durationMs: number, ok: boolean): void {
  bump("interview.turns");
  bump("interview.duration_ms_sum", Math.max(0, Math.round(durationMs)));
  bump("interview.duration_ms_count");
  if (!ok) bump("interview.errors");
}

export function recordUnauthorized(): void {
  bump("interview.unauthorized");
}

export function recordRateLimited(): void {
  bump("interview.rate_limited");
}

export function recordMisconfigured(): void {
  bump("interview.misconfigured");
}

export function snapshotMetrics(): Record<string, number> {
  const turns = counters.get("interview.turns") || 0;
  const durationSum = counters.get("interview.duration_ms_sum") || 0;
  const durationCount = counters.get("interview.duration_ms_count") || 0;
  return {
    interview_turns_total: turns,
    interview_errors_total: counters.get("interview.errors") || 0,
    interview_unauthorized_total: counters.get("interview.unauthorized") || 0,
    interview_rate_limited_total: counters.get("interview.rate_limited") || 0,
    interview_misconfigured_total: counters.get("interview.misconfigured") || 0,
    interview_duration_ms_sum: durationSum,
    interview_duration_ms_count: durationCount,
    interview_duration_ms_avg: durationCount ? Math.round(durationSum / durationCount) : 0,
  };
}

export function renderPrometheusMetrics(): string {
  const snap = snapshotMetrics();
  return Object.entries(snap)
    .map(([key, value]) => `${key} ${value}`)
    .join("\n") + "\n";
}

export function resetMetrics(): void {
  counters.clear();
}
