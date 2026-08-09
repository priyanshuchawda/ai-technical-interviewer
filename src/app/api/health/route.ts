import { NextRequest, NextResponse } from "next/server";
import { getHealthSnapshot } from "@/lib/health";

export async function GET(req: NextRequest) {
  const snapshot = await getHealthSnapshot();
  const wantReady = req.nextUrl.searchParams.get("ready") === "1";
  const status = wantReady && !snapshot.ready ? 503 : 200;
  return NextResponse.json(snapshot, { status });
}
