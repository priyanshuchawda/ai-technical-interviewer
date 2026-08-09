import { NextRequest, NextResponse } from "next/server";
import { processInterviewTurn } from "@/lib/interviewEngine";
import { interviewRequestSchema } from "@/lib/interviewRequest";
import { isAuthorized } from "@/lib/apiAuth";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { log, sessionRef } from "@/lib/logger";
import { tryAcquireSessionLock } from "@/lib/sessionLock";
import { ErrorCode } from "@/lib/errorCodes";

const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 64 * 1024);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 60);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

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

  try {
    if (!isAuthorized(req)) {
      return jsonError(401, "Unauthorized", ErrorCode.UNAUTHORIZED, {}, headers);
    }

    const limited = rateLimit(getClientIp(req), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!limited.ok) {
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
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
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
    const releaseLock = tryAcquireSessionLock(sessionId);
    if (!releaseLock) {
      return jsonError(409, "Interview turn already in progress", ErrorCode.TURN_IN_FLIGHT, {}, headers);
    }

    try {
      log("info", "interview.turn", {
        requestId,
        session: sessionRef(sessionId),
        hasCandidate: Boolean(candidate),
        hasMessage: Boolean(message),
      });

      const result = await processInterviewTurn(sessionId, candidate, message);
      return NextResponse.json(result, { headers });
    } finally {
      releaseLock();
    }
  } catch (error: unknown) {
    const known = error instanceof Error ? error.message : "";
    if (known.includes("Candidate profile is required")) {
      return jsonError(400, "Candidate profile is required to start an interview", ErrorCode.CANDIDATE_REQUIRED, {}, headers);
    }
    log("error", "interview.failed", { requestId, reason: known.slice(0, 180) });
    return jsonError(500, "Internal server error", ErrorCode.INTERNAL, {}, headers);
  }
}
