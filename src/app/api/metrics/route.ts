import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { authIsRequired, getInterviewApiKey } from "@/lib/config";
import { renderPrometheusMetrics, snapshotMetrics } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  const mustAuth = authIsRequired() || Boolean(getInterviewApiKey());
  if (mustAuth && !isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (req.nextUrl.searchParams.get("format") === "prom") {
    return new NextResponse(renderPrometheusMetrics(), {
      status: 200,
      headers: { "Content-Type": "text/plain; version=0.0.4" },
    });
  }

  return NextResponse.json({
    ts: new Date().toISOString(),
    metrics: snapshotMetrics(),
  });
}
