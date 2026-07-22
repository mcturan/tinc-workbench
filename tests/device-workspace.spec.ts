import { ObjectEngine } from '../src/object-engine';
import { CommandEngine } from '../src/command-engine';
import { HistoryEngine } from '../src/history-engine';
import { EventBus } from '../src/event-bus';
import { DeviceWorkspaceManager } from '../src/device-workspace/manager';
import { DeviceObject } from '../src/device-workspace/types';
import { generateUUID } from '../src/utils';

describe('Device Workspace Foundations', () => {
  let eventBus: EventBus;
  let historyEngine: HistoryEngine;
  let objectEngine: ObjectEngine;
  let commandEngine: CommandEngine;
  let deviceManager: DeviceWorkspaceManager;

  beforeEach(() => {
    eventBus = new EventBus();
    objectEngine = new ObjectEngine('test-proj', 'Test');
    historyEngine = new HistoryEngine(eventBus, {
      executeReverse: (delta: any) => commandEngine.executeReverseDelta(delta),
      executeReplay: (delta: any) => commandEngine.executeReplay(delta)
    });
    commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);
    deviceManager = new DeviceWorkspaceManager();
    commandEngine.setDeviceManager(deviceManager);
  });

  it('should support component placement', () => {
    const layerId = deviceManager.getWorkspace().layers[0].id;
    const obj: DeviceObject = {
      id: 'test-module',
      kind: 'module',
      layerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      visible: true,
      locked: false,
      selected: false,
      moduleType: 'ESP32',
      width: 50000000,
      height: 25000000
    };

    commandEngine.dispatch({
      id: 'cmd-1',
      name: 'CreateDeviceObject',
      payload: { layerId, object: obj }
    });

    const found = deviceManager.getObject('test-module');
    expect(found).toBeDefined();
    expect(found?.kind).toBe('module');
  });

  it('should support rotation', () => {
    const layerId = deviceManager.getWorkspace().layers[0].id;
    const obj: DeviceObject = {
      id: 'test-module',
      kind: 'module',
      layerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      visible: true,
      locked: false,
      selected: false,
      moduleType: 'ESP32',
      width: 50000000,
      height: 25000000
    };

    commandEngine.dispatch({
      id: 'cmd-1',
      name: 'CreateDeviceObject',
      payload: { layerId, object: obj }
    });

    commandEngine.dispatch({
      id: 'cmd-2',
      name: 'UpdateDeviceObject',
      payload: { 
        objectId: 'test-module', 
        updates: { transform: { x: 0, y: 0, rotation: 90, mirrorX: false, mirrorY: false } },
        reverseUpdates: { transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false } }
      }
    });

    const found = deviceManager.getObject('test-module');
    expect(found?.transform.rotation).toBe(90);
  });

  it('should support undo / redo', () => {
    const layerId = deviceManager.getWorkspace().layers[0].id;
    const obj: DeviceObject = {
      id: 'test-undo',
      kind: 'module',
      layerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      visible: true,
      locked: false,
      selected: false,
      moduleType: 'Arduino',
      width: 50000000,
      height: 25000000
    };

    commandEngine.dispatch({
      id: 'cmd-undo-1',
      name: 'CreateDeviceObject',
      payload: { layerId, object: obj }
    });

    historyEngine.undo();
    expect(deviceManager.getObject('test-undo')).toBeUndefined();

    historyEngine.redo();
    expect(deviceManager.getObject('test-undo')).toBeDefined();
  });

  it('should support copy / paste (Duplicate)', () => {
    const layerId = deviceManager.getWorkspace().layers[0].id;
    const obj: DeviceObject = {
      id: 'test-copy',
      kind: 'module',
      layerId,
      transform: { x: 1000, y: 1000, rotation: 0, mirrorX: false, mirrorY: false },
      visible: true,
      locked: false,
      selected: false,
      moduleType: 'Relay',
      width: 50000000,
      height: 25000000
    };

    commandEngine.dispatch({
      id: 'cmd-copy-1',
      name: 'CreateDeviceObject',
      payload: { layerId, object: obj }
    });

    const duplicateObj = { ...obj, id: 'test-copy-2', transform: { ...obj.transform, x: 2000, y: 2000 } };
    commandEngine.dispatch({
      id: 'cmd-copy-2',
      name: 'CreateDeviceObject',
      payload: { layerId, object: duplicateObj }
    });

    expect(deviceManager.getObject('test-copy-2')).toBeDefined();
  });

  it('should support wiring', () => {
    const layerId = deviceManager.getWorkspace().layers[1].id;
    const obj: DeviceObject = {
      id: 'test-wire',
      kind: 'wire',
      layerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      visible: true,
      locked: false,
      selected: false,
      points: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }],
      color: '#ff0000',
      label: 'VCC'
    };

    commandEngine.dispatch({
      id: 'cmd-wire-1',
      name: 'CreateDeviceObject',
      payload: { layerId, object: obj }
    });

    const found = deviceManager.getObject('test-wire');
    expect(found?.kind).toBe('wire');
    if (found?.kind === 'wire') {
      expect(found.points.length).toBe(2);
      expect(found.color).toBe('#ff0000');
    }
  });

  it('should support perfboard', () => {
    const layerId = deviceManager.getWorkspace().layers[0].id;
    const obj: DeviceObject = {
      id: 'test-perf',
      kind: 'perfboard',
      layerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      visible: true,
      locked: false,
      selected: false,
      width: 50000000,
      height: 50000000,
      pitch: 2540000,
      rows: 10,
      cols: 10,
      view: 'top'
    };

    commandEngine.dispatch({
      id: 'cmd-perf-1',
      name: 'CreateDeviceObject',
      payload: { layerId, object: obj }
    });

    const found = deviceManager.getObject('test-perf');
    expect(found?.kind).toBe('perfboard');
  });

  it('should support breadboard', () => {
    const layerId = deviceManager.getWorkspace().layers[0].id;
    const obj: DeviceObject = {
      id: 'test-bread',
      kind: 'breadboard',
      layerId,
      transform: { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false },
      visible: true,
      locked: false,
      selected: false,
      size: 'half',
      width: 82000000,
      height: 55000000
    };

    commandEngine.dispatch({
      id: 'cmd-bread-1',
      name: 'CreateDeviceObject',
      payload: { layerId, object: obj }
    });

    const found = deviceManager.getObject('test-bread');
    expect(found?.kind).toBe('breadboard');
  });
  
  it('should support grouping', () => {
     // Currently we don't have a distinct 'group' entity, we select multiple objects and update them.
     // Testing multi-selection logic update.
     const layerId = deviceManager.getWorkspace().layers[0].id;
     commandEngine.dispatch({
        id: 'cmd-g1',
        name: 'CreateDeviceObject',
        payload: { layerId, object: { id: 'g1', kind: 'module', layerId, transform: { x:0, y:0, rotation:0, mirrorX:false, mirrorY:false }, visible:true, locked:false, selected:false, moduleType: 'A', width: 100, height: 100 } }
     });
     commandEngine.dispatch({
        id: 'cmd-g2',
        name: 'CreateDeviceObject',
        payload: { layerId, object: { id: 'g2', kind: 'module', layerId, transform: { x:100, y:100, rotation:0, mirrorX:false, mirrorY:false }, visible:true, locked:false, selected:false, moduleType: 'B', width: 100, height: 100 } }
     });
     
     commandEngine.dispatch({
         id: 'cmd-g3',
         name: 'UpdateDeviceObject',
         payload: { objectId: 'g1', updates: { selected: true }, reverseUpdates: { selected: false } }
     });
     commandEngine.dispatch({
         id: 'cmd-g4',
         name: 'UpdateDeviceObject',
         payload: { objectId: 'g2', updates: { selected: true }, reverseUpdates: { selected: false } }
     });
     
     expect(deviceManager.getObject('g1')?.selected).toBe(true);
     expect(deviceManager.getObject('g2')?.selected).toBe(true);
  });
});
