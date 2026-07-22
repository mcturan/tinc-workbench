import { WorkshopManager, globalWorkshopManager } from '../src/workshop-manager';
import { InventoryItem } from '../src/workshop-manager/types';

describe('Workshop Manager', () => {
  let manager: WorkshopManager;

  beforeEach(() => {
    // Reset global manager for test isolation, or use a new instance
    manager = new WorkshopManager();
  });

  it('should initialize with default categories', () => {
    const state = manager.getState();
    expect(state.categories.length).toBeGreaterThan(0);
    expect(state.items.length).toBe(0);
  });

  it('should create, read, update, and delete inventory items', () => {
    // Create
    const item = manager.addItem({
      name: 'Resistor 10k',
      categoryId: 'cat-passives',
      quantity: 100,
      unit: 'pcs',
      properties: {}
    });
    expect(item.id).toBeDefined();
    expect(item.name).toBe('Resistor 10k');

    // Read
    const fetched = manager.getItem(item.id);
    expect(fetched).toEqual(item);

    // Update
    manager.updateItem(item.id, { quantity: 50 });
    expect(manager.getItem(item.id)?.quantity).toBe(50);

    // Delete
    const deleted = manager.deleteItem(item.id);
    expect(deleted).toBe(true);
    expect(manager.getItem(item.id)).toBeUndefined();
  });

  it('should manage storage locations', () => {
    const loc = manager.addLocation({
      name: 'Drawer 1',
      description: 'Top drawer'
    });
    expect(loc.id).toBeDefined();

    manager.updateLocation(loc.id, { name: 'Drawer A1' });
    expect(manager.getLocation(loc.id)?.name).toBe('Drawer A1');

    manager.deleteLocation(loc.id);
    expect(manager.getLocation(loc.id)).toBeUndefined();
  });

  it('should search items by query and category', () => {
    manager.addItem({ name: 'Capacitor 100nF', categoryId: 'cat-passives', quantity: 10, unit: 'pcs', properties: {} });
    manager.addItem({ name: 'ATmega328P', categoryId: 'cat-ics', quantity: 5, unit: 'pcs', properties: {} });

    const passives = manager.searchItems('', 'cat-passives');
    expect(passives.length).toBe(1);
    expect(passives[0].name).toBe('Capacitor 100nF');

    const searchResults = manager.searchItems('atmega');
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].name).toBe('ATmega328P');
  });

  it('should clear item locationId when a location is deleted', () => {
    const loc = manager.addLocation({ name: 'Box 1' });
    const item = manager.addItem({
      name: 'LED Red',
      categoryId: 'cat-passives',
      quantity: 20,
      unit: 'pcs',
      locationId: loc.id,
      properties: {}
    });

    expect(manager.getItem(item.id)?.locationId).toBe(loc.id);
    manager.deleteLocation(loc.id);
    expect(manager.getItem(item.id)?.locationId).toBeUndefined();
  });
});
