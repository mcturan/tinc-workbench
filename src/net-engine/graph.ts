import { ElectricalPinRef, ElectricalEdge, ElectricalNet, ElectricalGraph } from './types';
import { GraphTraversal } from './traversal';

export class ElectricalGraphInstance implements ElectricalGraph {
  nodes = new Map<string, ElectricalPinRef>();
  edges: ElectricalEdge[] = [];
  nets = new Map<string, ElectricalNet>();
  pinToNetMap = new Map<string, string>();
  adjacencyList = new Map<string, Set<string>>();
  private traversal = new GraphTraversal();

  addNode(componentId: string, pinId: string): void {
    const key = `${componentId}:${pinId}`;
    if (!this.nodes.has(key)) {
      this.nodes.set(key, { componentId, pinId });
    }
  }

  addEdge(edgeId: string, srcComp: string, srcPin: string, tgtComp: string, tgtPin: string): void {
    const srcKey = `${srcComp}:${srcPin}`;
    const tgtKey = `${tgtComp}:${tgtPin}`;

    this.addNode(srcComp, srcPin);
    this.addNode(tgtComp, tgtPin);

    this.edges.push({
      id: edgeId,
      source: { componentId: srcComp, pinId: srcPin },
      target: { componentId: tgtComp, pinId: tgtPin },
    });

    if (!this.adjacencyList.has(srcKey)) this.adjacencyList.set(srcKey, new Set());
    if (!this.adjacencyList.has(tgtKey)) this.adjacencyList.set(tgtKey, new Set());

    this.adjacencyList.get(srcKey)!.add(tgtKey);
    this.adjacencyList.get(tgtKey)!.add(srcKey);
  }

  resolveNets(): void {
    this.nets.clear();
    this.pinToNetMap.clear();

    const visited = new Set<string>();
    let netCounter = 0;

    const pinKeys = Array.from(this.nodes.keys()).sort();

    for (const key of pinKeys) {
      if (visited.has(key)) continue;

      const componentKeys = this.traversal.findConnectedComponent(key, this.adjacencyList);

      const netId = `NET_${netCounter++}`;
      const netPins = componentKeys.map(k => this.nodes.get(k)!);

      const net: ElectricalNet = {
        id: netId,
        name: `Net ${netId}`,
        pins: netPins,
      };

      this.nets.set(netId, net);
      for (const k of componentKeys) {
        visited.add(k);
        this.pinToNetMap.set(k, netId);
      }
    }
  }

  getNet(netId: string): ElectricalNet | undefined {
    return this.nets.get(netId);
  }

  getNetByPin(componentId: string, pinId: string): ElectricalNet | undefined {
    const key = `${componentId}:${pinId}`;
    const netId = this.pinToNetMap.get(key);
    if (!netId) return undefined;
    return this.nets.get(netId);
  }

  getPins(componentId: string): ElectricalPinRef[] {
    const result: ElectricalPinRef[] = [];
    for (const node of this.nodes.values()) {
      if (node.componentId === componentId) {
        result.push(node);
      }
    }
    return result.sort((a, b) => a.pinId.localeCompare(b.pinId));
  }

  getConnectedPins(componentId: string, pinId: string): ElectricalPinRef[] {
    const key = `${componentId}:${pinId}`;
    const neighbors = this.adjacencyList.get(key);
    if (!neighbors) return [];

    return Array.from(neighbors)
      .map(k => this.nodes.get(k)!)
      .sort((a, b) => `${a.componentId}:${a.pinId}`.localeCompare(`${b.componentId}:${b.pinId}`));
  }

  getConnectedComponents(componentId: string): string[] {
    const connectedComps = new Set<string>();
    const compPins = this.getPins(componentId);

    for (const pin of compPins) {
      const neighbors = this.getConnectedPins(pin.componentId, pin.pinId);
      for (const n of neighbors) {
        if (n.componentId !== componentId) {
          connectedComps.add(n.componentId);
        }
      }
    }

    return Array.from(connectedComps).sort();
  }

  trace(componentId: string, pinId: string): ElectricalPinRef[] {
    const key = `${componentId}:${pinId}`;
    if (!this.nodes.has(key)) return [];

    const componentKeys = this.traversal.findConnectedComponent(key, this.adjacencyList);
    return componentKeys.map(k => this.nodes.get(k)!);
  }

  findPath(
    startCompId: string,
    startPinId: string,
    endCompId: string,
    endPinId: string
  ): ElectricalPinRef[] | null {
    const startKey = `${startCompId}:${startPinId}`;
    const endKey = `${endCompId}:${endPinId}`;

    if (!this.nodes.has(startKey) || !this.nodes.has(endKey)) return null;

    const pathKeys = this.traversal.findPath(startKey, endKey, this.adjacencyList);
    if (!pathKeys) return null;

    return pathKeys.map(k => this.nodes.get(k)!);
  }

  listNets(): ElectricalNet[] {
    return Array.from(this.nets.values()).sort((a, b) => a.id.localeCompare(b.id));
  }
}
