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


function hasContrastingKnowledge(lower: string): boolean {
  return /\b(but|however|although|i'd|i would|i've|i have\s+(used|worked|implemented|experience|seen)|probably|likely)\b/.test(lower);
}

function isClarificationRequest(lower: string): boolean {
  return /\b(can you|could you|would you|please)\s+(give|share|show|provide|clarify)\b/.test(lower) || /^(example|clarify|clarification)[?!. ]*$/.test(lower);
}
export function classifyResponseOutcome(
  message?: string,
  curriculumDay?: CurriculumDay
): ResponseOutcome {
  if (!message || !message.trim()) {
    return "unknown";
  }

  const lower = message.trim().toLowerCase();

  // 1. Separate explicit lack of knowledge from qualified uncertainty.
  const containsUnknownPhrase = UNKNOWN_PATTERNS.some((pattern) => lower.includes(pattern));
  if (containsUnknownPhrase && !hasContrastingKnowledge(lower)) {
    return "unknown";
  }
  if (isClarificationRequest(lower) && !containsUnknownPhrase) {
    return "partial";
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

  // 3. Treat a bare hedge as weak, but do not downgrade a substantive uncertain answer.
  const bareUncertainty = /^(maybe|i think|guess|not completely sure|sort of|kind of)[.! ]*$/.test(lower);
  if (bareUncertainty || lower.length < 15) {
    return "weak";
  }
  const qualifiedUncertainty = /\b(maybe|i think|guess|not completely sure|sort of|kind of)\b/.test(lower);
  if (qualifiedUncertainty) {
    return /\b(would|probably|use|using|implement|implemented|build|built|design|designed|because|but|however)\b/.test(lower) ? "partial" : "weak";
  }
  if (/\b(have not used|haven\x27t used|not familiar with|unfamiliar with)\b/.test(lower) && hasContrastingKnowledge(lower)) {
    return "partial";
  }

  // 4. Check strong response indicators
  const words = lower.split(/\s+/);
  const technicalKeywords = [
    "vector", "embedding", "pipeline", "latency", "rag", "mcp", "docker",
    "kubernetes", "api", "architecture", "prompt", "memory", "agent",
    "retrieval", "database", "index", "scaling", "observability", "metrics", "log", "logging", "trace", "traces", "counter", "counters", "dashboard", "dashboards", "failure", "failures", "request", "requests", "prometheus", "opentelemetry", "structured"
  ];

  const hasTechnicalTerm = technicalKeywords.some((term) => lower.includes(term));

  if (words.length >= 15 || (words.length >= 8 && hasTechnicalTerm)) {
    return "strong";
  }

  return "partial";
}
