import { getLockTtlSec, sharedKvEnabled } from "./config";
import { getKv } from "./kv";

const locks = new Set<string>();

function lockKey(sessionId: string): string {
  return `interview:lock:${sessionId}`;
}

export async function tryAcquireSessionLock(
  sessionId: string
): Promise<(() => Promise<void>) | null> {
  if (sharedKvEnabled()) {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const acquired = await getKv().setNx(lockKey(sessionId), token, getLockTtlSec());
    if (!acquired) return null;
    return async () => {
      const current = await getKv().get(lockKey(sessionId));
      if (current === token) await getKv().del(lockKey(sessionId));
    };
  }

  if (locks.has(sessionId)) return null;
  locks.add(sessionId);
  return async () => {
    locks.delete(sessionId);
  };
}

export function clearSessionLocks(): void {
  locks.clear();
}
