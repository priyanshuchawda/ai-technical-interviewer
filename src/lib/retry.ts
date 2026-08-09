export function backoffDelay(
  attempt: number,
  baseMs = 200,
  maxMs = 4000,
  random: () => number = Math.random
): number {
  const exponential = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = exponential * 0.3 * (random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
}

export async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    baseMs?: number;
    maxMs?: number;
    shouldRetry?: (error: unknown) => boolean;
    random?: () => number;
  } = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  const shouldRetry = options.shouldRetry ?? (() => true);
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) throw error;
      await sleep(backoffDelay(attempt, options.baseMs, options.maxMs, options.random));
    }
  }
  throw lastError;
}
