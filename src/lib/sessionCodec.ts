import { InterviewSessionState, TopicMastery } from "../types/interview";

export type SerializedSession = Omit<InterviewSessionState, "evaluatedDays" | "masteryState"> & {
  evaluatedDays: number[];
  masteryState: Array<[number, TopicMastery]>;
};

export function serializeSession(session: InterviewSessionState): SerializedSession {
  return {
    ...session,
    evaluatedDays: Array.from(session.evaluatedDays),
    masteryState: Array.from(session.masteryState.entries()),
  };
}

export function deserializeSession(raw: SerializedSession): InterviewSessionState {
  return {
    ...raw,
    evaluatedDays: new Set(raw.evaluatedDays || []),
    masteryState: new Map(raw.masteryState || []),
  };
}

export function encodeSession(session: InterviewSessionState): string {
  return JSON.stringify(serializeSession(session));
}

export function decodeSession(json: string): InterviewSessionState | null {
  try {
    const parsed = JSON.parse(json) as SerializedSession;
    if (!parsed || typeof parsed.sessionId !== "string") return null;
    return deserializeSession(parsed);
  } catch {
    return null;
  }
}
