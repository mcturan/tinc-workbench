import { ComponentMetadata, TVCSMetadata } from '../types';
import { ComponentRegistry } from '../registry';

export type DiscoveryMode = 'browse' | 'search' | 'recent' | 'favorites';

export interface CategoryNode {
  name: string;
  children: Map<string, CategoryNode>;
  components: ComponentMetadata[];
}

export class DiscoveryService {
  private recentIds: string[] = [];
  private favoriteIds: Set<string> = new Set();
  
  constructor(private registry: ComponentRegistry, private storage: any) {
    this.loadPersistence();
  }

  private loadPersistence() {
    try {
      const savedRecents = this.storage.getItem('tinc_recent_components');
      if (savedRecents) this.recentIds = JSON.parse(savedRecents);
      
      const savedFavs = this.storage.getItem('tinc_favorite_components');
      if (savedFavs) this.favoriteIds = new Set(JSON.parse(savedFavs));
    } catch (e) {
      console.warn('Failed to load discovery persistence', e);
    }
  }

  private savePersistence() {
    try {
      this.storage.setItem('tinc_recent_components', JSON.stringify(this.recentIds));
      this.storage.setItem('tinc_favorite_components', JSON.stringify(Array.from(this.favoriteIds)));
    } catch (e) {
      console.warn('Failed to save discovery persistence', e);
    }
  }

  // BROWSE: Hierarchical Tree based on TVCS categoryPath
  public getTaxonomyTree(): CategoryNode {
    const root: CategoryNode = { name: 'Root', children: new Map(), components: [] };
    
    for (const comp of this.registry.list()) {
      let current = root;
      const path = comp.tvcs?.categoryPath || ['Uncategorized'];
      
      for (const segment of path) {
        if (!current.children.has(segment)) {
          current.children.set(segment, { name: segment, children: new Map(), components: [] });
        }
        current = current.children.get(segment)!;
      }
      current.components.push(comp);
    }
    
    return root;
  }

  // SEARCH: Parametric & Fuzzy-ready
  public search(query: string): ComponentMetadata[] {
    const term = query.toLowerCase().trim();
    if (!term) return [];
    
    const results = this.registry.list().map(comp => {
      let weight = 0;
      const t = comp.tvcs;
      
      if (comp.name.toLowerCase().includes(term)) weight += 1.0;
      if (comp.id.toLowerCase().includes(term)) weight += 1.0;
      if (t) {
        if (t.manufacturer.toLowerCase().includes(term)) weight += 0.8;
        if (t.variant.toLowerCase().includes(term)) weight += 0.9;
        if (t.family.toLowerCase().includes(term)) weight += 0.5;
        if (t.series.toLowerCase().includes(term)) weight += 0.5;
        if (t.tags.some(tag => tag.toLowerCase().includes(term))) weight += 0.7;
      }
      
      return { comp, weight };
    });
    
    return results.filter(r => r.weight > 0).sort((a, b) => b.weight - a.weight).map(r => r.comp);
  }

  // RECENT
  public getRecents(): ComponentMetadata[] {
    return this.recentIds
      .map(id => this.registry.getById(id))
      .filter((c): c is ComponentMetadata => c !== undefined);
  }

  public recordRecent(componentId: string): void {
    this.recentIds = this.recentIds.filter(id => id !== componentId);
    this.recentIds.unshift(componentId);
    if (this.recentIds.length > 20) this.recentIds.pop();
    this.savePersistence();
  }

  // FAVORITES
  public getFavorites(): ComponentMetadata[] {
    return Array.from(this.favoriteIds)
      .map(id => this.registry.getById(id))
      .filter((c): c is ComponentMetadata => c !== undefined);
  }

  public toggleFavorite(componentId: string): void {
    if (this.favoriteIds.has(componentId)) {
      this.favoriteIds.delete(componentId);
    } else {
      this.favoriteIds.add(componentId);
    }
    this.savePersistence();
  }

  public isFavorite(componentId: string): boolean {
    return this.favoriteIds.has(componentId);
  }
}
