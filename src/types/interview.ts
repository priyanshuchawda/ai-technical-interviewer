export interface Mission {
  day: number;
  title: string;
  passed?: boolean;
  skipped?: boolean;
  attempts?: number;
}

export interface CandidateMember {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  status: string;
}

export interface CandidateSignals {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
}

export interface CandidateProfile {
  member: CandidateMember;
  missions: Mission[];
  signals: CandidateSignals;
}

export interface CandidateIntelligenceProfile {
  candidateId: string;
  candidateName: string;
  seniorityContext: string;
  strongAreas: string[];
  weakAreas: string[];
  skippedAreas: string[];
  highAttemptTopics: string[];
  recommendedFocusAreas: Array<{
    day: number;
    title: string;
    reason: string;
  }>;
}

export type ResponseOutcome = "strong" | "partial" | "weak" | "unknown" | "off_topic";

export interface CurriculumDay {
  day: number;
  title: string;
  type: string;
  tools?: string[];
  topics?: string[];
  objectives?: string[];
}

export interface CurriculumModule {
  n: number;
  title: string;
  days: number[];
}

export interface Curriculum {
  cohort: string;
  modules: CurriculumModule[];
  days: CurriculumDay[];
}

export interface InterviewFeedback {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
}

export interface AnswerEvaluation {
  outcome: ResponseOutcome;
  score: number; // 0 to 1
  demonstratedConcepts: string[];
  missingConcepts: string[];
  evidence: string;
}

export interface TopicMastery {
  day: number;
  topic: string;
  score: number; // running average
  attempts: number;
  demonstratedConcepts: string[];
  missingConcepts: string[];
  lastOutcome: ResponseOutcome;
}

export interface InterviewIntelligenceState {
  currentDay: number;
  currentTopic: string;
  progress: {
    turnCount: number;
    totalTurns: number;
    evaluatedDaysCount: number;
  };
  difficultyState: string;
  focusAreas: Array<{
    day: number;
    title: string;
    reason: string;
  }>;
  masteryScores: Array<{
    day: number;
    topic: string;
    score: number;
    attempts: number;
    lastOutcome: ResponseOutcome;
  }>;
  latestEvaluation?: AnswerEvaluation;
  whyThisQuestion: string;
  adaptiveDecision?: { label: string; detail: string };
}

export interface InterviewStartRequest {
  sessionId: string;
  candidate: CandidateProfile;
}

export interface InterviewTurnRequest {
  sessionId: string;
  message: string;
}

export type InterviewRequest = InterviewStartRequest | InterviewTurnRequest;

export interface InterviewStartResponse {
  reply: string;
  done: false;
  intelligence?: InterviewIntelligenceState;
}

export interface InterviewTurnResponse {
  reply: string;
  done: false;
  intelligence?: InterviewIntelligenceState;
}

export interface InterviewEndResponse {
  reply: string;
  done: true;
  feedback: InterviewFeedback;
  intelligence?: InterviewIntelligenceState;
}

export type InterviewResponse = InterviewStartResponse | InterviewTurnResponse | InterviewEndResponse;

export interface InterviewSessionState {
  sessionId: string;
  candidate: CandidateProfile;
  turnCount: number;
  evaluatedDays: Set<number>;
  history: Array<{ role: "interviewer" | "candidate"; content: string }>;
  currentQuestionDay?: number;
  turnsOnCurrentDay?: number;
  lastOutcome?: ResponseOutcome;
  done: boolean;
  feedback?: InterviewFeedback;
  intelligenceProfile?: CandidateIntelligenceProfile;
  masteryState: Map<number, TopicMastery>;
  latestEvaluation?: AnswerEvaluation;
  adaptiveDecision?: { label: string; detail: string };
}
