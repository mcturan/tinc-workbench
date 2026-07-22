import { ObjectEngine } from '../object-engine';
import { ElectricalGraphInstance } from './graph';
import { ConstraintDiagnostic } from '../constraint-engine/types';
import { SemanticObject } from '../types';

export class NetValidator {
  validate(objectEngine: ObjectEngine, graph: ElectricalGraphInstance): ConstraintDiagnostic[] {
    const diagnostics: ConstraintDiagnostic[] = [];

    // 1. Detect isolated pins
    for (const [key, ref] of graph.nodes.entries()) {
      const neighbors = graph.adjacencyList.get(key);
      if (!neighbors || neighbors.size === 0) {
        diagnostics.push({
          id: `NET-VAL-001-${key}`,
          severity: 'INFO',
          code: 'ISOLATED_PIN',
          title: 'Isolated Pin',
          message: `Pin ${ref.pinId} on component ${ref.componentId} is unconnected.`,
          sourceObjectId: ref.componentId,
          sourcePinId: ref.pinId,
          targetObjectId: '',
          targetPinId: '',
        });
      }
    }

    // 2. Detect orphan wires
    const wires = objectEngine.getWires();
    for (const wire of wires) {
      if (!wire.logicalConnectionId) {
        diagnostics.push({
          id: `NET-VAL-002-${wire.id}`,
          severity: 'WARNING',
          code: 'ORPHAN_WIRE_NO_CONNECTION',
          title: 'Orphan Wire',
          message: `Wire ${wire.id} does not reference a logical connection ID.`,
          sourceObjectId: '',
          sourcePinId: '',
          targetObjectId: '',
          targetPinId: '',
        });
      } else {
        const conn = objectEngine.getLogicalConnection(wire.logicalConnectionId);
        if (!conn) {
          diagnostics.push({
            id: `NET-VAL-003-${wire.id}`,
            severity: 'ERROR',
            code: 'ORPHAN_WIRE_MISSING_CONNECTION',
            title: 'Broken Wire Connection Reference',
            message: `Wire ${wire.id} references non-existent logical connection: ${wire.logicalConnectionId}`,
            sourceObjectId: '',
            sourcePinId: '',
            targetObjectId: '',
            targetPinId: '',
          });
        }
      }
    }

    // 3. Detect broken references and invalid endpoints in logical connections
    const connections = objectEngine.getConnections();
    const seenEdges = new Set<string>();

    for (const conn of connections) {
      const src = conn.source;
      const tgt = conn.target;

      if (src.type === 'FLOATING' || tgt.type === 'FLOATING') {
        diagnostics.push({
          id: `NET-VAL-004-${conn.id}`,
          severity: 'WARNING',
          code: 'FLOATING_ENDPOINT',
          title: 'Floating Endpoint Connection',
          message: `Connection ${conn.id} contains a floating endpoint.`,
          sourceObjectId: '',
          sourcePinId: '',
          targetObjectId: '',
          targetPinId: '',
        });
        continue;
      }

      const srcTarget = src.targetId;
      const tgtTarget = tgt.targetId;

      if (!srcTarget || !tgtTarget) {
        diagnostics.push({
          id: `NET-VAL-005-${conn.id}`,
          severity: 'ERROR',
          code: 'INVALID_ENDPOINT_FORMAT',
          title: 'Invalid Endpoint Format',
          message: `Connection ${conn.id} has missing pin/port references.`,
          sourceObjectId: '',
          sourcePinId: '',
          targetObjectId: '',
          targetPinId: '',
        });
        continue;
      }

      let srcTerminalId = srcTarget;
      let srcObj = objectEngine.getComponentByTerminalId(srcTerminalId) as SemanticObject | undefined;
      if (!srcObj && srcTarget.includes(':')) {
        const parts = srcTarget.split(':');
        srcTerminalId = parts[1];
        srcObj = objectEngine.getComponentByTerminalId(srcTerminalId) as SemanticObject | undefined;
      }

      let tgtTerminalId = tgtTarget;
      let tgtObj = objectEngine.getComponentByTerminalId(tgtTerminalId) as SemanticObject | undefined;
      if (!tgtObj && tgtTarget.includes(':')) {
        const parts = tgtTarget.split(':');
        tgtTerminalId = parts[1];
        tgtObj = objectEngine.getComponentByTerminalId(tgtTerminalId) as SemanticObject | undefined;
      }

      const srcCompId = srcObj ? srcObj.id : '';
      const tgtCompId = tgtObj ? tgtObj.id : '';

      if (!srcObj) {
        diagnostics.push({
          id: `NET-VAL-006-${conn.id}`,
          severity: 'ERROR',
          code: 'BROKEN_COMPONENT_REFERENCE',
          title: 'Broken Component Reference',
          message: `Connection ${conn.id} references missing component or pin: ${srcTarget}`,
          sourceObjectId: '',
          sourcePinId: srcTerminalId,
          targetObjectId: tgtCompId,
          targetPinId: tgtTerminalId,
        });
      } else {
        const allPortsPins = [...(srcObj.ports || []), ...(srcObj.pins || [])];
        if (!allPortsPins.some(p => p.id === srcTerminalId)) {
          diagnostics.push({
            id: `NET-VAL-007-${conn.id}`,
            severity: 'ERROR',
            code: 'BROKEN_PIN_REFERENCE',
            title: 'Broken Pin Reference',
            message: `Connection ${conn.id} references missing pin ${srcTerminalId} on component ${srcObj.id}`,
            sourceObjectId: srcObj.id,
            sourcePinId: srcTerminalId,
            targetObjectId: tgtCompId,
            targetPinId: tgtTerminalId,
          });
        }
      }

      if (!tgtObj) {
        diagnostics.push({
          id: `NET-VAL-008-${conn.id}`,
          severity: 'ERROR',
          code: 'BROKEN_COMPONENT_REFERENCE',
          title: 'Broken Component Reference',
          message: `Connection ${conn.id} references missing component or pin: ${tgtTarget}`,
          sourceObjectId: srcCompId,
          sourcePinId: srcTerminalId,
          targetObjectId: '',
          targetPinId: tgtTerminalId,
        });
      } else {
        const allPortsPins = [...(tgtObj.ports || []), ...(tgtObj.pins || [])];
        if (!allPortsPins.some(p => p.id === tgtTerminalId)) {
          diagnostics.push({
            id: `NET-VAL-009-${conn.id}`,
            severity: 'ERROR',
            code: 'BROKEN_PIN_REFERENCE',
            title: 'Broken Pin Reference',
            message: `Connection ${conn.id} references missing pin ${tgtTerminalId} on component ${tgtObj.id}`,
            sourceObjectId: srcCompId,
            sourcePinId: srcTerminalId,
            targetObjectId: tgtObj.id,
            targetPinId: tgtTerminalId,
          });
        }
      }

      // 4. Duplicate edge detection
      const edgeKey1 = `${srcTerminalId}->${tgtTerminalId}`;
      const edgeKey2 = `${tgtTerminalId}->${srcTerminalId}`;

      if (seenEdges.has(edgeKey1) || seenEdges.has(edgeKey2)) {
        diagnostics.push({
          id: `NET-VAL-010-${conn.id}`,
          severity: 'ERROR',
          code: 'DUPLICATE_EDGE',
          title: 'Duplicate Edge Connection',
          message: `Duplicate connection detected between ${srcTerminalId} and ${tgtTerminalId}`,
          sourceObjectId: srcCompId,
          sourcePinId: srcTerminalId,
          targetObjectId: tgtCompId,
          targetPinId: tgtTerminalId,
        });
      }
      seenEdges.add(edgeKey1);
      seenEdges.add(edgeKey2);
    }

    return diagnostics;
  }
}
