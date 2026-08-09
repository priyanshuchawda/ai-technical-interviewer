import { NextRequest, NextResponse } from "next/server";
import { processInterviewTurn } from "@/lib/interviewEngine";
import { interviewRequestSchema } from "@/lib/interviewRequest";
import { isAuthorized } from "@/lib/apiAuth";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { log, sessionRef } from "@/lib/logger";

const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 64 * 1024);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 60);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimit(getClientIp(req), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000) || 1) },
        }
      );
    }

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = interviewRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join(".") || "(root)",
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { sessionId, candidate, message } = parsed.data;
    log("info", "interview.turn", {
      session: sessionRef(sessionId),
      hasCandidate: Boolean(candidate),
      hasMessage: Boolean(message),
    });

    const result = await processInterviewTurn(sessionId, candidate, message);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const known = error instanceof Error ? error.message : "";
    if (known.includes("Candidate profile is required")) {
      return NextResponse.json(
        { error: "Candidate profile is required to start an interview" },
        { status: 400 }
      );
    }
    log("error", "interview.failed", { reason: known.slice(0, 180) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
