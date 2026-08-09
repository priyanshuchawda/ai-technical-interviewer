import { NextRequest, NextResponse } from "next/server";
import { processInterviewTurn } from "@/lib/interviewEngine";
import { interviewRequestSchema } from "@/lib/interviewRequest";
import { isAuthorized } from "@/lib/apiAuth";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { ipRef, log, sessionRef } from "@/lib/logger";
import { tryAcquireSessionLock } from "@/lib/sessionLock";
import { ErrorCode } from "@/lib/errorCodes";
import { getMaxBodyBytes, getRateLimitMax, getRateLimitWindowMs, isDeployMisconfigured } from "@/lib/config";
import {
  recordInterviewTurn,
  recordMisconfigured,
  recordRateLimited,
  recordUnauthorized,
} from "@/lib/metrics";

function jsonError(
  status: number,
  error: string,
  code: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {}
) {
  return NextResponse.json({ error, code, ...extra }, { status, headers });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const headers = { "x-request-id": requestId };
  const started = Date.now();
  const client = ipRef(getClientIp(req));

  try {
    if (isDeployMisconfigured()) {
      recordMisconfigured();
      log("error", "config.invalid", { requestId });
      return jsonError(503, "Server misconfigured", ErrorCode.MISCONFIGURED, {}, headers);
    }

    if (!isAuthorized(req)) {
      recordUnauthorized();
      log("warn", "auth.denied", { requestId, client });
      return jsonError(401, "Unauthorized", ErrorCode.UNAUTHORIZED, {}, headers);
    }

    const limited = await rateLimit(getClientIp(req), getRateLimitMax(), getRateLimitWindowMs());
    if (!limited.ok) {
      recordRateLimited();
      log("warn", "interview.rate_limited", { requestId, client });
      return jsonError(
        429,
        "Too many requests",
        ErrorCode.RATE_LIMITED,
        {},
        {
          ...headers,
          "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000) || 1),
        }
      );
    }

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > getMaxBodyBytes()) {
      return jsonError(413, "Request body too large", ErrorCode.PAYLOAD_TOO_LARGE, {}, headers);
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return jsonError(400, "Invalid JSON body", ErrorCode.INVALID_JSON, {}, headers);
    }

    const parsed = interviewRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(400, "Invalid request", ErrorCode.INVALID_REQUEST, {
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join(".") || "(root)",
          message: issue.message,
        })),
      }, headers);
    }

    const { sessionId, candidate, message } = parsed.data;
    const releaseLock = await tryAcquireSessionLock(sessionId);
    if (!releaseLock) {
      return jsonError(409, "Interview turn already in progress", ErrorCode.TURN_IN_FLIGHT, {}, headers);
    }

    try {
      log("info", "interview.turn", {
        requestId,
        session: sessionRef(sessionId),
        client,
        hasCandidate: Boolean(candidate),
        hasMessage: Boolean(message),
      });

      const result = await processInterviewTurn(sessionId, candidate, message);
      recordInterviewTurn(Date.now() - started, true);
      return NextResponse.json(result, { headers });
    } finally {
      await releaseLock();
    }
  } catch (error: unknown) {
    const known = error instanceof Error ? error.message : "";
    if (known.includes("Candidate profile is required")) {
      return jsonError(400, "Candidate profile is required to start an interview", ErrorCode.CANDIDATE_REQUIRED, {}, headers);
    }
    recordInterviewTurn(Date.now() - started, false);
    log("error", "interview.failed", { requestId, reason: known.slice(0, 180) });
    return jsonError(500, "Internal server error", ErrorCode.INTERNAL, {}, headers);
  }
}
