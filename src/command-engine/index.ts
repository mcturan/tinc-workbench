import { generateUUID } from '../utils';
import {
  Command,
  CommandResult,
  HistoryNode,
  HistoryDelta,
  DeltaAction,
  Page,
  SemanticObject,
  LogicalConnection,
  Wire,
  ValidationError,
  FatalIntegrityError,
} from '../types';
import { ObjectEngine } from '../object-engine';
import { HistoryEngine } from '../history-engine';
import { EventBus } from '../event-bus';
import { GeometryEngine } from '../geometry-engine';

export interface CommandHandler {
  validate(payload: any, objectEngine: ObjectEngine): void;
  execute(payload: any, objectEngine: ObjectEngine): HistoryDelta;
}

export class CommandEngine {
  private handlers: Map<string, CommandHandler> = new Map();
  private boardManager?: any;
  private symbolManager?: any;
  private deviceManager?: any;

  constructor(
    private objectEngine: ObjectEngine,
    private historyEngine: HistoryEngine,
    private eventBus: EventBus
  ) {
    this.registerDefaultHandlers();
  }

  setBoardManager(bm: any): void {
    this.boardManager = bm;
  }

  setSymbolManager(sm: any): void {
    this.symbolManager = sm;
  }

  setDeviceManager(dm: any): void {
    this.deviceManager = dm;
  }

  registerHandler(name: string, handler: CommandHandler): void {
    this.handlers.set(name, handler);
  }

  dispatch(command: Command): CommandResult {
    const handler = this.handlers.get(command.name);
    if (!handler) {
      return { success: false, error: `Command handler for ${command.name} not found` };
    }

    try {
      // 1. Validation phase
      handler.validate(command.payload, this.objectEngine);

      // 2. Execution phase
      const delta = handler.execute(command.payload, this.objectEngine);

      if (command.name.endsWith('Footprint') ||
          command.name.endsWith('Footprints') ||
          command.name === 'SetBoardOutline' ||
          command.name.endsWith('Track') ||
          command.name.endsWith('Tracks') ||
          command.name.endsWith('Via') ||
          command.name.endsWith('Zone') ||
          command.name.endsWith('DeviceObject') ||
          command.name === 'UpdateProjectDocumentation') {
        for (const action of delta.forward) {
          this.applyDeltaAction(action);
        }
      }

      // 3. History recording phase
      const nodeId = command.id;
      const parentId = this.historyEngine.getActiveNodeId();
      const cleanDelta = sanitizeHistoryDelta(delta);

      try {
        const historyNode: HistoryNode = {
          id: nodeId,
          parentId,
          commandId: command.id,
          description: `Executed ${command.name}`,
          timestamp: command.timestamp ?? Date.now(),
          delta: cleanDelta,
        };
        this.historyEngine.pushNode(historyNode);
      } catch (historyError) {
        // Rollback on history failure
        try {
          this.executeReverseDelta(delta);
        } catch (rollbackError) {
          throw new FatalIntegrityError(`FATAL: Mutation succeeded but History recording failed, and rollback also failed. State is desynchronized. Rollback error: ${rollbackError}`);
        }
        throw historyError;
      }

      // 4. Event publication phase
      try {
        this.eventBus.publish({
          namespace: 'command',
          name: 'executed',
          payload: { commandId: command.id, delta },
        });
      } catch {
        // Event bus subscriber failures do not roll back state or history
      }

      return { success: true };

    } catch (err: any) {
      if (err instanceof FatalIntegrityError) {
        throw err;
      }
      return { success: false, error: err.message || String(err) };
    }
  }

  executeTransaction(commands: Command[], transactionId?: string): CommandResult {
    const appliedDeltas: HistoryDelta[] = [];
    const tId = transactionId ?? generateUUID();

    try {
      // 1. Validation phase (validate all first)
      for (const cmd of commands) {
        const handler = this.handlers.get(cmd.name);
        if (!handler) {
          throw new ValidationError(`Command handler for ${cmd.name} not found`);
        }
        handler.validate(cmd.payload, this.objectEngine);
      }

      // 2. Execution phase
      for (const cmd of commands) {
        const handler = this.handlers.get(cmd.name)!;
        const delta = handler.execute(cmd.payload, this.objectEngine);
        appliedDeltas.push(delta);

        if (cmd.name.endsWith('Footprint') ||
            cmd.name.endsWith('Footprints') ||
            cmd.name === 'SetBoardOutline' ||
            cmd.name.endsWith('Track') ||
            cmd.name.endsWith('Tracks') ||
            cmd.name.endsWith('Via') ||
            cmd.name.endsWith('Zone')) {
          for (const action of delta.forward) {
            this.applyDeltaAction(action);
          }
        }
      }

      // Merge all deltas
      const mergedDelta: HistoryDelta = {
        forward: appliedDeltas.flatMap((d) => d.forward),
        reverse: appliedDeltas.flatMap((d) => d.reverse).reverse(),
      };

      // 3. History recording
      const nodeId = tId;
      const parentId = this.historyEngine.getActiveNodeId();

      try {
        const historyNode: HistoryNode = {
          id: nodeId,
          parentId,
          commandId: tId,
          description: `Transaction ${tId}`,
          timestamp: Date.now(),
          delta: mergedDelta,
        };
        this.historyEngine.pushNode(historyNode);
      } catch (historyError) {
        try {
          this.executeReverseDelta(mergedDelta);
        } catch (rollbackError) {
          throw new FatalIntegrityError(`FATAL: Transaction succeeded but History recording failed, and rollback also failed. State is desynchronized. Rollback error: ${rollbackError}`);
        }
        throw historyError;
      }

      // 4. Event publication
      try {
        this.eventBus.publish({
          namespace: 'command',
          name: 'executed',
          payload: { commandId: tId, delta: mergedDelta },
        });
      } catch {
        // Event bus subscriber failures isolated
      }

      return { success: true };

    } catch (err: any) {
      if (err instanceof FatalIntegrityError) {
        throw err;
      }
      // Rollback any executed commands in reverse order
      for (let i = appliedDeltas.length - 1; i >= 0; i--) {
        try {
          this.executeReverseDelta(appliedDeltas[i]);
        } catch (rollbackErr) {
          throw new FatalIntegrityError(`FATAL: Transaction execution failed and rollback also failed. State is corrupt. Rollback error: ${rollbackErr}`);
        }
      }
      return { success: false, error: err.message || String(err) };
    }
  }

  executeReverseDelta(delta: HistoryDelta): boolean {
    for (const action of delta.reverse) {
      this.applyDeltaAction(action);
    }
    return true;
  }

  executeReplay(delta: HistoryDelta): boolean {
    for (const action of delta.forward) {
      this.applyDeltaAction(action);
    }
    return true;
  }

  private applyDeltaAction(action: DeltaAction): void {
    switch (action.type) {
      case 'CREATE_PAGE':
        this.objectEngine.addPage(action.page);
        break;
      case 'DELETE_PAGE':
        this.objectEngine.deletePage(action.pageId, action.resolvedCoordinates);
        break;
      case 'CREATE_LAYER':
        this.objectEngine.addLayer(action.pageId, action.layer);
        break;
      case 'DELETE_LAYER':
        this.objectEngine.deleteLayer(action.layerId, action.resolvedCoordinates);
        break;
      case 'CREATE_COMPONENT':
        this.objectEngine.addComponent(action.layerId, action.component);
        break;
      case 'DELETE_COMPONENT':
        this.objectEngine.deleteComponent(action.componentId, action.resolvedCoordinates);
        break;
      case 'CREATE_CONNECTION':
        this.objectEngine.addLogicalConnection(action.connection);
        break;
      case 'DELETE_CONNECTION':
        this.objectEngine.deleteLogicalConnection(action.connectionId);
        break;
      case 'CREATE_WIRE':
        this.objectEngine.addWire(action.wire);
        break;
      case 'DELETE_WIRE':
        this.objectEngine.deleteWire(action.wireId);
        break;
      case 'MOVE_COMPONENT': {
        const comp = this.objectEngine.getObject(action.componentId) as SemanticObject;
        if (comp) {
          comp.properties.x = action.x;
          comp.properties.y = action.y;
        }
        if (action.wireUpdates) {
          for (const update of action.wireUpdates) {
            const wire = this.objectEngine.getWire(update.wireId);
            if (wire) {
              wire.segments = update.segments;
            }
          }
        }
        break;
      }
      case 'CREATE_FOOTPRINT':
        if (this.boardManager) {
          this.boardManager.addFootprint(action.boardId, action.footprint);
        }
        break;
      case 'DELETE_FOOTPRINT':
        if (this.boardManager) {
          this.boardManager.removeFootprint(action.boardId, action.footprintId);
        }
        break;
      case 'UPDATE_FOOTPRINT':
        if (this.boardManager) {
          const fp = this.boardManager.getBoard(action.boardId)?.footprints.find((f: any) => f.id === action.footprintId);
          if (fp) {
            Object.assign(fp, action.updates);
          }
        }
        break;
      case 'CREATE_PCB_OBJECT':
        if (this.boardManager) {
          this.boardManager.addObject(action.boardId, action.object);
        }
        break;
      case 'DELETE_PCB_OBJECT':
        if (this.boardManager) {
          this.boardManager.removeObject(action.boardId, action.objectId);
        }
        break;
      case 'UPDATE_PCB_OBJECT':
        if (this.boardManager) {
          const obj = this.boardManager.getBoard(action.boardId)?.objects.find((o: any) => o.id === action.objectId);
          if (obj) {
            Object.assign(obj, action.updates);
          }
        }
        break;
      case 'SET_BOARD_OUTLINE':
        if (this.boardManager) {
          this.boardManager.setBoardOutline(action.boardId, action.outline);
        }
        break;
      case 'CREATE_SYMBOL_ITEM':
        if (this.symbolManager) {
          this.symbolManager.addItem(action.docId, action.item);
        }
        break;
      case 'DELETE_SYMBOL_ITEM':
        if (this.symbolManager) {
          this.symbolManager.removeItem(action.docId, action.itemId);
        }
        break;
      case 'UPDATE_SYMBOL_ITEM':
        if (this.symbolManager) {
          this.symbolManager.updateItem(action.docId, action.itemId, action.updates);
        }
        break;
      case 'UPDATE_PROJECT_DOCUMENTATION': {
        const project = this.objectEngine.getProject();
        project.documentation = action.doc ? JSON.parse(JSON.stringify(action.doc)) : undefined;
        break;
      }
      case 'CREATE_DEVICE_OBJECT':
        if (this.deviceManager) {
          this.deviceManager.addObject(action.layerId, action.object);
        }
        break;
      case 'DELETE_DEVICE_OBJECT':
        if (this.deviceManager) {
          this.deviceManager.removeObject(action.objectId);
        }
        break;
      case 'UPDATE_DEVICE_OBJECT':
        if (this.deviceManager) {
          this.deviceManager.updateObject(action.objectId, action.updates);
        }
        break;
      default:
        throw new Error(`Unknown DeltaAction type: ${(action as any).type}`);
    }
  }

  private registerDefaultHandlers(): void {
    // 1. CreatePage
    this.registerHandler('CreatePage', {
      validate(payload: any, objectEngine: ObjectEngine) {
        if (objectEngine.getObject(payload.page.id)) {
          throw new ValidationError(`Page ${payload.page.id} already exists`);
        }
      },
      execute(payload: any, objectEngine: ObjectEngine) {
        const page = payload.page;
        objectEngine.addPage(page);
        return {
          forward: [{ type: 'CREATE_PAGE', page }],
          reverse: [{ type: 'DELETE_PAGE', pageId: page.id }],
        };
      },
    });

    // 2. DeletePage
    this.registerHandler('DeletePage', {
      validate(payload: any, objectEngine: ObjectEngine) {
        if (!objectEngine.getObject(payload.pageId)) {
          throw new ValidationError(`Page ${payload.pageId} not found`);
        }
      },
      execute(payload: any, objectEngine: ObjectEngine) {
        const pageId = payload.pageId;
        const page = objectEngine.getObject(pageId) as Page;
        const pageClone = JSON.parse(JSON.stringify(page)) as Page;

        // Apply deletion
        objectEngine.deletePage(pageId, payload.resolvedCoordinates);

        // Reverse delta must recreate the page, its layers, and components
        const reverseActions: DeltaAction[] = [];
        reverseActions.push({ type: 'CREATE_PAGE', page: pageClone });
        for (const layer of pageClone.layers) {
          reverseActions.push({ type: 'CREATE_LAYER', pageId, layer });
          for (const obj of layer.objects) {
            reverseActions.push({ type: 'CREATE_COMPONENT', layerId: layer.id, component: obj });
          }
        }

        return {
          forward: [
            payload.resolvedCoordinates !== undefined
              ? { type: 'DELETE_PAGE', pageId, resolvedCoordinates: payload.resolvedCoordinates }
              : { type: 'DELETE_PAGE', pageId }
          ],
          reverse: reverseActions,
        };
      },
    });

    // 3. CreateLayer
    this.registerHandler('CreateLayer', {
      validate(payload: any, objectEngine: ObjectEngine) {
        if (objectEngine.getObject(payload.layer.id)) {
          throw new ValidationError(`Layer ${payload.layer.id} already exists`);
        }
      },
      execute(payload: any, objectEngine: ObjectEngine) {
        const pageId = payload.pageId;
        const layer = payload.layer;
        objectEngine.addLayer(pageId, layer);
        return {
          forward: [{ type: 'CREATE_LAYER', pageId, layer }],
          reverse: [{ type: 'DELETE_LAYER', layerId: layer.id }],
        };
      },
    });

    // 4. CreateComponent (CreateObject)
    this.registerHandler('CreateComponent', {
      validate(payload: any, objectEngine: ObjectEngine) {
        if (objectEngine.getObject(payload.component.id)) {
          throw new ValidationError(`Component ${payload.component.id} already exists`);
        }
      },
      execute(payload: any, objectEngine: ObjectEngine) {
        const layerId = payload.layerId;
        const component = payload.component;
        objectEngine.addComponent(layerId, component);
        return {
          forward: [{ type: 'CREATE_COMPONENT', layerId, component }],
          reverse: [
            payload.resolvedCoordinates !== undefined
              ? { type: 'DELETE_COMPONENT', componentId: component.id, resolvedCoordinates: payload.resolvedCoordinates }
              : { type: 'DELETE_COMPONENT', componentId: component.id }
          ],
        };
      },
    });

    // 5. DeleteComponent
    this.registerHandler('DeleteComponent', {
      validate(payload: any, objectEngine: ObjectEngine) {
        if (!objectEngine.getObject(payload.componentId)) {
          throw new ValidationError(`Component ${payload.componentId} not found`);
        }
      },
      execute(payload: any, objectEngine: ObjectEngine) {
        const componentId = payload.componentId;
        const comp = objectEngine.getObject(componentId) as SemanticObject;
        const compClone = JSON.parse(JSON.stringify(comp)) as SemanticObject;

        let layerId = '';
        for (const page of objectEngine.getProject().pages) {
          for (const layer of page.layers) {
            if (layer.objects.some((o) => o.id === componentId)) {
              layerId = layer.id;
              break;
            }
          }
          if (layerId) break;
        }

        objectEngine.deleteComponent(componentId, payload.resolvedCoordinates);

        return {
          forward: [
            payload.resolvedCoordinates !== undefined
              ? { type: 'DELETE_COMPONENT', componentId, resolvedCoordinates: payload.resolvedCoordinates }
              : { type: 'DELETE_COMPONENT', componentId }
          ],
          reverse: [{ type: 'CREATE_COMPONENT', layerId, component: compClone }],
        };
      },
    });

    // 6. CreateConnection
    this.registerHandler('CreateConnection', {
      validate(payload: any, objectEngine: ObjectEngine) {
        if (objectEngine.getObject(payload.connection.id)) {
          throw new ValidationError(`Connection ${payload.connection.id} already exists`);
        }
      },
      execute(payload: any, objectEngine: ObjectEngine) {
        const connection = payload.connection;
        objectEngine.addLogicalConnection(connection);
        return {
          forward: [{ type: 'CREATE_CONNECTION', connection }],
          reverse: [{ type: 'DELETE_CONNECTION', connectionId: connection.id }],
        };
      },
    });

    // 7. DeleteConnection
    this.registerHandler('DeleteConnection', {
      validate(payload: any, objectEngine: ObjectEngine) {
        if (!objectEngine.getLogicalConnection(payload.connectionId)) {
          throw new ValidationError(`Connection ${payload.connectionId} not found`);
        }
      },
      execute(payload: any, objectEngine: ObjectEngine) {
        const connectionId = payload.connectionId;
        const conn = objectEngine.getLogicalConnection(connectionId)!;
        const connClone = JSON.parse(JSON.stringify(conn)) as LogicalConnection;

        objectEngine.deleteLogicalConnection(connectionId);

        return {
          forward: [{ type: 'DELETE_CONNECTION', connectionId }],
          reverse: [{ type: 'CREATE_CONNECTION', connection: connClone }],
        };
      },
    });

    // 8. CreateWire
    this.registerHandler('CreateWire', {
      validate(payload: any, objectEngine: ObjectEngine) {
        if (objectEngine.getObject(payload.wire.id)) {
          throw new ValidationError(`Wire ${payload.wire.id} already exists`);
        }
      },
      execute(payload: any, objectEngine: ObjectEngine) {
        const wire = payload.wire;
        objectEngine.addWire(wire);
        return {
          forward: [{ type: 'CREATE_WIRE', wire }],
          reverse: [{ type: 'DELETE_WIRE', wireId: wire.id }],
        };
      },
    });

    this.registerHandler('UpdateProjectDocumentation', {
      validate(payload: any, oe: ObjectEngine) {
        if (!payload || !('doc' in payload)) throw new Error('Missing documentation payload');
      },
      execute(payload: any, oe: ObjectEngine) {
        const doc = payload.doc ? JSON.parse(JSON.stringify(payload.doc)) : undefined;
        const prevDoc = oe.getProject().documentation ? JSON.parse(JSON.stringify(oe.getProject().documentation)) : undefined;
        // Don't call oe.getProject() mutation here, the delta application does it.
        return {
          forward: [{ type: 'UPDATE_PROJECT_DOCUMENTATION', doc }],
          reverse: [{ type: 'UPDATE_PROJECT_DOCUMENTATION', doc: prevDoc }],
        };
      }
    });

    this.registerHandler('CreateDeviceObject', {
      validate(payload: any) {
        if (!payload.layerId || !payload.object) throw new ValidationError('Missing layerId or object');
      },
      execute(payload: any) {
        return {
          forward: [{ type: 'CREATE_DEVICE_OBJECT', layerId: payload.layerId, object: payload.object }],
          reverse: [{ type: 'DELETE_DEVICE_OBJECT', objectId: payload.object.id }]
        };
      }
    });

    this.registerHandler('DeleteDeviceObject', {
      validate(payload: any) {
         if (!payload.objectId) throw new ValidationError('Missing objectId');
      },
      execute(payload: any, oe: ObjectEngine) {
        // Need a reference to deviceManager to get the full object clone.
        // We assume payload includes 'objectClone' if we want reverse.
        return {
          forward: [{ type: 'DELETE_DEVICE_OBJECT', objectId: payload.objectId }],
          reverse: payload.objectClone ? [{ type: 'CREATE_DEVICE_OBJECT', layerId: payload.layerId, object: payload.objectClone }] : []
        };
      }
    });

    this.registerHandler('UpdateDeviceObject', {
      validate(payload: any) {
         if (!payload.objectId || !payload.updates) throw new ValidationError('Missing objectId or updates');
      },
      execute(payload: any) {
        return {
          forward: [{ type: 'UPDATE_DEVICE_OBJECT', objectId: payload.objectId, updates: payload.updates }],
          reverse: [{ type: 'UPDATE_DEVICE_OBJECT', objectId: payload.objectId, updates: payload.reverseUpdates }]
        };
      }
    });

    // 9. DeleteWire
    this.registerHandler('DeleteWire', {
      validate(payload: any, objectEngine: ObjectEngine) {
        if (!objectEngine.getWire(payload.wireId)) {
          throw new ValidationError(`Wire ${payload.wireId} not found`);
        }
      },
      execute(payload: any, objectEngine: ObjectEngine) {
        const wireId = payload.wireId;
        const wire = objectEngine.getWire(wireId)!;
        const wireClone = JSON.parse(JSON.stringify(wire)) as Wire;

        objectEngine.deleteWire(wireId);

        return {
          forward: [{ type: 'DELETE_WIRE', wireId }],
          reverse: [{ type: 'CREATE_WIRE', wire: wireClone }],
        };
      },
    });

    // 10. MoveComponent
    this.registerHandler('MoveComponent', {
      validate(payload: any, objectEngine: ObjectEngine) {
        const comp = objectEngine.getObject(payload.componentId);
        if (!comp) {
          throw new ValidationError(`Component ${payload.componentId} not found`);
        }
      },
      execute(payload: any, objectEngine: ObjectEngine) {
        const comp = objectEngine.getObject(payload.componentId) as SemanticObject;
        const oldX = comp.properties.x ?? 0;
        const oldY = comp.properties.y ?? 0;

        // Apply new coordinates temporarily to resolve new terminal locations
        comp.properties.x = payload.x;
        comp.properties.y = payload.y;

        const geometryEngine = new GeometryEngine();
        const affectedWires: { wireId: string; oldSegments: any[]; newSegments: any[] }[] = [];

        for (const conn of objectEngine.getConnections()) {
          const sourceComp = conn.source.type !== 'FLOATING' ? objectEngine.getComponentByTerminalId(conn.source.targetId) : undefined;
          const targetComp = conn.target.type !== 'FLOATING' ? objectEngine.getComponentByTerminalId(conn.target.targetId) : undefined;

          const sourceIsAffected = sourceComp !== undefined && sourceComp.id === payload.componentId;
          const targetIsAffected = targetComp !== undefined && targetComp.id === payload.componentId;

          if (sourceIsAffected || targetIsAffected) {
            const wire = objectEngine.getWires().find(w => w.logicalConnectionId === conn.id);
            if (wire) {
              const oldSegments = JSON.parse(JSON.stringify(wire.segments));

              let startPt = oldSegments[0].start;
              let endPt = oldSegments[oldSegments.length - 1].end;

              if (conn.source.type !== 'FLOATING' && sourceComp) {
                startPt = geometryEngine.getTerminalWorldCoordinate(sourceComp, conn.source.targetId);
              }
              if (conn.target.type !== 'FLOATING' && targetComp) {
                endPt = geometryEngine.getTerminalWorldCoordinate(targetComp, conn.target.targetId);
              }

              const newSegments = geometryEngine.routeManhattan(startPt, endPt);
              affectedWires.push({
                wireId: wire.id,
                oldSegments,
                newSegments,
              });
            }
          }
        }

        // Apply the new segments to the actual wires in the engine
        for (const update of affectedWires) {
          const wire = objectEngine.getWire(update.wireId)!;
          wire.segments = update.newSegments;
        }

        return {
          forward: [
            {
              type: 'MOVE_COMPONENT',
              componentId: payload.componentId,
              x: payload.x,
              y: payload.y,
              wireUpdates: affectedWires.map(w => ({ wireId: w.wireId, segments: w.newSegments }))
            }
          ],
          reverse: [
            {
              type: 'MOVE_COMPONENT',
              componentId: payload.componentId,
              x: oldX,
              y: oldY,
              wireUpdates: affectedWires.map(w => ({ wireId: w.wireId, segments: w.oldSegments }))
            }
          ],
        };
      },
    });
  }
}

function sanitizeHistoryDelta(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeHistoryDelta);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = sanitizeHistoryDelta(val);
    }
  }
  return result;
}
