import fs from "fs/promises";
import path from "path";
import { getFileStorePath, getSessionStoreKind, getUpstashConfig } from "./config";

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSec?: number): Promise<number>;
  setNx(key: string, value: string, ttlSec: number): Promise<boolean>;
  ping(): Promise<boolean>;
  clear(): Promise<void>;
}

type MemoryEntry = { value: string; expiresAt?: number };

export class MemoryKv implements KeyValueStore {
  private data = new Map<string, MemoryEntry>();

  private read(key: string, now = Date.now()): string | null {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= now) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  async get(key: string): Promise<string | null> {
    return this.read(key);
  }

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    this.data.set(key, {
      value,
      expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }

  async incr(key: string, ttlSec?: number): Promise<number> {
    const current = Number(this.read(key) || "0");
    const next = (Number.isFinite(current) ? current : 0) + 1;
    const existing = this.data.get(key);
    const expiresAt =
      existing?.expiresAt && existing.expiresAt > Date.now()
        ? existing.expiresAt
        : ttlSec
          ? Date.now() + ttlSec * 1000
          : undefined;
    this.data.set(key, { value: String(next), expiresAt });
    return next;
  }

  async setNx(key: string, value: string, ttlSec: number): Promise<boolean> {
    if (this.read(key) !== null) return false;
    await this.set(key, value, ttlSec);
    return true;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

function fileNameForKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]+/g, "__") + ".json";
}

export class FileKv implements KeyValueStore {
  constructor(private readonly dir: string) {}

  private filePath(key: string): string {
    return path.join(this.dir, fileNameForKey(key));
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  private async readEntry(key: string): Promise<MemoryEntry | null> {
    try {
      const raw = await fs.readFile(this.filePath(key), "utf8");
      const parsed = JSON.parse(raw) as MemoryEntry;
      if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
        await this.del(key);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = await this.readEntry(key);
    return entry?.value ?? null;
  }

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    await this.ensureDir();
    const entry: MemoryEntry = {
      value,
      expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : undefined,
    };
    await fs.writeFile(this.filePath(key), JSON.stringify(entry), "utf8");
  }

  async del(key: string): Promise<void> {
    try {
      await fs.unlink(this.filePath(key));
    } catch {
      // ignore missing
    }
  }

  async incr(key: string, ttlSec?: number): Promise<number> {
    const entry = await this.readEntry(key);
    const current = Number(entry?.value || "0");
    const next = (Number.isFinite(current) ? current : 0) + 1;
    const expiresAt =
      entry?.expiresAt && entry.expiresAt > Date.now()
        ? entry.expiresAt
        : ttlSec
          ? Date.now() + ttlSec * 1000
          : undefined;
    await this.ensureDir();
    await fs.writeFile(
      this.filePath(key),
      JSON.stringify({ value: String(next), expiresAt } satisfies MemoryEntry),
      "utf8"
    );
    return next;
  }

  async setNx(key: string, value: string, ttlSec: number): Promise<boolean> {
    await this.ensureDir();
    if ((await this.get(key)) !== null) return false;
    try {
      const entry: MemoryEntry = {
        value,
        expiresAt: Date.now() + ttlSec * 1000,
      };
      await fs.writeFile(this.filePath(key), JSON.stringify(entry), { flag: "wx" });
      return true;
    } catch {
      return (await this.get(key)) === null ? (await this.set(key, value, ttlSec), true) : false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.ensureDir();
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.dir);
      await Promise.all(files.map((file) => fs.unlink(path.join(this.dir, file)).catch(() => undefined)));
    } catch {
      // ignore missing dir
    }
  }
}

export class UpstashKv implements KeyValueStore {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  private async cmd(args: Array<string | number>): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`upstash ${res.status}`);
    const body = (await res.json()) as { result?: unknown; error?: string };
    if (body.error) throw new Error(body.error);
    return body.result ?? null;
  }

  async get(key: string): Promise<string | null> {
    const result = await this.cmd(["GET", key]);
    return typeof result === "string" ? result : null;
  }

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    if (ttlSec && ttlSec > 0) await this.cmd(["SET", key, value, "EX", Math.ceil(ttlSec)]);
    else await this.cmd(["SET", key, value]);
  }

  async del(key: string): Promise<void> {
    await this.cmd(["DEL", key]);
  }

  async incr(key: string, ttlSec?: number): Promise<number> {
    const result = await this.cmd(["INCR", key]);
    const next = typeof result === "number" ? result : Number(result);
    if (ttlSec && ttlSec > 0 && next === 1) {
      await this.cmd(["EXPIRE", key, Math.ceil(ttlSec)]);
    }
    return Number.isFinite(next) ? next : 0;
  }

  async setNx(key: string, value: string, ttlSec: number): Promise<boolean> {
    const result = await this.cmd(["SET", key, value, "EX", Math.ceil(ttlSec), "NX"]);
    return result === "OK";
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.cmd(["PING"]);
      return result === "PONG" || result === true || result === "OK";
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    // Intentionally no FLUSHDB in production backends.
  }
}

let cached: KeyValueStore | null = null;
let cachedKind = "";

export function resetKvCache(): void {
  cached = null;
  cachedKind = "";
}

export function createKvFromEnv(): KeyValueStore {
  const kind = getSessionStoreKind();
  if (kind === "file") return new FileKv(getFileStorePath());
  if (kind === "upstash") {
    const config = getUpstashConfig();
    if (!config) throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
    return new UpstashKv(config.url, config.token);
  }
  return new MemoryKv();
}

export function getKv(): KeyValueStore {
  const kind = `${getSessionStoreKind()}:${getFileStorePath()}:${process.env.UPSTASH_REDIS_REST_URL || ""}`;
  if (!cached || cachedKind !== kind) {
    cached = createKvFromEnv();
    cachedKind = kind;
  }
  return cached;
}
