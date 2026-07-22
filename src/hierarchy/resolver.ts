import { ObjectEngine } from '../object-engine';
import { getModule } from './module';
import { listInstances } from './instance';
import { ElectricalGraphInstance } from '../net-engine/graph';
import { ElectricalPinRef } from '../net-engine/types';
import { SemanticObject, LogicalConnection, Wire } from '../types';

import { resolveLabels } from '../net-labels/resolver';
import { resolveBuses } from '../pro-schematic/bus/resolver';
import { resolveConnectors } from '../pro-schematic/connectors/resolver';

export function resolveHierarchy(objectEngine: ObjectEngine): ElectricalGraphInstance {
  const graph = new ElectricalGraphInstance();

  function traverse(
    path: string,
    objects: SemanticObject[],
    connections: LogicalConnection[],
    _wires: Wire[]
  ) {
    for (const comp of objects) {
      const isInstance = listInstances().some(i => i.id === comp.id) || getModule(comp.type) !== undefined;
      const moduleDef = getModule(comp.type);

      if (isInstance && moduleDef) {
        traverse(
          `${path}${comp.id}/`,
          moduleDef.schematic.objects,
          moduleDef.schematic.connections,
          moduleDef.schematic.wires
        );
      } else {
        const ports = comp.ports || [];
        const pins = comp.pins || [];
        for (const port of ports) {
          const nodeKey = `${path}${comp.id}:${port.id}`;
          graph.nodes.set(nodeKey, { componentId: `${path}${comp.id}`, pinId: port.id });
        }
        for (const pin of pins) {
          const nodeKey = `${path}${comp.id}:${pin.id}`;
          graph.nodes.set(nodeKey, { componentId: `${path}${comp.id}`, pinId: pin.id });
        }
      }
    }

    function resolveEndpoint(endpoint: any): ElectricalPinRef | null {
      if (!endpoint || endpoint.type === 'FLOATING') {
        return null;
      }

      let targetComp: SemanticObject | null = null;
      let targetPinId: string | null = null;

      for (const obj of objects) {
        const hasPin = (obj.ports || []).some(p => p.id === endpoint.targetId) ||
                       (obj.pins || []).some(p => p.id === endpoint.targetId);
        if (hasPin) {
          targetComp = obj;
          targetPinId = endpoint.targetId;
          break;
        }
      }

      if (!targetComp) {
        return null;
      }

      const isInstance = listInstances().some(i => i.id === targetComp!.id) || getModule(targetComp!.type) !== undefined;
      if (isInstance) {
        const moduleDef = getModule(targetComp!.type);
        if (moduleDef) {
          const port = moduleDef.ports.find(p => p.id === targetPinId);
          if (port) {
            const subPath = `${path}${targetComp!.id}/`;
            const subComp = moduleDef.schematic.objects.find(o => o.id === port.internalComponentId);
            if (subComp) {
              const isSubInstance = listInstances().some(i => i.id === subComp.id) || getModule(subComp.type) !== undefined;
              if (isSubInstance) {
                return resolveEndpoint({
                  type: 'PORT',
                  targetId: port.internalPinId,
                });
              } else {
                return {
                  componentId: `${subPath}${port.internalComponentId}`,
                  pinId: port.internalPinId,
                };
              }
            }
          }
        }
      }

      return {
        componentId: `${path}${targetComp.id}`,
        pinId: targetPinId!,
      };
    }

    for (const conn of connections) {
      const srcPin = resolveEndpoint(conn.source);
      const tgtPin = resolveEndpoint(conn.target);

      if (srcPin && tgtPin) {
        graph.addEdge(conn.id, srcPin.componentId, srcPin.pinId, tgtPin.componentId, tgtPin.pinId);
      }
    }
  }

  const project = objectEngine.getProject();
  const topObjects: SemanticObject[] = [];
  for (const page of project.pages || []) {
    for (const layer of page.layers || []) {
      topObjects.push(...(layer.objects || []));
    }
  }
  const topConnections = objectEngine.getConnections();
  const topWires = objectEngine.getWires();

  traverse('', topObjects, topConnections, topWires);

  resolveLabels(objectEngine, graph);
  resolveBuses(objectEngine, graph);
  resolveConnectors(objectEngine, graph);

  graph.resolveNets();

  return graph;
}
