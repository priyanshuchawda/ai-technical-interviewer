export class BreethClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.BREETH_API_KEY || "";
    this.baseUrl = process.env.BREETH_API_URL || "https://api.thebreeth.com";
  }

  async addEpisode(messages: Array<{ role: string; content: string }>): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/episodes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });
      return res.ok;
    } catch (err) {
      console.error("[BreethClient] Error posting episode:", err);
      return false;
    }
  }

  async searchMemory(query: string, limit = 5): Promise<unknown[]> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, limit }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.episodes || data.results || [];
    } catch (err) {
      console.error("[BreethClient] Error searching memory:", err);
      return [];
    }
  }
}

export const breethClient = new BreethClient();
