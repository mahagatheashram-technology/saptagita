const SYNC_CACHE_WINDOW_MS = 5_000;

interface CachedSync<T> {
  expiresAt: number;
  value: T;
}

const inFlight = new Map<string, Promise<unknown>>();
const recent = new Map<string, CachedSync<unknown>>();

/**
 * Coalesces the burst of identical sync mutations produced when several tab
 * screens mount for the same Clerk user. Failures are never cached, so an
 * explicit retry can run immediately.
 */
export async function coordinateUserSync<T>(
  fingerprint: string,
  operation: () => Promise<T>,
  force = false
): Promise<T> {
  const now = Date.now();
  const cached = recent.get(fingerprint) as CachedSync<T> | undefined;
  if (!force && cached && cached.expiresAt > now) {
    return cached.value;
  }

  const pending = inFlight.get(fingerprint) as Promise<T> | undefined;
  if (pending) return pending;

  const next = operation()
    .then((value) => {
      recent.set(fingerprint, {
        expiresAt: Date.now() + SYNC_CACHE_WINDOW_MS,
        value,
      });
      return value;
    })
    .finally(() => {
      inFlight.delete(fingerprint);
    });

  inFlight.set(fingerprint, next);
  return next;
}

export function clearUserSyncCache(): void {
  recent.clear();
  inFlight.clear();
}
