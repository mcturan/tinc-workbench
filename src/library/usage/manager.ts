export interface LibraryUsageSnapshot {
  favorites: string[];
  recent: string[];
}

export class LibraryUsageManager {
  private favorites = new Set<string>();
  private recent: string[] = [];

  constructor(private readonly recentLimit = 25) {}

  addFavorite(id: string): void {
    if (id.trim()) {
      this.favorites.add(id);
    }
  }

  removeFavorite(id: string): void {
    this.favorites.delete(id);
  }

  isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }

  listFavorites(): string[] {
    return Array.from(this.favorites.values());
  }

  touchRecent(id: string): void {
    if (!id.trim()) return;
    this.recent = [id, ...this.recent.filter((entry) => entry !== id)].slice(0, this.recentLimit);
  }

  listRecent(): string[] {
    return [...this.recent];
  }

  clear(): void {
    this.favorites.clear();
    this.recent = [];
  }

  snapshot(): LibraryUsageSnapshot {
    return {
      favorites: this.listFavorites(),
      recent: this.listRecent(),
    };
  }

  restore(snapshot: Partial<LibraryUsageSnapshot>): void {
    this.favorites = new Set(snapshot.favorites || []);
    this.recent = [...(snapshot.recent || [])].slice(0, this.recentLimit);
  }
}

export const globalLibraryUsage = new LibraryUsageManager();
