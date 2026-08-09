import { createHmac, timingSafeEqual } from "crypto";
import { getUiSessionSecret } from "./config";

export const UI_SESSION_COOKIE = "interview_ui";
export const UI_SESSION_MAX_AGE_SEC = 12 * 60 * 60;

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function mintUiSessionToken(now = Date.now(), secret = getUiSessionSecret()): string | null {
  if (!secret) return null;
  const exp = Math.floor(now / 1000) + UI_SESSION_MAX_AGE_SEC;
  return `${exp}.${sign(String(exp), secret)}`;
}

export function verifyUiSessionToken(
  token: string,
  now = Date.now(),
  secret = getUiSessionSecret()
): boolean {
  if (!secret || !token) return false;
  const [expRaw, sig] = token.split(".");
  if (!expRaw || !sig) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 <= now) return false;
  const expected = sign(expRaw, secret);
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
