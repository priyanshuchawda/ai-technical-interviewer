import { estimateTokens } from "./textStats";

export type HistoryItem = { role: "interviewer" | "candidate"; content: string };

export function compactHistory(
  history: HistoryItem[],
  options: { maxTokens?: number; maxTurns?: number } = {}
): HistoryItem[] {
  const maxTokens = options.maxTokens ?? 2500;
  const maxTurns = options.maxTurns ?? 8;
  const recent = history.slice(-maxTurns);
  const kept: HistoryItem[] = [];
  let used = 0;

  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const item = recent[i];
    const cost = estimateTokens(item.content);
    if (kept.length > 0 && used + cost > maxTokens) break;
    kept.unshift(item);
    used += cost;
  }

  return kept;
}
