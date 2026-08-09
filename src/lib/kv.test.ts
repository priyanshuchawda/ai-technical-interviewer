import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { FileKv, MemoryKv, UpstashKv } from "./kv";

describe("MemoryKv", () => {
  it("sets, gets, expires, incrs, and setNx", async () => {
    const kv = new MemoryKv();
    await kv.set("a", "1", 1);
    expect(await kv.get("a")).toBe("1");
    expect(await kv.incr("b", 60)).toBe(1);
    expect(await kv.incr("b", 60)).toBe(2);
    expect(await kv.setNx("c", "lock", 60)).toBe(true);
    expect(await kv.setNx("c", "lock", 60)).toBe(false);
    await kv.del("c");
    expect(await kv.get("c")).toBeNull();
    expect(await kv.ping()).toBe(true);
  });
});

describe("FileKv", () => {
  let dir = "";

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-kv-"));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("persists values on disk", async () => {
    const kv = new FileKv(dir);
    await kv.set("session:1", "{\"ok\":true}", 60);
    expect(await kv.get("session:1")).toBe("{\"ok\":true}");
    expect(await kv.incr("rate", 60)).toBe(1);
    expect(await kv.setNx("lock", "t", 60)).toBe(true);
    expect(await kv.setNx("lock", "t", 60)).toBe(false);
    await kv.clear();
    expect(await kv.get("session:1")).toBeNull();
  });
});

describe("UpstashKv", () => {
  it("sends REST commands and maps NX results", async () => {
    const calls: unknown[] = [];
    let nxCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      if (cmd[0] === "SET" && cmd.includes("NX")) {
        nxCalls += 1;
        return new Response(JSON.stringify({ result: nxCalls === 1 ? "OK" : null }), { status: 200 });
      }
      if (cmd[0] === "INCR") return new Response(JSON.stringify({ result: 2 }), { status: 200 });
      if (cmd[0] === "GET") return new Response(JSON.stringify({ result: "stored" }), { status: 200 });
      if (cmd[0] === "PING") return new Response(JSON.stringify({ result: "PONG" }), { status: 200 });
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }) as typeof fetch;

    try {
      const kv = new UpstashKv("https://example.upstash.io", "token");
      expect(await kv.get("k")).toBe("stored");
      expect(await kv.incr("r", 60)).toBe(2);
      expect(await kv.setNx("lock", "t", 30)).toBe(true);
      expect(await kv.setNx("lock", "t", 30)).toBe(false);
      expect(await kv.ping()).toBe(true);
      expect(calls.length).toBeGreaterThan(3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
