import { describe, it, expect, beforeEach } from "vitest";
import {
  saveSession,
  getSession,
  clearSessions,
  sessionCount,
  pruneExpiredSessions,
} from "./sessionStore";
import { InterviewSessionState } from "../types/interview";
import candidatesData from "../../candidates.json";

function fakeSession(id: string): InterviewSessionState {
  return {
    sessionId: id,
    candidate: candidatesData.candidates[0],
    turnCount: 0,
    evaluatedDays: new Set([7]),
    history: [],
    done: false,
    masteryState: new Map(),
  };
}

describe("sessionStore", () => {
  beforeEach(() => {
    clearSessions();
    delete process.env.SESSION_TTL_MS;
    delete process.env.MAX_SESSIONS;
  });

  it("stores and retrieves a session", () => {
    saveSession(fakeSession("s1"));
    expect(getSession("s1")?.sessionId).toBe("s1");
    expect(sessionCount()).toBe(1);
  });

  it("expires sessions after ttl", () => {
    process.env.SESSION_TTL_MS = "1";
    saveSession(fakeSession("old"));
    pruneExpiredSessions(Date.now() + 10);
    expect(getSession("old")).toBeUndefined();
  });

  it("evicts oldest session when cap is reached", () => {
    process.env.MAX_SESSIONS = "2";
    saveSession(fakeSession("a"));
    saveSession(fakeSession("b"));
    saveSession(fakeSession("c"));
    expect(sessionCount()).toBe(2);
    expect(getSession("c")).toBeDefined();
  });
});
