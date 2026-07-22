import { ObjectEngine } from '../src/object-engine';
import { PersistenceManager, PersistenceStorage } from '../src/persistence';

class MockStorage implements PersistenceStorage {
  private items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  clear(): void {
    this.items.clear();
  }
}

describe('Persistence, Project Format & Session Recovery Tests', () => {
  let objectEngine: ObjectEngine;
  let storage: MockStorage;
  let manager: PersistenceManager;

  beforeEach(() => {
    objectEngine = new ObjectEngine('p-123', 'My Awesome Project');
    storage = new MockStorage();

    objectEngine.addPage({
      id: 'page-1',
      name: 'Main Board',
      layers: [],
      viewport: { zoom: 1.2, panX: 10, panY: 20 },
    });
    objectEngine.addLayer('page-1', {
      id: 'layer-1',
      name: 'Signals',
      visible: true,
      locked: false,
      objects: [],
    });

    manager = new PersistenceManager(objectEngine, storage);
  });

  describe('Serialization', () => {
    it('should serialize project format with canonical fields and metadata', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'LED',
        name: 'Indicator LED',
        ports: [],
        pins: [],
        properties: { x: 50, y: 150 },
      });

      const jsonStr = manager.saveAs({ author: 'Alice Developer', projectName: 'LED Blink' });
      const data = JSON.parse(jsonStr);

      expect(data.version).toBe('1.0.0');
      expect(data.metadata.author).toBe('Alice Developer');
      expect(data.metadata.projectName).toBe('LED Blink');
      expect(data.project.id).toBe('p-123');

      const page = data.project.pages[0];
      expect(page.id).toBe('page-1');
      expect(page.layers[0].objects[0].id).toBe('comp-1');
    });

    it('should ignore transient states (viewport zooms, pans, hovers, selections)', () => {
      const jsonStr = manager.saveAs();
      const data = JSON.parse(jsonStr);

      expect(data.project.pages[0].viewport.zoom).toBe(1.2);
      expect(data.selectedIds).toBeUndefined();
      expect(data.hoveredPinId).toBeUndefined();
    });
  });

  describe('Validation & Deserialization', () => {
    it('should reject malformed JSON content gracefully', () => {
      const result = manager.validateProjectFile('{ invalid json: ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Malformed JSON');

      const openResult = manager.openProject('{ invalid json: ');
      expect(openResult.success).toBe(false);
    });

    it('should reject unsupported versions', () => {
      const corruptedFormat = {
        version: '9.9.9',
        metadata: { projectName: 'Future Proj', author: 'AI', createdAt: '', modifiedAt: '', applicationVersion: '' },
        project: { id: 'p-future', name: 'Future', pages: [] },
        wires: [],
        connections: [],
      };

      const result = manager.openProject(JSON.stringify(corruptedFormat));
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported project format version');
    });

    it('should reject duplicate object and wire IDs', () => {
      const duplicateFormat = {
        version: '1.0.0',
        metadata: { projectName: 'Duplicate Proj', author: 'Human', createdAt: '', modifiedAt: '', applicationVersion: '' },
        project: {
          id: 'p-dup',
          name: 'Duplicate',
          pages: [
            {
              id: 'page-1',
              name: 'Sheet 1',
              layers: [
                {
                  id: 'layer-1',
                  name: 'L1',
                  visible: true,
                  locked: false,
                  objects: [
                    { id: 'dup-id', type: 'LED', name: 'L1', ports: [], pins: [], properties: {} },
                    { id: 'dup-id', type: 'LED', name: 'L2', ports: [], pins: [], properties: {} },
                  ],
                },
              ],
              viewport: { zoom: 1, panX: 0, panY: 0 },
            },
          ],
        },
        wires: [],
        connections: [],
      };

      const result = manager.openProject(JSON.stringify(duplicateFormat));
      expect(result.success).toBe(false);
      expect(result.error).toContain('Duplicate object ID detected');
    });

    it('should reject missing registered component definitions', () => {
      const unknownCompFormat = {
        version: '1.0.0',
        metadata: { projectName: 'Unknown Component Proj', author: 'Human', createdAt: '', modifiedAt: '', applicationVersion: '' },
        project: {
          id: 'p-unk',
          name: 'Unknown',
          pages: [
            {
              id: 'page-1',
              name: 'Sheet 1',
              layers: [
                {
                  id: 'layer-1',
                  name: 'L1',
                  visible: true,
                  locked: false,
                  objects: [
                    { id: 'c-1', type: 'UnknownDeviceType', name: 'U1', ports: [], pins: [], properties: {} },
                  ],
                },
              ],
              viewport: { zoom: 1, panX: 0, panY: 0 },
            },
          ],
        },
        wires: [],
        connections: [],
      };

      const result = manager.openProject(JSON.stringify(unknownCompFormat));
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing component definition/metadata');
    });
  });

  describe('Autosave', () => {
    it('should handle dirty state detection correctly', () => {
      const autosave = manager.getAutosaveService();
      expect(autosave.isDirty()).toBe(false);

      objectEngine.addComponent('layer-1', {
        id: 'comp-new',
        type: 'LED',
        name: 'New LED',
        ports: [],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      expect(autosave.isDirty()).toBe(true);
    });

    it('should prevent duplicate writes if state is unchanged', () => {
      const autosave = manager.getAutosaveService();
      expect(autosave.triggerAutosave()).toBe(false);

      objectEngine.addComponent('layer-1', {
        id: 'comp-new',
        type: 'LED',
        name: 'New LED',
        ports: [],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      expect(autosave.triggerAutosave()).toBe(true);
      expect(autosave.triggerAutosave()).toBe(false);
    });
  });

  describe('Session Recovery', () => {
    it('should detect, validate, and restore session snapshots without auto-restoring', () => {
      const recovery = manager.getRecoveryService();
      expect(recovery.hasRecoverySnapshot()).toBe(false);

      const snapshot = manager.saveAs({ projectName: 'Recoverable Project' });
      storage.setItem('tinc_recovery_snapshot', snapshot);

      expect(recovery.hasRecoverySnapshot()).toBe(true);
      expect(recovery.getRecoveryMetadata().projectName).toBe('Recoverable Project');

      manager.createProject('empty-project', 'Empty Canvas');
      expect(objectEngine.getProject().name).toBe('Empty Canvas');

      const recovered = manager.recover();
      expect(recovered).toBe(true);
      expect(objectEngine.getProject().name).toBe('My Awesome Project');

      expect(recovery.hasRecoverySnapshot()).toBe(false);
    });
  });

  describe('Round-trip Serialization', () => {
    it('should preserve full project integrity on write/load round-trips', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-r',
        type: 'LED',
        name: 'Resonator LED',
        ports: [],
        pins: [],
        properties: { x: 15, y: 35 },
      });

      const serialized = manager.saveProject();
      const newEngine = new ObjectEngine('p-new', 'Blank Canvas');
      const deserializer = manager.openProject.bind(new PersistenceManager(newEngine, storage));

      const loadResult = deserializer(serialized);
      expect(loadResult.success).toBe(true);

      const restoredProject = newEngine.getProject();
      expect(restoredProject.id).toBe('p-123');
      expect(restoredProject.name).toBe('My Awesome Project');
      expect(restoredProject.pages[0].layers[0].objects[0].name).toBe('Resonator LED');
    });
  });
});
