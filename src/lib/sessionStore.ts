import { InterviewSessionState } from "../types/interview";
import { getMaxSessions, getSessionStoreKind, getSessionTtlMs } from "./config";
import { getKv } from "./kv";
import { decodeSession, encodeSession } from "./sessionCodec";

const DEFAULT_TTL_MS = 30 * 60 * 1000;

type SessionEntry = {
  session: InterviewSessionState;
  expiresAt: number;
};

const sessions = new Map<string, SessionEntry>();

export { getSessionTtlMs, getMaxSessions } from "./config";

function ttlMs(): number {
  return getSessionTtlMs() || DEFAULT_TTL_MS;
}

function sessionKey(sessionId: string): string {
  return `interview:session:${sessionId}`;
}

function durableEnabled(): boolean {
  return getSessionStoreKind() !== "memory";
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
    expiresAt: now + ttlMs(),
  });
}

async function getDurable(sessionId: string): Promise<InterviewSessionState | undefined> {
  const raw = await getKv().get(sessionKey(sessionId));
  if (!raw) return undefined;
  return decodeSession(raw) || undefined;
}

async function saveDurable(session: InterviewSessionState): Promise<void> {
  await getKv().set(sessionKey(session.sessionId), encodeSession(session), Math.ceil(ttlMs() / 1000));
}

export async function getSession(sessionId: string): Promise<InterviewSessionState | undefined> {
  if (durableEnabled()) return getDurable(sessionId);
  pruneExpiredSessions();
  const entry = sessions.get(sessionId);
  if (!entry) return undefined;
  touch(sessionId, entry.session);
  return entry.session;
}

export async function saveSession(session: InterviewSessionState): Promise<void> {
  if (durableEnabled()) {
    await saveDurable(session);
    return;
  }
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

export async function deleteSession(sessionId: string): Promise<void> {
  if (durableEnabled()) {
    await getKv().del(sessionKey(sessionId));
    return;
  }
  sessions.delete(sessionId);
}

export async function clearSessions(): Promise<void> {
  sessions.clear();
  if (durableEnabled()) await getKv().clear();
}

export async function sessionCount(): Promise<number> {
  if (durableEnabled()) return 0;
  pruneExpiredSessions();
  return sessions.size;
}
