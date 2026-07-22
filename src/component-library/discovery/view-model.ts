import { ComponentMetadata, TVCSMetadata } from '../types';
import { DiscoveryService, CategoryNode, DiscoveryMode } from './service';

export interface DiscoveryState {
  mode: DiscoveryMode;
  searchQuery: string;
  results: ComponentMetadata[];
  browseTree: CategoryNode;
  currentBrowsePath: string[];
  selectedComponent: ComponentMetadata | null;
}

export class DiscoveryViewModel {
  private state: DiscoveryState;
  private listeners: ((state: DiscoveryState) => void)[] = [];

  constructor(private service: DiscoveryService) {
    this.state = {
      mode: 'browse',
      searchQuery: '',
      results: [],
      browseTree: this.service.getTaxonomyTree(),
      currentBrowsePath: [],
      selectedComponent: null,
    };
    this.refreshBrowseResults();
  }

  public subscribe(listener: (state: DiscoveryState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public getState(): DiscoveryState {
    return this.state;
  }

  public setMode(mode: DiscoveryMode) {
    this.state.mode = mode;
    this.state.selectedComponent = null;
    
    if (mode === 'recent') {
      this.state.results = this.service.getRecents();
    } else if (mode === 'favorites') {
      this.state.results = this.service.getFavorites();
    } else if (mode === 'browse') {
      this.refreshBrowseResults();
    } else if (mode === 'search') {
      this.state.results = this.service.search(this.state.searchQuery);
    }
    
    this.notify();
  }

  public setSearchQuery(query: string) {
    this.state.searchQuery = query;
    if (this.state.mode !== 'search') {
      this.state.mode = 'search';
    }
    this.state.results = this.service.search(query);
    this.notify();
  }

  public setBrowsePath(path: string[]) {
    this.state.currentBrowsePath = path;
    this.refreshBrowseResults();
    this.notify();
  }

  private refreshBrowseResults() {
    let current = this.state.browseTree;
    for (const segment of this.state.currentBrowsePath) {
      if (current.children.has(segment)) {
        current = current.children.get(segment)!;
      }
    }
    this.state.results = current.components;
  }

  public selectComponent(id: string | null) {
    if (id === null) {
      this.state.selectedComponent = null;
    } else {
      const all = this.service['registry'].list(); // Using registry list for global lookup
      this.state.selectedComponent = all.find(c => c.id === id) || null;
    }
    this.notify();
  }

  public insertComponent(id: string) {
    this.service.recordRecent(id);
    // Returning true tells UI to actually fire insertion logic via Workbench
    return true;
  }

  public toggleFavorite(id: string) {
    this.service.toggleFavorite(id);
    if (this.state.mode === 'favorites') {
      this.state.results = this.service.getFavorites();
    }
    this.notify();
  }

  public isFavorite(id: string): boolean {
    return this.service.isFavorite(id);
  }
}
