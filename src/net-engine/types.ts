
export interface ElectricalPinRef {
  componentId: string;
  pinId: string;
}

export interface ElectricalEdge {
  id: string;
  source: ElectricalPinRef;
  target: ElectricalPinRef;
}

export interface ElectricalNet {
  id: string;
  name: string;
  pins: ElectricalPinRef[];
}

export interface ElectricalGraph {
  nodes: Map<string, ElectricalPinRef>;
  edges: ElectricalEdge[];
  nets: Map<string, ElectricalNet>;
  pinToNetMap: Map<string, string>;
}
