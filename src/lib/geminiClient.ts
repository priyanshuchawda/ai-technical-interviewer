export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export function getGeminiTimeoutMs(): number {
  const raw = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 20_000;
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

function shouldRetry(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
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

  const timeoutMs = getGeminiTimeoutMs();
  let response = await fetchWithTimeout(url, init, timeoutMs);
  if (!response.ok && shouldRetry(response.status)) {
    response = await fetchWithTimeout(url, init, timeoutMs);
  }

  if (!response.ok) {
    throw new Error(`Gemini API call failed (${response.status})`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response text received from Gemini API");
  }

  return text;
}
