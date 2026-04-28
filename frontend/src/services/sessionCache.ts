type CacheEntry<T> = {
  fetchedAt: number;
  expiresAt: number;
  value: T;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

const safeSessionStorageGet = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSessionStorageSet = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore quota/privacy mode errors.
  }
};

const readCacheEntry = <T>(key: string): CacheEntry<T> | undefined => {
  const mem = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (mem) return mem;

  const raw = safeSessionStorageGet(key);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed !== 'object') return undefined;
    if (typeof (parsed as any).expiresAt !== 'number') return undefined;

    memoryCache.set(key, parsed as CacheEntry<unknown>);
    return parsed;
  } catch {
    return undefined;
  }
};

const writeCacheEntry = <T>(key: string, value: T, ttlMs: number): CacheEntry<T> => {
  const fetchedAt = Date.now();
  const entry: CacheEntry<T> = {
    fetchedAt,
    expiresAt: fetchedAt + ttlMs,
    value,
  };

  memoryCache.set(key, entry as CacheEntry<unknown>);
  safeSessionStorageSet(key, JSON.stringify(entry));
  return entry;
};

/**
 * Session-scoped cache (tab lifetime):
 * - In-memory + sessionStorage
 * - TTL-based
 * - In-flight dedupe so repeated calls don't queue network requests
 */
export const sessionCacheFetch = async <T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  opts?: { forceRefresh?: boolean }
): Promise<T> => {
  if (!opts?.forceRefresh) {
    const cached = readCacheEntry<T>(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
  }

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const req = (async () => {
    try {
      const value = await fetcher();
      writeCacheEntry(key, value, ttlMs);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, req as Promise<unknown>);
  return req;
};

export const sessionCacheInvalidate = (key: string) => {
  memoryCache.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
};
