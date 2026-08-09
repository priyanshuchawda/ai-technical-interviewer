import { NextRequest, NextResponse } from "next/server";
import { processInterviewTurn } from "@/lib/interviewEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, candidate, message } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required parameter: sessionId" },
        { status: 400 }
      );
    }

    const result = await processInterviewTurn(sessionId, candidate, message);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[API /api/interview Error]:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
