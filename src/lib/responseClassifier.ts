import { ResponseOutcome, CurriculumDay } from "../types/interview";
import { curriculum } from "./dataService";
import { jaccard } from "./textStats";

const UNKNOWN_PATTERNS = [
  "i don't know",
  "dont know",
  "don't know",
  "no idea",
  "nope",
  "not sure",
  "no clue",
  "idk",
  "pass",
  "have no idea",
  "unfamiliar",
  "not familiar",
  "can't recall",
  "cant recall",
];

const WEAK_PATTERNS = [
  "maybe",
  "i think",
  "guess",
  "not completely sure",
  "sort of",
  "kind of",
];

function normalizeWord(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.endsWith("ings")) w = w.slice(0, -4);
  else if (w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.endsWith("es") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("s") && w.length > 3) w = w.slice(0, -1);
  return w;
}

// Helper: extract relevant technical keywords for a specific curriculum day
function getDayKeywords(day?: CurriculumDay): Set<string> {
  const set = new Set<string>();
  if (!day) return set;

  const sources = [
    day.title,
    ...(day.topics || []),
    ...(day.tools || []),
    ...(day.objectives || []),
  ];

  const stopWords = new Set(["the", "and", "for", "with", "using", "how", "what", "day", "type", "core", "into", "from", "that", "this", "your", "were"]);

  for (const source of sources) {
    const tokens = source.toLowerCase().split(/[\s,/:&()\-_.]+/);
    for (const token of tokens) {
      if (token.length >= 3 && !stopWords.has(token)) {
        set.add(normalizeWord(token));
      }
    }
  }

  return set;
}

// Helper: extract technical keywords for all OTHER curriculum days
function getOtherDaysKeywords(currentDayNumber?: number): Set<string> {
  const set = new Set<string>();
  const allDays = curriculum.days;

  for (const day of allDays) {
    if (day.day === currentDayNumber) continue;

    const dayKeywords = getDayKeywords(day);
    for (const kw of dayKeywords) {
      set.add(kw);
    }
  }

  return set;
}

export function classifyResponseOutcome(
  message?: string,
  curriculumDay?: CurriculumDay
): ResponseOutcome {
  if (!message || !message.trim()) {
    return "unknown";
  }

  const lower = message.trim().toLowerCase();

  // 1. Check unknown pattern match
  if (UNKNOWN_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return "unknown";
  }

  // 2. Relevance Check against Curriculum Day
  if (curriculumDay) {
    const currentKeywords = getDayKeywords(curriculumDay);
    const otherKeywords = getOtherDaysKeywords(curriculumDay.day);

    const words = lower.split(/[\s,/:&()\-_.]+/).filter((w) => w.length >= 3).map(normalizeWord);

    // Count matches
    const currentHits = words.filter((w) => currentKeywords.has(w));
    const otherHits = words.filter((w) => otherKeywords.has(w) && !currentKeywords.has(w));

    // If answer contains technical concepts from other topics BUT zero matches with current topic objectives/title/tools
    if (currentHits.length === 0 && otherHits.length > 0) {
      return "off_topic";
    }

    const currentJaccard = jaccard(words, currentKeywords);
    const otherJaccard = jaccard(words, otherKeywords);
    if (otherJaccard >= 0.08 && currentJaccard < 0.03) {
      return "off_topic";
    }
  }

  // 3. Check weak pattern match or extremely brief answer
  if (WEAK_PATTERNS.some((pattern) => lower.includes(pattern)) || lower.length < 15) {
    return "weak";
  }

  // 4. Check strong response indicators
  const words = lower.split(/\s+/);
  const technicalKeywords = [
    "vector", "embedding", "pipeline", "latency", "rag", "mcp", "docker",
    "kubernetes", "api", "architecture", "prompt", "memory", "agent",
    "retrieval", "database", "index", "scaling", "observability", "metrics", "log", "logging"
  ];

  const hasTechnicalTerm = technicalKeywords.some((term) => lower.includes(term));

  if (words.length >= 15 || (words.length >= 8 && hasTechnicalTerm)) {
    return "strong";
  }

  return "partial";
}
