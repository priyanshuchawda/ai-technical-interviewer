export class BreethClient {
  private getApiKey(): string {
    return process.env.BREETH_API_KEY || "";
  }

  private getBaseUrl(): string {
    return process.env.BREETH_API_URL || "https://api.thebreeth.com";
  }

  async addEpisode(messages: Array<{ role: string; content: string }>): Promise<boolean> {
    const apiKey = this.getApiKey();
    if (!apiKey) return false;

    try {
      const res = await fetch(`${this.getBaseUrl()}/v1/episodes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });
      return res.ok;
    } catch (err) {
      console.error("[BreethClient] Best-effort episode add failed:", err instanceof Error ? err.message : err);
      return false;
    }
  }

  async searchMemory(query: string, limit = 3): Promise<string[]> {
    const apiKey = this.getApiKey();
    if (!apiKey || !query.trim()) return [];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s best-effort timeout

    try {
      const res = await fetch(`${this.getBaseUrl()}/v1/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, limit }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!res.ok) return [];

      const data = await res.json() as {
        episodes?: unknown[];
        results?: unknown[];
        memories?: unknown[];
      };
      const rawResults = data.episodes || data.results || data.memories || [];

      return rawResults.map((item) => {
        if (typeof item === "string") return item;
        if (!item || typeof item !== "object") return "";
        const record = item as { content?: unknown; narrative?: unknown; summary?: unknown };
        if (typeof record.content === "string") return record.content;
        if (typeof record.narrative === "string") return record.narrative;
        if (typeof record.summary === "string") return record.summary;
        return JSON.stringify(item);
      }).filter((text) => text.trim().length > 0);
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn("[BreethClient] Best-effort memory search skipped:", err instanceof Error ? err.message : err);
      return [];
    }
  }
}

export const breethClient = new BreethClient();
