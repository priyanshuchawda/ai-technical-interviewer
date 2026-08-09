import { llmCircuit } from "./circuitBreaker";
import { withRetry } from "./retry";

export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export function getGeminiTimeoutMs(): number {
  const raw = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 20_000;
}

class ProviderHttpError extends Error {
  constructor(public status: number) {
    super(`Gemini API call failed (${status})`);
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof ProviderHttpError) {
    return error.status === 429 || error.status >= 500;
  }
  return error instanceof Error && /aborted|timeout/i.test(error.message);
}

export async function generateGeminiContent(
  contents: GeminiMessage[],
  systemInstruction?: string,
  responseSchemaJson?: boolean
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  if (!llmCircuit.canRequest()) {
    throw new Error("LLM_CIRCUIT_OPEN");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const requestBody: {
    contents: GeminiMessage[];
    generationConfig: { responseMimeType?: string };
    systemInstruction?: { parts: Array<{ text: string }> };
  } = {
    contents,
    generationConfig: {},
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (responseSchemaJson) {
    requestBody.generationConfig.responseMimeType = "application/json";
  }

  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  };

  try {
    const text = await withRetry(async () => {
      const response = await fetchWithTimeout(url, init, getGeminiTimeoutMs());
      if (!response.ok) {
        throw new ProviderHttpError(response.status);
      }
      const data = await response.json();
      const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!output) {
        throw new Error("No response text received from Gemini API");
      }
      return output as string;
    }, {
      retries: 2,
      shouldRetry,
    });
    llmCircuit.recordSuccess();
    return text;
  } catch (error) {
    llmCircuit.recordFailure();
    throw error;
  }
}
