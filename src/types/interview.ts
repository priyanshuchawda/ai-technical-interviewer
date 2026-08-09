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
}

export interface InterviewTurnResponse {
  reply: string;
  done: false;
}

export interface InterviewEndResponse {
  reply: string;
  done: true;
  feedback: InterviewFeedback;
}

export type InterviewResponse = InterviewStartResponse | InterviewTurnResponse | InterviewEndResponse;

export interface InterviewSessionState {
  sessionId: string;
  candidate: CandidateProfile;
  turnCount: number;
  evaluatedDays: Set<number>;
  history: Array<{ role: "interviewer" | "candidate"; content: string }>;
  currentQuestionDay?: number;
  done: boolean;
  feedback?: InterviewFeedback;
}
