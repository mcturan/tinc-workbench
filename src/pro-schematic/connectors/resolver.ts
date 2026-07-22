import { listConnectors } from './manager';
import { ElectricalGraphInstance } from '../../net-engine/graph';
import { ObjectEngine } from '../../object-engine';
import { listInstances } from '../../hierarchy';

export function resolveConnectors(objectEngine: ObjectEngine, graph: ElectricalGraphInstance): void {
  const connectors = listConnectors();
  if (connectors.length === 0) return;

  const instances = listInstances();

  for (const conn of connectors) {
    if (!conn.targetObjectId || !conn.targetPinId) continue;

    if (conn.scope === 'Local') {
      const pathPrefix = conn.targetObjectId.includes('/')
        ? conn.targetObjectId.substring(0, conn.targetObjectId.lastIndexOf('/'))
        : '';

      const matches = connectors.filter(other => {
        if (other.id <= conn.id || other.scope !== 'Local' || other.name !== conn.name) return false;
        if (!other.targetObjectId || !other.targetPinId) return false;
        const otherPrefix = other.targetObjectId.includes('/')
          ? other.targetObjectId.substring(0, other.targetObjectId.lastIndexOf('/'))
          : '';
        return otherPrefix === pathPrefix;
      });

      for (const m of matches) {
        graph.addEdge(
          `conn-local-${conn.id}-${m.id}`,
          conn.targetObjectId,
          conn.targetPinId,
          m.targetObjectId!,
          m.targetPinId!
        );
      }
    } else if (conn.scope === 'Global') {
      const matches = connectors.filter(other => {
        return other.id > conn.id && other.scope === 'Global' && other.name === conn.name && other.targetObjectId && other.targetPinId;
      });

      for (const m of matches) {
        graph.addEdge(
          `conn-global-${conn.id}-${m.id}`,
          conn.targetObjectId,
          conn.targetPinId,
          m.targetObjectId!,
          m.targetPinId!
        );
      }
    } else if (conn.scope === 'Hierarchical' || conn.scope === 'Sheet') {
      const lastSlash = conn.targetObjectId.lastIndexOf('/');
      if (lastSlash !== -1) {
        const parentPath = conn.targetObjectId.substring(0, lastSlash);
        const parentInst = instances.find(inst => inst.id === parentPath);
        if (parentInst) {
          graph.addEdge(
            `conn-hier-${conn.id}`,
            parentPath,
            conn.name,
            conn.targetObjectId,
            conn.targetPinId
          );
        }
      }
    }
  }
}
