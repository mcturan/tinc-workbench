import { ObjectEngine } from '../object-engine';
import { ElectricalGraphInstance } from './graph';

export class ElectricalGraphBuilder {
  build(objectEngine: ObjectEngine): ElectricalGraphInstance {
    const graph = new ElectricalGraphInstance();

    const project = objectEngine.getProject();
    for (const page of project.pages || []) {
      for (const layer of page.layers || []) {
        for (const comp of layer.objects || []) {
          const ports = comp.ports || [];
          const pins = comp.pins || [];

          for (const port of ports) {
            graph.addNode(comp.id, port.id);
          }
          for (const pin of pins) {
            graph.addNode(comp.id, pin.id);
          }
        }
      }
    }

    const connections = objectEngine.getConnections();
    for (const conn of connections) {
      const src = conn.source;
      const tgt = conn.target;

      if ((src.type === 'PORT' || src.type === 'PIN') && (tgt.type === 'PORT' || tgt.type === 'PIN')) {
        const srcTarget = src.targetId;
        const tgtTarget = tgt.targetId;

        if (srcTarget && tgtTarget) {
          let srcTerminalId = srcTarget;
          let tgtTerminalId = tgtTarget;

          let srcComp = objectEngine.getComponentByTerminalId(srcTerminalId);
          if (!srcComp && srcTarget.includes(':')) {
            const parts = srcTarget.split(':');
            srcTerminalId = parts[1];
            srcComp = objectEngine.getComponentByTerminalId(srcTerminalId);
          }

          let tgtComp = objectEngine.getComponentByTerminalId(tgtTerminalId);
          if (!tgtComp && tgtTarget.includes(':')) {
            const parts = tgtTarget.split(':');
            tgtTerminalId = parts[1];
            tgtComp = objectEngine.getComponentByTerminalId(tgtTerminalId);
          }

          if (srcComp && tgtComp) {
            graph.addEdge(conn.id, srcComp.id, srcTerminalId, tgtComp.id, tgtTerminalId);
          }
        }
      }
    }

    graph.resolveNets();

    return graph;
  }
}
