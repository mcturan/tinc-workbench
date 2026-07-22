export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: string;
  lastAccessedAt: string;
  expiresAt?: string;
}

export class LibraryCache<T = unknown> {
  private entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly maxEntries = 200) {}

  set(key: string, value: T, ttlMs?: number): void {
    const now = new Date();
    this.entries.set(key, {
      key,
      value,
      createdAt: now.toISOString(),
      lastAccessedAt: now.toISOString(),
      expiresAt: ttlMs ? new Date(now.getTime() + ttlMs).toISOString() : undefined,
    });
    this.evictIfNeeded();
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    entry.lastAccessedAt = new Date().toISOString();
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  keys(): string[] {
    return Array.from(this.entries.keys()).filter((key) => this.has(key));
  }

  snapshot(): CacheEntry<T>[] {
    return this.keys().map((key) => this.entries.get(key)!).filter(Boolean);
  }

  restore(entries: CacheEntry<T>[]): void {
    this.entries.clear();
    for (const entry of entries) {
      this.entries.set(entry.key, { ...entry });
    }
    this.evictIfNeeded();
  }

  private evictIfNeeded(): void {
    while (this.entries.size > this.maxEntries) {
      const oldest = Array.from(this.entries.values()).sort((a, b) =>
        a.lastAccessedAt.localeCompare(b.lastAccessedAt)
      )[0];
      if (!oldest) return;
      this.entries.delete(oldest.key);
    }
  }
}

export const globalLibraryCache = new LibraryCache();
