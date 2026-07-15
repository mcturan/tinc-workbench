import { randomUUID } from 'crypto';
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

export interface CommandHandler {
  validate(payload: any, objectEngine: ObjectEngine): void;
  execute(payload: any, objectEngine: ObjectEngine): HistoryDelta;
}

export class CommandEngine {
  private handlers: Map<string, CommandHandler> = new Map();

  constructor(
    private objectEngine: ObjectEngine,
    private historyEngine: HistoryEngine,
    private eventBus: EventBus
  ) {
    this.registerDefaultHandlers();
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

      // 3. History recording phase
      const nodeId = command.id;
      const parentId = this.historyEngine.getActiveNodeId();

      try {
        const historyNode: HistoryNode = {
          id: nodeId,
          parentId,
          commandId: command.id,
          description: `Executed ${command.name}`,
          timestamp: command.timestamp ?? Date.now(),
          delta,
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
    const tId = transactionId ?? randomUUID();

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
  }
}
