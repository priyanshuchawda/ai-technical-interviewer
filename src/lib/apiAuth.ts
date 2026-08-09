import { NextRequest } from "next/server";

export function getExpectedApiKey(): string {
  return (process.env.INTERVIEW_API_KEY || "").trim();
}

export function isAuthorized(req: NextRequest): boolean {
  const expected = getExpectedApiKey();
  if (!expected) return true;

  const headerKey = req.headers.get("x-api-key")?.trim() || "";
  const auth = req.headers.get("authorization")?.trim() || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return headerKey === expected || bearer === expected;
}
