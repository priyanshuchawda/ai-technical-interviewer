import { NextRequest } from "next/server";
import { authIsRequired, getInterviewApiKey, getUiSessionSecret, isDeployMisconfigured } from "./config";
import { timingSafeEqualString } from "./safeEqual";
import { UI_SESSION_COOKIE, verifyUiSessionToken } from "./uiSession";

export function getExpectedApiKey(): string {
  return getInterviewApiKey();
}

function readPresentedKey(req: NextRequest): string {
  const headerKey = req.headers.get("x-api-key")?.trim() || "";
  const auth = req.headers.get("authorization")?.trim() || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim() || headerKey;
  return headerKey;
}

export function hasValidApiKey(req: NextRequest): boolean {
  const expected = getInterviewApiKey();
  if (!expected) return false;
  const presented = readPresentedKey(req);
  return Boolean(presented) && timingSafeEqualString(presented, expected);
}

export function hasValidUiSession(req: NextRequest): boolean {
  if (!getUiSessionSecret()) return false;
  const token = req.cookies.get(UI_SESSION_COOKIE)?.value || "";
  return verifyUiSessionToken(token);
}

export function isAuthorized(req: NextRequest): boolean {
  if (isDeployMisconfigured()) return false;
  if (hasValidApiKey(req) || hasValidUiSession(req)) return true;
  if (!authIsRequired() && !getInterviewApiKey()) return true;
  return false;
}
