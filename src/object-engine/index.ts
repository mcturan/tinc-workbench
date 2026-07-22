import { generateUUID } from '../utils';
import {
  Project,
  Page,
  Layer,
  SemanticObject,
  Port,
  Pin,
  LogicalConnection,
  Wire,
  Endpoint,
  CanonicalEntity,
  CanonicalEntityKind,
} from '../types';

export class ObjectEngine {
  private project: Project;
  private registry: Map<string, CanonicalEntity> = new Map();
  private entityKinds: Map<string, CanonicalEntityKind> = new Map();
  private portPinMap: Map<string, string> = new Map();
  private connections: Map<string, LogicalConnection> = new Map();
  private wires: Map<string, Wire> = new Map();

  constructor(projectId: string, projectName: string) {
    this.project = {
      id: projectId,
      name: projectName,
      pages: [],
    };
    this.registry.set(projectId, this.project);
    this.entityKinds.set(projectId, 'Project');
  }

  getProject(): Project {
    return this.project;
  }

  clear(): void {
    this.project = { id: this.project.id, name: this.project.name, pages: [] };
    this.registry.clear();
    this.entityKinds.clear();
    this.portPinMap.clear();
    this.connections.clear();
    this.wires.clear();

    this.registry.set(this.project.id, this.project);
    this.entityKinds.set(this.project.id, 'Project');
  }

  getObject(id: string): CanonicalEntity | undefined {
    return this.registry.get(id);
  }

  addPage(page: Page): void {
    if (this.registry.has(page.id)) {
      throw new Error(`ID collision: ${page.id} already exists in registry`);
    }
    this.project.pages.push(page);
    this.registry.set(page.id, page);
    this.entityKinds.set(page.id, 'Page');
  }

  deletePage(id: string, resolvedCoordinates?: Record<string, { x: number; y: number }>): void {
    const idx = this.project.pages.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const page = this.project.pages[idx];

    // 1. Validation phase: verify references in all components under all layers
    for (const layer of page.layers) {
      for (const obj of layer.objects) {
        for (const port of obj.ports) {
          this.checkDanglingTerminalReference(port.id, resolvedCoordinates);
        }
        for (const pin of obj.pins) {
          this.checkDanglingTerminalReference(pin.id, resolvedCoordinates);
        }
      }
    }

    // 2. Mutation phase
    for (const layer of page.layers) {
      for (const obj of layer.objects) {
        this.cleanupComponentData(obj, resolvedCoordinates);
      }
      this.registry.delete(layer.id);
      this.entityKinds.delete(layer.id);
    }

    this.project.pages.splice(idx, 1);
    this.registry.delete(page.id);
    this.entityKinds.delete(page.id);
  }

  addLayer(pageId: string, layer: Layer): void {
    if (this.registry.has(layer.id)) {
      throw new Error(`ID collision: ${layer.id} already exists in registry`);
    }
    const page = this.getObject(pageId);
    if (!page || this.entityKinds.get(pageId) !== 'Page') {
      throw new Error(`Page ${pageId} not found`);
    }
    (page as Page).layers.push(layer);
    this.registry.set(layer.id, layer);
    this.entityKinds.set(layer.id, 'Layer');
  }

  deleteLayer(id: string, resolvedCoordinates?: Record<string, { x: number; y: number }>): void {
    let foundLayer: Layer | null = null;
    let foundPage: Page | null = null;
    for (const page of this.project.pages) {
      const idx = page.layers.findIndex((l) => l.id === id);
      if (idx !== -1) {
        foundLayer = page.layers[idx];
        foundPage = page;
        break;
      }
    }

    if (!foundLayer || !foundPage) return;

    // 1. Validation phase
    for (const obj of foundLayer.objects) {
      for (const port of obj.ports) {
        this.checkDanglingTerminalReference(port.id, resolvedCoordinates);
      }
      for (const pin of obj.pins) {
        this.checkDanglingTerminalReference(pin.id, resolvedCoordinates);
      }
    }

    // 2. Mutation phase
    for (const obj of foundLayer.objects) {
      this.cleanupComponentData(obj, resolvedCoordinates);
    }

    const idx = foundPage.layers.indexOf(foundLayer);
    if (idx !== -1) {
      foundPage.layers.splice(idx, 1);
    }
    this.registry.delete(foundLayer.id);
    this.entityKinds.delete(foundLayer.id);
  }

  addComponent(layerId: string, obj: SemanticObject): void {
    if (this.registry.has(obj.id)) {
      throw new Error(`ID collision: ${obj.id} already exists in registry`);
    }
    const layer = this.getObject(layerId);
    if (!layer || this.entityKinds.get(layerId) !== 'Layer') {
      throw new Error(`Layer ${layerId} not found`);
    }

    const incomingIds = new Set<string>();
    incomingIds.add(obj.id);

    for (const port of obj.ports) {
      if (this.registry.has(port.id) || incomingIds.has(port.id)) {
        throw new Error(`Port ID collision: ${port.id} already exists in registry`);
      }
      incomingIds.add(port.id);
    }
    for (const pin of obj.pins) {
      if (this.registry.has(pin.id) || incomingIds.has(pin.id)) {
        throw new Error(`Pin ID collision: ${pin.id} already exists in registry`);
      }
      incomingIds.add(pin.id);
    }

    (layer as Layer).objects.push(obj);
    this.registry.set(obj.id, obj);
    this.entityKinds.set(obj.id, 'SemanticObject');

    for (const port of obj.ports) {
      this.portPinMap.set(port.id, obj.id);
      this.registry.set(port.id, port);
      this.entityKinds.set(port.id, 'Port');
    }
    for (const pin of obj.pins) {
      this.portPinMap.set(pin.id, obj.id);
      this.registry.set(pin.id, pin);
      this.entityKinds.set(pin.id, 'Pin');
    }
  }

  deleteComponent(id: string, resolvedCoordinates?: Record<string, { x: number; y: number }>): void {
    let foundComponent: SemanticObject | null = null;
    let foundLayer: Layer | null = null;

    for (const page of this.project.pages) {
      for (const layer of page.layers) {
        const obj = layer.objects.find((o) => o.id === id);
        if (obj) {
          foundComponent = obj;
          foundLayer = layer;
          break;
        }
      }
      if (foundComponent) break;
    }

    if (!foundComponent || !foundLayer) return;

    // 1. Validation phase
    for (const port of foundComponent.ports) {
      this.checkDanglingTerminalReference(port.id, resolvedCoordinates);
    }
    for (const pin of foundComponent.pins) {
      this.checkDanglingTerminalReference(pin.id, resolvedCoordinates);
    }

    // 2. Mutation phase
    const idx = foundLayer.objects.indexOf(foundComponent);
    if (idx !== -1) {
      foundLayer.objects.splice(idx, 1);
    }
    this.cleanupComponentData(foundComponent, resolvedCoordinates);
  }

  private cleanupComponentData(obj: SemanticObject, resolvedCoordinates?: Record<string, { x: number; y: number }>): void {
    this.registry.delete(obj.id);
    this.entityKinds.delete(obj.id);

    for (const port of obj.ports) {
      this.portPinMap.delete(port.id);
      this.registry.delete(port.id);
      this.entityKinds.delete(port.id);
      this.handleDanglingTerminal(port.id, resolvedCoordinates);
    }
    for (const pin of obj.pins) {
      this.portPinMap.delete(pin.id);
      this.registry.delete(pin.id);
      this.entityKinds.delete(pin.id);
      this.handleDanglingTerminal(pin.id, resolvedCoordinates);
    }
  }

  private checkDanglingTerminalReference(terminalId: string, resolvedCoordinates?: Record<string, { x: number; y: number }>): void {
    for (const conn of this.connections.values()) {
      if (conn.source.type !== 'FLOATING' && conn.source.targetId === terminalId) {
        if (!resolvedCoordinates?.[terminalId]) {
          throw new Error(`Reference integrity violation: Port/Pin ${terminalId} is referenced by connection ${conn.id}, but no resolved coordinate was provided.`);
        }
      }
      if (conn.target.type !== 'FLOATING' && conn.target.targetId === terminalId) {
        if (!resolvedCoordinates?.[terminalId]) {
          throw new Error(`Reference integrity violation: Port/Pin ${terminalId} is referenced by connection ${conn.id}, but no resolved coordinate was provided.`);
        }
      }
    }
  }

  private handleDanglingTerminal(terminalId: string, resolvedCoordinates?: Record<string, { x: number; y: number }>): void {
    for (const conn of this.connections.values()) {
      if (conn.source.type !== 'FLOATING' && conn.source.targetId === terminalId) {
        const coord = resolvedCoordinates?.[terminalId];
        if (!coord) {
          throw new Error(`Reference integrity violation: Port/Pin ${terminalId} is referenced by connection ${conn.id}, but no resolved coordinate was provided.`);
        }
        conn.source = {
          type: 'FLOATING',
          coordinate: { ...coord },
        };
      }
      if (conn.target.type !== 'FLOATING' && conn.target.targetId === terminalId) {
        const coord = resolvedCoordinates?.[terminalId];
        if (!coord) {
          throw new Error(`Reference integrity violation: Port/Pin ${terminalId} is referenced by connection ${conn.id}, but no resolved coordinate was provided.`);
        }
        conn.target = {
          type: 'FLOATING',
          coordinate: { ...coord },
        };
      }
    }
  }

  addLogicalConnection(conn: LogicalConnection): void {
    if (this.registry.has(conn.id)) {
      throw new Error(`ID collision: ${conn.id} already exists in registry`);
    }

    this.validateEndpoint(conn.source);
    this.validateEndpoint(conn.target);

    this.connections.set(conn.id, conn);
    this.registry.set(conn.id, conn);
    this.entityKinds.set(conn.id, 'LogicalConnection');
  }

  deleteLogicalConnection(id: string): void {
    if (this.connections.has(id)) {
      this.connections.delete(id);
      this.registry.delete(id);
      this.entityKinds.delete(id);

      for (const [wireId, wire] of this.wires.entries()) {
        if (wire.logicalConnectionId === id) {
          this.wires.delete(wireId);
          this.registry.delete(wireId);
          this.entityKinds.delete(wireId);
        }
      }
    }
  }

  getLogicalConnection(id: string): LogicalConnection | undefined {
    return this.connections.get(id);
  }

  getConnections(): LogicalConnection[] {
    return Array.from(this.connections.values());
  }

  getWires(): Wire[] {
    return Array.from(this.wires.values());
  }

  getComponentByTerminalId(terminalId: string): SemanticObject | undefined {
    const compId = this.portPinMap.get(terminalId);
    if (!compId) return undefined;
    return this.getObject(compId) as SemanticObject;
  }

  private validateEndpoint(endpoint: Endpoint): void {
    if (endpoint.type === 'PORT' || endpoint.type === 'PIN') {
      if (!this.portPinMap.has(endpoint.targetId)) {
        throw new Error(`Endpoint reference violation: target ID ${endpoint.targetId} not found in ports/pins index`);
      }
    }
  }

  addWire(wire: Wire): void {
    if (this.registry.has(wire.id)) {
      throw new Error(`ID collision: ${wire.id} already exists in registry`);
    }
    if (!wire.logicalConnectionId) {
      throw new Error(`Wire logicalConnectionId cannot be empty`);
    }
    if (!this.connections.has(wire.logicalConnectionId)) {
      throw new Error(`Wire references non-existent logicalConnectionId: ${wire.logicalConnectionId}`);
    }

    this.wires.set(wire.id, wire);
    this.registry.set(wire.id, wire);
    this.entityKinds.set(wire.id, 'Wire');
  }

  deleteWire(id: string): void {
    if (this.wires.has(id)) {
      this.wires.delete(id);
      this.registry.delete(id);
      this.entityKinds.delete(id);
    }
  }

  getWire(id: string): Wire | undefined {
    return this.wires.get(id);
  }

  cloneObjects(ids: string[]): string[] {
    const idMap = new Map<string, string>();
    const clonedIds: string[] = [];

    // 1. Resolve requested entities and kinds
    const objectsToClone: CanonicalEntity[] = [];
    for (const id of ids) {
      const obj = this.getObject(id);
      if (!obj) {
        throw new Error(`Clone target ID ${id} not found`);
      }
      const kind = this.entityKinds.get(id);
      if (kind !== 'SemanticObject' && kind !== 'LogicalConnection' && kind !== 'Wire') {
        throw new Error(`Cloning entity kind ${kind} is not supported`);
      }
      objectsToClone.push(obj);
    }

    // 2. Generate UUID mappings
    for (const obj of objectsToClone) {
      const newId = generateUUID();
      idMap.set(obj.id, newId);

      const kind = this.entityKinds.get(obj.id)!;
      if (kind === 'SemanticObject') {
        const comp = obj as SemanticObject;
        for (const port of comp.ports) {
          idMap.set(port.id, generateUUID());
        }
        for (const pin of comp.pins) {
          idMap.set(pin.id, generateUUID());
        }
      }
    }

    // 3. Staging candidate clones
    const candidateRegistry = new Map<string, CanonicalEntity>();
    const candidatePortPinMap = new Map<string, string>();
    const candidateConnections = new Map<string, LogicalConnection>();
    const candidateWires = new Map<string, Wire>();
    const candidateKinds = new Map<string, CanonicalEntityKind>();

    const clonesToValidate: { kind: CanonicalEntityKind; clone: any }[] = [];
    const insertions: { layer: Layer; clone: SemanticObject }[] = [];

    for (const obj of objectsToClone) {
      const kind = this.entityKinds.get(obj.id)!;
      const newId = idMap.get(obj.id)!;

      if (this.registry.has(newId) || candidateRegistry.has(newId)) {
        throw new Error(`ID collision on clone: ${newId}`);
      }

      if (kind === 'SemanticObject') {
        const comp = obj as SemanticObject;
        const newPorts = comp.ports.map((p: Port) => {
          const newPortId = idMap.get(p.id)!;
          return { ...p, id: newPortId };
        });

        const newPins = comp.pins.map((p: Pin) => {
          const newPinId = idMap.get(p.id)!;
          return { ...p, id: newPinId };
        });

        const clone: SemanticObject = {
          ...JSON.parse(JSON.stringify(comp)),
          id: newId,
          ports: newPorts,
          pins: newPins,
        };

        candidateRegistry.set(newId, clone);
        candidateKinds.set(newId, 'SemanticObject');
        for (const p of newPorts) {
          candidatePortPinMap.set(p.id, newId);
          candidateRegistry.set(p.id, p);
          candidateKinds.set(p.id, 'Port');
        }
        for (const p of newPins) {
          candidatePortPinMap.set(p.id, newId);
          candidateRegistry.set(p.id, p);
          candidateKinds.set(p.id, 'Pin');
        }

        // Determine destination Layer by finding where the original belongs
        let originalLayer: Layer | null = null;
        for (const page of this.project.pages) {
          for (const layer of page.layers) {
            if (layer.objects.some((o) => o.id === comp.id)) {
              originalLayer = layer;
              break;
            }
          }
          if (originalLayer) break;
        }

        if (!originalLayer) {
          throw new Error(`Source layer not found for SemanticObject ${comp.id}`);
        }

        insertions.push({ layer: originalLayer, clone });
        clonedIds.push(newId);
        clonesToValidate.push({ kind, clone });

      } else if (kind === 'LogicalConnection') {
        const conn = obj as LogicalConnection;
        const clone: LogicalConnection = {
          ...JSON.parse(JSON.stringify(conn)),
          id: newId,
          source: this.cloneEndpoint(conn.source, idMap),
          target: this.cloneEndpoint(conn.target, idMap),
        };
        candidateConnections.set(newId, clone);
        candidateRegistry.set(newId, clone);
        candidateKinds.set(newId, 'LogicalConnection');
        clonedIds.push(newId);
        clonesToValidate.push({ kind, clone });

      } else if (kind === 'Wire') {
        const wire = obj as Wire;
        const clone: Wire = {
          ...JSON.parse(JSON.stringify(wire)),
          id: newId,
          logicalConnectionId: idMap.get(wire.logicalConnectionId) || wire.logicalConnectionId,
        };
        candidateWires.set(newId, clone);
        candidateRegistry.set(newId, clone);
        candidateKinds.set(newId, 'Wire');
        clonedIds.push(newId);
        clonesToValidate.push({ kind, clone });
      }
    }

    // 4. Validate references of candidate clones against existing + candidate state
    for (const item of clonesToValidate) {
      if (item.kind === 'LogicalConnection') {
        const conn = item.clone as LogicalConnection;
        const validateCandidateEndpoint = (endpoint: Endpoint) => {
          if (endpoint.type === 'PORT' || endpoint.type === 'PIN') {
            if (!this.portPinMap.has(endpoint.targetId) && !candidatePortPinMap.has(endpoint.targetId)) {
              throw new Error(`Endpoint reference violation: target ID ${endpoint.targetId} not found in ports/pins index`);
            }
          }
        };
        validateCandidateEndpoint(conn.source);
        validateCandidateEndpoint(conn.target);
      } else if (item.kind === 'Wire') {
        const wire = item.clone as Wire;
        if (!wire.logicalConnectionId) {
          throw new Error(`Cloned wire has empty logicalConnectionId`);
        }
        if (!this.connections.has(wire.logicalConnectionId) && !candidateConnections.has(wire.logicalConnectionId)) {
          throw new Error(`Cloned wire references non-existent logicalConnectionId: ${wire.logicalConnectionId}`);
        }
      }
    }

    // 5. Commit all staged clone mutations
    for (const ins of insertions) {
      ins.layer.objects.push(ins.clone);
    }

    for (const [k, v] of candidateRegistry) this.registry.set(k, v);
    for (const [k, v] of candidatePortPinMap) this.portPinMap.set(k, v);
    for (const [k, v] of candidateConnections) this.connections.set(k, v);
    for (const [k, v] of candidateWires) this.wires.set(k, v);
    for (const [k, v] of candidateKinds) this.entityKinds.set(k, v);

    return clonedIds;
  }

  private cloneEndpoint(endpoint: Endpoint, idMap: Map<string, string>): Endpoint {
    if (endpoint.type === 'PORT') {
      return {
        type: 'PORT',
        targetId: idMap.get(endpoint.targetId) || endpoint.targetId,
      };
    } else if (endpoint.type === 'PIN') {
      return {
        type: 'PIN',
        targetId: idMap.get(endpoint.targetId) || endpoint.targetId,
      };
    } else {
      return {
        type: 'FLOATING',
        coordinate: { ...endpoint.coordinate },
      };
    }
  }

  loadProjectGraph(project: Project, conns: LogicalConnection[], wiresList: Wire[]): void {
    const tempRegistry = new Map<string, CanonicalEntity>();
    const tempPortPinMap = new Map<string, string>();
    const tempConnections = new Map<string, LogicalConnection>();
    const tempWires = new Map<string, Wire>();
    const tempKinds = new Map<string, CanonicalEntityKind>();

    if (tempRegistry.has(project.id)) {
      throw new Error(`ID collision on Project hydration: ${project.id}`);
    }
    tempRegistry.set(project.id, project);
    tempKinds.set(project.id, 'Project');

    for (const page of project.pages) {
      if (tempRegistry.has(page.id)) {
        throw new Error(`ID collision on Page hydration: ${page.id}`);
      }
      tempRegistry.set(page.id, page);
      tempKinds.set(page.id, 'Page');

      for (const layer of page.layers) {
        if (tempRegistry.has(layer.id)) {
          throw new Error(`ID collision on Layer hydration: ${layer.id}`);
        }
        tempRegistry.set(layer.id, layer);
        tempKinds.set(layer.id, 'Layer');

        for (const obj of layer.objects) {
          if (tempRegistry.has(obj.id)) {
            throw new Error(`ID collision on Component hydration: ${obj.id}`);
          }
          tempRegistry.set(obj.id, obj);
          tempKinds.set(obj.id, 'SemanticObject');

          for (const port of obj.ports) {
            if (tempRegistry.has(port.id)) {
              throw new Error(`ID collision on Port hydration: ${port.id}`);
            }
            tempRegistry.set(port.id, port);
            tempKinds.set(port.id, 'Port');
            tempPortPinMap.set(port.id, obj.id);
          }

          for (const pin of obj.pins) {
            if (tempRegistry.has(pin.id)) {
              throw new Error(`ID collision on Pin hydration: ${pin.id}`);
            }
            tempRegistry.set(pin.id, pin);
            tempKinds.set(pin.id, 'Pin');
            tempPortPinMap.set(pin.id, obj.id);
          }
        }
      }
    }

    for (const conn of conns) {
      if (tempRegistry.has(conn.id)) {
        throw new Error(`ID collision on LogicalConnection hydration: ${conn.id}`);
      }

      const validateTempEndpoint = (endpoint: Endpoint) => {
        if (endpoint.type === 'PORT' || endpoint.type === 'PIN') {
          if (!tempPortPinMap.has(endpoint.targetId)) {
            throw new Error(`Endpoint reference violation: target ID ${endpoint.targetId} not found in ports/pins index during hydration`);
          }
        }
      };

      validateTempEndpoint(conn.source);
      validateTempEndpoint(conn.target);

      tempConnections.set(conn.id, conn);
      tempRegistry.set(conn.id, conn);
      tempKinds.set(conn.id, 'LogicalConnection');
    }

    for (const wire of wiresList) {
      if (tempRegistry.has(wire.id)) {
        throw new Error(`ID collision on Wire hydration: ${wire.id}`);
      }
      if (!wire.logicalConnectionId) {
        throw new Error(`Wire hydration error: logicalConnectionId cannot be empty`);
      }
      if (!tempConnections.has(wire.logicalConnectionId)) {
        throw new Error(`Wire references non-existent logicalConnectionId: ${wire.logicalConnectionId} during hydration`);
      }

      tempWires.set(wire.id, wire);
      tempRegistry.set(wire.id, wire);
      tempKinds.set(wire.id, 'Wire');
    }

    this.registry = tempRegistry;
    this.portPinMap = tempPortPinMap;
    this.connections = tempConnections;
    this.wires = tempWires;
    this.entityKinds = tempKinds;
    this.project = project;
  }
}
