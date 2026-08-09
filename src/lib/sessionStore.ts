import { InterviewSessionState } from "../types/interview";

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_SESSIONS = 500;

type SessionEntry = {
  session: InterviewSessionState;
  expiresAt: number;
};

const sessions = new Map<string, SessionEntry>();

export function getSessionTtlMs(): number {
  const raw = Number(process.env.SESSION_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MS;
}

export function getMaxSessions(): number {
  const raw = Number(process.env.MAX_SESSIONS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_SESSIONS;
}

export function pruneExpiredSessions(now = Date.now()): number {
  let removed = 0;
  for (const [id, entry] of sessions) {
    if (entry.expiresAt <= now) {
      sessions.delete(id);
      removed += 1;
    }
  }
  return removed;
}

function touch(sessionId: string, session: InterviewSessionState, now = Date.now()) {
  sessions.set(sessionId, {
    session,
    expiresAt: now + getSessionTtlMs(),
  });
}

export function getSession(sessionId: string): InterviewSessionState | undefined {
  pruneExpiredSessions();
  const entry = sessions.get(sessionId);
  if (!entry) return undefined;
  touch(sessionId, entry.session);
  return entry.session;
}

export function saveSession(session: InterviewSessionState): void {
  pruneExpiredSessions();
  if (!sessions.has(session.sessionId) && sessions.size >= getMaxSessions()) {
    let oldestId: string | undefined;
    let oldestExp = Infinity;
    for (const [id, entry] of sessions) {
      if (entry.expiresAt < oldestExp) {
        oldestExp = entry.expiresAt;
        oldestId = id;
      }
    }
    if (oldestId) sessions.delete(oldestId);
  }
  touch(session.sessionId, session);
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function clearSessions(): void {
  sessions.clear();
}

export function sessionCount(): number {
  pruneExpiredSessions();
  return sessions.size;
}
