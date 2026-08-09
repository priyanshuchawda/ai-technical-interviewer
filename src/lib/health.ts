import { getSessionStoreKind, isDeployMisconfigured } from "./config";
import { getKv } from "./kv";

export type CheckStatus = "ok" | "fail" | "skip";

export type HealthSnapshot = {
  status: "ok" | "degraded";
  live: true;
  ready: boolean;
  uptimeSec: number;
  store: string;
  checks: {
    auth: CheckStatus;
    sessionStore: CheckStatus;
    gemini: CheckStatus;
    breeth: CheckStatus;
  };
};

export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  let sessionStore: CheckStatus = "ok";
  try {
    sessionStore = (await getKv().ping()) ? "ok" : "fail";
  } catch {
    sessionStore = getSessionStoreKind() === "memory" ? "ok" : "fail";
  }

  const auth: CheckStatus = isDeployMisconfigured() ? "fail" : "ok";
  const gemini: CheckStatus = process.env.GEMINI_API_KEY ? "ok" : "skip";
  const breeth: CheckStatus = process.env.BREETH_API_KEY ? "ok" : "skip";
  const ready = auth === "ok" && sessionStore === "ok";

  return {
    status: ready ? "ok" : "degraded",
    live: true,
    ready,
    uptimeSec: Math.round(process.uptime()),
    store: getSessionStoreKind(),
    checks: { auth, sessionStore, gemini, breeth },
  };
}
