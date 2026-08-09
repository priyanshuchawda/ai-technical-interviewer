import { overlapCount, tokenize } from "./textStats";

export function rankMemorySnippets(query: string, snippets: string[], limit = 3): string[] {
  const queryTokens = new Set(tokenize(query));
  return [...snippets]
    .map((snippet) => ({
      snippet,
      score: overlapCount(tokenize(snippet), queryTokens),
    }))
    .sort((a, b) => b.score - a.score || b.snippet.length - a.snippet.length)
    .slice(0, limit)
    .map((item) => item.snippet)
    .filter((snippet) => snippet.trim().length > 0);
}
