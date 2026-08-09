const locks = new Set<string>();

export function tryAcquireSessionLock(sessionId: string): (() => void) | null {
  if (locks.has(sessionId)) return null;
  locks.add(sessionId);
  return () => {
    locks.delete(sessionId);
  };
}

export function clearSessionLocks(): void {
  locks.clear();
}
