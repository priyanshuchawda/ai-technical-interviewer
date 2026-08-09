import { NextResponse } from "next/server";
import { isDeployMisconfigured } from "@/lib/config";
import { mintUiSessionToken, UI_SESSION_COOKIE, UI_SESSION_MAX_AGE_SEC } from "@/lib/uiSession";
import { ErrorCode } from "@/lib/errorCodes";

export async function GET() {
  if (isDeployMisconfigured()) {
    return NextResponse.json(
      { error: "Server misconfigured", code: ErrorCode.MISCONFIGURED },
      { status: 503 }
    );
  }

  const token = mintUiSessionToken();
  const res = NextResponse.json({ ok: true, cookie: Boolean(token) });
  if (token) {
    res.cookies.set(UI_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: UI_SESSION_MAX_AGE_SEC,
    });
  }
  return res;
}
