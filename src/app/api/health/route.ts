import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptimeSec: Math.round(process.uptime()),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    breethConfigured: Boolean(process.env.BREETH_API_KEY),
  });
}
