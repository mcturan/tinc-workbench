import { ComponentMetadata } from './types';
import { ComponentRegistry } from './registry';

export class SearchEngine {
  constructor(private registry: ComponentRegistry) {}

  search(query: string): ComponentMetadata[] {
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) return [];

    const results: { component: ComponentMetadata; score: number }[] = [];

    for (const comp of this.registry.list()) {
      let score = 0;

      const id = comp.id.toLowerCase();
      const name = comp.name.toLowerCase();

      // 1. Exact match on ID or Name
      if (id === cleaned || name === cleaned) {
        score = Math.max(score, 100);
      }
      // 2. Starts with on ID or Name
      else if (id.startsWith(cleaned) || name.startsWith(cleaned)) {
        score = Math.max(score, 50);
      }
      // 3. Contains match on ID or Name
      else if (id.includes(cleaned) || name.includes(cleaned)) {
        score = Math.max(score, 30);
      }

      // 4. Matches on Aliases
      for (const alias of comp.aliases) {
        const lowerAlias = alias.toLowerCase();
        if (lowerAlias === cleaned) {
          score = Math.max(score, 80);
        } else if (lowerAlias.startsWith(cleaned)) {
          score = Math.max(score, 40);
        } else if (lowerAlias.includes(cleaned)) {
          score = Math.max(score, 20);
        }
      }

      // 5. Matches on Keywords
      for (const kw of comp.keywords) {
        const lowerKw = kw.toLowerCase();
        if (lowerKw === cleaned) {
          score = Math.max(score, 60);
        } else if (lowerKw.includes(cleaned)) {
          score = Math.max(score, 10);
        }
      }

      if (score > 0) {
        results.push({ component: comp, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score || a.component.name.localeCompare(b.component.name))
      .map((r) => r.component);
  }

  searchAlias(query: string): ComponentMetadata[] {
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) return [];

    const results: { component: ComponentMetadata; score: number }[] = [];

    for (const comp of this.registry.list()) {
      let score = 0;
      for (const alias of comp.aliases) {
        const lowerAlias = alias.toLowerCase();
        if (lowerAlias === cleaned) {
          score = Math.max(score, 80);
        } else if (lowerAlias.startsWith(cleaned)) {
          score = Math.max(score, 40);
        } else if (lowerAlias.includes(cleaned)) {
          score = Math.max(score, 20);
        }
      }
      if (score > 0) {
        results.push({ component: comp, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score || a.component.name.localeCompare(b.component.name))
      .map((r) => r.component);
  }

  searchKeyword(query: string): ComponentMetadata[] {
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) return [];

    const results: { component: ComponentMetadata; score: number }[] = [];

    for (const comp of this.registry.list()) {
      let score = 0;
      for (const kw of comp.keywords) {
        const lowerKw = kw.toLowerCase();
        if (lowerKw === cleaned) {
          score = Math.max(score, 60);
        } else if (lowerKw.includes(cleaned)) {
          score = Math.max(score, 10);
        }
      }
      if (score > 0) {
        results.push({ component: comp, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score || a.component.name.localeCompare(b.component.name))
      .map((r) => r.component);
  }
}
