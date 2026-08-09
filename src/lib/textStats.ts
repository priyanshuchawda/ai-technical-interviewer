const STOP_WORDS = new Set([
  "the", "and", "for", "with", "using", "how", "what", "that", "this", "from",
  "into", "your", "were", "have", "has", "had", "are", "was", "been", "being",
]);

export function normalizeToken(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.endsWith("ings") && w.length > 6) w = w.slice(0, -4);
  else if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("es") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("s") && w.length > 3) w = w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,/:&()\-_.]+/)
    .map(normalizeToken)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

export function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return freq;
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function jaccard(a: Iterable<string>, b: Iterable<string>): number {
  const left = new Set(a);
  const right = new Set(b);
  if (left.size === 0 && right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function overlapCount(a: Iterable<string>, b: Set<string>): number {
  let count = 0;
  for (const token of a) {
    if (b.has(token)) count += 1;
  }
  return count;
}

/**
 * IDF-weighted overlap between a query and a document.
 * idf(t) = log((N + 1) / (df(t) + 1)) + 1
 */
export function idfWeightedOverlap(
  queryTokens: string[],
  documentTokens: string[],
  documentFrequencies: Map<string, number>,
  documentCount: number
): number {
  if (queryTokens.length === 0 || documentTokens.length === 0) return 0;
  const docSet = new Set(documentTokens);
  let score = 0;
  let maxScore = 0;
  const seen = new Set<string>();
  for (const token of queryTokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    const df = documentFrequencies.get(token) || 0;
    const idf = Math.log((documentCount + 1) / (df + 1)) + 1;
    maxScore += idf;
    if (docSet.has(token)) score += idf;
  }
  return maxScore === 0 ? 0 : score / maxScore;
}
