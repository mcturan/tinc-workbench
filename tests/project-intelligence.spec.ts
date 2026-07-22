import { ProjectIntelligenceEngine } from '../src/project-intelligence/engine';
import { ObjectEngine } from '../src/object-engine';
import { DeviceWorkspaceManager } from '../src/device-workspace/manager';
import { globalWorkshopManager } from '../src/workshop-manager';
import { clearLabels, createLabel } from '../src/net-labels';
import { generateUUID } from '../src/utils';

describe('Project Intelligence Engine', () => {
  let objectEngine: ObjectEngine;
  let deviceWorkspaceManager: DeviceWorkspaceManager;
  let engine: ProjectIntelligenceEngine;

  let defaultLayerId: string;

  beforeEach(() => {
    objectEngine = new ObjectEngine('proj-123', 'Test Project');
    deviceWorkspaceManager = new DeviceWorkspaceManager();
    engine = new ProjectIntelligenceEngine(objectEngine, deviceWorkspaceManager);
    
    defaultLayerId = deviceWorkspaceManager.getWorkspace().layers[0].id;

    // Setup an empty project
    objectEngine.addPage({
      id: 'page-1',
      name: 'Main Page',
      layers: [{ id: 'layer-1', name: 'Component Layer', visible: true, locked: false, objects: [] }],
      viewport: { zoom: 1, panX: 0, panY: 0 }
    });

    // Clear globals
    clearLabels();
    globalWorkshopManager.loadState({ categories: [], locations: [], items: [] });
  });

  it('should generate basic statistics', () => {
    // Add physical module
    deviceWorkspaceManager.addObject(defaultLayerId, {
      id: 'mod1',
      kind: 'module',
      layerId: defaultLayerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      moduleType: 'generic',
      width: 100,
      height: 100,
      visible: true,
      locked: false,
      selected: false
    });

    const summary = engine.analyze();
    expect(summary.statistics.physicalModuleCount).toBe(1);
    expect(summary.statistics.symbolCount).toBe(0);
    expect(summary.statistics.wireCount).toBe(0);
  });

  it('should compare inventory requirements and detect missing items', () => {
    // Add an object with an inventory reference that doesn't exist
    deviceWorkspaceManager.addObject(defaultLayerId, {
      id: 'mod1',
      kind: 'module',
      layerId: defaultLayerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      moduleType: 'generic',
      width: 100,
      height: 100,
      visible: true,
      locked: false,
      selected: false,
      inventoryItemId: 'missing-item-123'
    });

    const summary = engine.analyze();
    expect(summary.inventoryRequirements.length).toBe(1);
    expect(summary.inventoryRequirements[0].itemId).toBe('missing-item-123');
    expect(summary.inventoryRequirements[0].status).toBe('missing');
  });

  it('should compare inventory requirements and detect insufficient quantity', () => {
    // Create an item with qty 1
    const item = globalWorkshopManager.addItem({
      name: 'Resistor 10k',
      categoryId: 'cat-passives',
      quantity: 1,
      unit: 'pcs',
      properties: {}
    });

    // Add TWO objects requiring this item
    deviceWorkspaceManager.addObject(defaultLayerId, {
      id: 'mod1',
      kind: 'module',
      layerId: defaultLayerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      moduleType: 'generic',
      width: 100,
      height: 100,
      visible: true,
      locked: false,
      selected: false,
      inventoryItemId: item.id
    });
    deviceWorkspaceManager.addObject(defaultLayerId, {
      id: 'mod2',
      kind: 'module',
      layerId: defaultLayerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      moduleType: 'generic',
      width: 100,
      height: 100,
      visible: true,
      locked: false,
      selected: false,
      inventoryItemId: item.id
    });

    const summary = engine.analyze();
    expect(summary.inventoryRequirements.length).toBe(1);
    expect(summary.inventoryRequirements[0].status).toBe('insufficient');
    expect(summary.inventoryRequirements[0].requiredQuantity).toBe(2);
    expect(summary.inventoryRequirements[0].availableQuantity).toBe(1);
  });

  it('should generate health issues for duplicate labels', () => {
    createLabel('l1', 'VCC', 'Global', { x: 0, y: 0 }, 'obj1', 'pin1');
    createLabel('l2', 'VCC', 'Global', { x: 10, y: 0 }, 'obj2', 'pin1');
    createLabel('l3', 'VCC', 'Global', { x: 20, y: 0 }, 'obj3', 'pin1'); // 3rd makes it duplicate

    const summary = engine.analyze();
    const dupIssues = summary.healthIssues.filter(i => i.category === 'duplicate-label');
    expect(dupIssues.length).toBe(1);
    expect(dupIssues[0].message).toContain('3 times');
  });

  it('should generate health issues for disconnected physical modules', () => {
    // Add physical module with NO netId and NO inventory reference
    deviceWorkspaceManager.addObject(defaultLayerId, {
      id: 'mod1',
      kind: 'module',
      layerId: defaultLayerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      moduleType: 'generic',
      width: 100,
      height: 100,
      visible: true,
      locked: false,
      selected: false
    });

    const summary = engine.analyze();
    const discIssues = summary.healthIssues.filter(i => i.category === 'disconnected-module');
    expect(discIssues.length).toBe(1);
    expect(discIssues[0].targetObjectId).toBe('mod1');
  });
});
