import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "os";
import path from "path";
import fs from "fs/promises";
import {
  saveSession,
  getSession,
  clearSessions,
  sessionCount,
  pruneExpiredSessions,
} from "./sessionStore";
import { InterviewSessionState } from "../types/interview";
import candidatesData from "../../candidates.json";
import { resetKvCache } from "./kv";

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
  beforeEach(async () => {
    delete process.env.SESSION_TTL_MS;
    delete process.env.MAX_SESSIONS;
    delete process.env.SESSION_STORE;
    delete process.env.SESSION_STORE_PATH;
    resetKvCache();
    await clearSessions();
  });

  it("stores and retrieves a session", async () => {
    await saveSession(fakeSession("s1"));
    expect((await getSession("s1"))?.sessionId).toBe("s1");
    expect(await sessionCount()).toBe(1);
  });

  it("expires sessions after ttl", async () => {
    process.env.SESSION_TTL_MS = "1";
    await saveSession(fakeSession("old"));
    pruneExpiredSessions(Date.now() + 10);
    expect(await getSession("old")).toBeUndefined();
  });

  it("evicts oldest session when cap is reached", async () => {
    process.env.MAX_SESSIONS = "2";
    await saveSession(fakeSession("a"));
    await saveSession(fakeSession("b"));
    await saveSession(fakeSession("c"));
    expect(await sessionCount()).toBe(2);
    expect(await getSession("c")).toBeDefined();
  });
});

describe("file session store", () => {
  let dir = "";

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-sessions-"));
    process.env.SESSION_STORE = "file";
    process.env.SESSION_STORE_PATH = dir;
    process.env.SESSION_TTL_MS = "60000";
    resetKvCache();
    await clearSessions();
  });

  afterEach(async () => {
    delete process.env.SESSION_STORE;
    delete process.env.SESSION_STORE_PATH;
    resetKvCache();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("survives a process-local reload from disk", async () => {
    await saveSession(fakeSession("durable-1"));
    resetKvCache();
    const restored = await getSession("durable-1");
    expect(restored?.sessionId).toBe("durable-1");
    expect(restored?.evaluatedDays.has(7)).toBe(true);
  });
});
