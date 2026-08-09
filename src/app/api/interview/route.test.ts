import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import candidatesData from "../../../../candidates.json";

vi.mock("@/lib/interviewEngine", () => ({
  processInterviewTurn: vi.fn(),
}));

import { processInterviewTurn } from "@/lib/interviewEngine";
import { POST } from "./route";
import { ErrorCode } from "@/lib/errorCodes";

const mockedTurn = vi.mocked(processInterviewTurn);

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/interview", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/interview", () => {
  beforeEach(() => {
    mockedTurn.mockReset();
    delete process.env.INTERVIEW_API_KEY;
    delete process.env.UI_SESSION_SECRET;
    delete process.env.INTERVIEW_REQUIRE_AUTH;
    delete process.env.SESSION_STORE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  it("rejects invalid JSON with a stable code", async () => {
    const res = await POST(request("{"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(ErrorCode.INVALID_JSON);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("rejects an invalid payload with a stable code", async () => {
    const res = await POST(request({ message: "no session" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(ErrorCode.INVALID_REQUEST);
  });

  it("rejects unauthorized requests when an API key is configured", async () => {
    process.env.INTERVIEW_API_KEY = "expected-secret";
    const res = await POST(request({ sessionId: "s1", candidate: candidatesData.candidates[0] }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it("returns the engine reply on a valid start", async () => {
    mockedTurn.mockResolvedValue({
      reply: "Welcome Sarah. Let's start with monitoring.",
      done: false,
    });
    const res = await POST(request({ sessionId: "s1", candidate: candidatesData.candidates[0] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toContain("Welcome Sarah");
    expect(body.done).toBe(false);
    expect(mockedTurn).toHaveBeenCalledWith("s1", candidatesData.candidates[0], undefined, undefined);
  });

  it("maps a missing candidate to the documented error", async () => {
    mockedTurn.mockRejectedValue(new Error("Candidate profile is required to initialize a new interview session."));
    const res = await POST(request({ sessionId: "s1", message: "hello" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(ErrorCode.CANDIDATE_REQUIRED);
  });
});
