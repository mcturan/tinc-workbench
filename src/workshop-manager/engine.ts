import { 
  InventoryItem, 
  StorageLocation, 
  InventoryCategory, 
  WorkshopState 
} from './types';
import { generateUUID } from '../utils';
import { EventBus } from '../event-bus';

export const DEFAULT_CATEGORIES: InventoryCategory[] = [
  { id: 'cat-ics', name: 'ICs', description: 'Integrated Circuits' },
  { id: 'cat-passives', name: 'Passives', description: 'Resistors, Capacitors, Inductors' },
  { id: 'cat-modules', name: 'Modules', description: 'Breakout boards and sub-assemblies' },
  { id: 'cat-rf', name: 'RF', description: 'Radio frequency components' },
  { id: 'cat-connectors', name: 'Connectors', description: 'Headers, jacks, terminals' },
  { id: 'cat-cables', name: 'Cables', description: 'Wire, ribbon cables, patch cords' },
  { id: 'cat-mechanical', name: 'Mechanical', description: 'Screws, standoffs, enclosures' },
  { id: 'cat-tools', name: 'Tools', description: 'Hand tools, soldering gear' },
  { id: 'cat-test-eq', name: 'Test Equipment', description: 'Multimeters, oscilloscopes' }
];

export class WorkshopManager {
  private state: WorkshopState = {
    categories: [...DEFAULT_CATEGORIES],
    locations: [],
    items: []
  };

  constructor(private eventBus?: EventBus) {}

  // State Management
  public getState(): WorkshopState {
    return this.state;
  }

  public loadState(state: WorkshopState): void {
    this.state = state;
    if (this.state.categories.length === 0) {
      this.state.categories = [...DEFAULT_CATEGORIES];
    }
    this.notifyChange();
  }

  // --- Inventory Items CRUD ---

  public addItem(item: Omit<InventoryItem, 'id'>): InventoryItem {
    const newItem: InventoryItem = { ...item, id: generateUUID() };
    this.state.items.push(newItem);
    this.notifyChange();
    return newItem;
  }

  public updateItem(id: string, updates: Partial<InventoryItem>): boolean {
    const idx = this.state.items.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.state.items[idx] = { ...this.state.items[idx], ...updates };
      this.notifyChange();
      return true;
    }
    return false;
  }

  public deleteItem(id: string): boolean {
    const idx = this.state.items.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.state.items.splice(idx, 1);
      this.notifyChange();
      return true;
    }
    return false;
  }

  public getItem(id: string): InventoryItem | undefined {
    return this.state.items.find(i => i.id === id);
  }

  // --- Locations CRUD ---

  public addLocation(location: Omit<StorageLocation, 'id'>): StorageLocation {
    const newLocation: StorageLocation = { ...location, id: generateUUID() };
    this.state.locations.push(newLocation);
    this.notifyChange();
    return newLocation;
  }

  public updateLocation(id: string, updates: Partial<StorageLocation>): boolean {
    const idx = this.state.locations.findIndex(l => l.id === id);
    if (idx !== -1) {
      this.state.locations[idx] = { ...this.state.locations[idx], ...updates };
      this.notifyChange();
      return true;
    }
    return false;
  }

  public deleteLocation(id: string): boolean {
    const idx = this.state.locations.findIndex(l => l.id === id);
    if (idx !== -1) {
      this.state.locations.splice(idx, 1);
      // Remove locationId from items
      this.state.items.forEach(item => {
        if (item.locationId === id) item.locationId = undefined;
      });
      this.notifyChange();
      return true;
    }
    return false;
  }

  public getLocation(id: string): StorageLocation | undefined {
    return this.state.locations.find(l => l.id === id);
  }

  // --- Categories CRUD ---

  public addCategory(category: Omit<InventoryCategory, 'id'>): InventoryCategory {
    const newCategory: InventoryCategory = { ...category, id: generateUUID() };
    this.state.categories.push(newCategory);
    this.notifyChange();
    return newCategory;
  }

  public updateCategory(id: string, updates: Partial<InventoryCategory>): boolean {
    const idx = this.state.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.state.categories[idx] = { ...this.state.categories[idx], ...updates };
      this.notifyChange();
      return true;
    }
    return false;
  }

  public deleteCategory(id: string): boolean {
    const idx = this.state.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.state.categories.splice(idx, 1);
      this.notifyChange();
      return true;
    }
    return false;
  }

  public getCategory(id: string): InventoryCategory | undefined {
    return this.state.categories.find(c => c.id === id);
  }

  // --- Queries ---

  public searchItems(query: string, categoryId?: string, locationId?: string): InventoryItem[] {
    let results = this.state.items;
    
    if (categoryId) {
      results = results.filter(i => i.categoryId === categoryId);
    }
    
    if (locationId) {
      results = results.filter(i => i.locationId === locationId);
    }
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(i => 
        i.name.toLowerCase().includes(lowerQuery) || 
        (i.description && i.description.toLowerCase().includes(lowerQuery)) ||
        (i.mpn && i.mpn.toLowerCase().includes(lowerQuery))
      );
    }
    
    return results;
  }

  private notifyChange(): void {
    if (this.eventBus) {
      this.eventBus.publish({
        namespace: 'workshop',
        name: 'state_changed',
        payload: { state: this.state }
      });
    }
  }
}
