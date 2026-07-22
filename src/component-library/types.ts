export interface VisualMetadata {
  symbol: string;
  width: number;
  height: number;
}

export interface GeometryPin {
  id: string;
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GeometryMetadata {
  body: string;
  pins: GeometryPin[];
  boundingBox: BoundingBox;
}

export type PinDirection =
  | 'input'
  | 'output'
  | 'bidirectional'
  | 'passive'
  | 'power_input'
  | 'power_output'
  | 'unspecified';

export interface ElectricalPin {
  id: string;
  name: string;
  aliases: string[];
  electricalType: string;
  direction: PinDirection;
  voltageDomain?: string;
}

export interface KnowledgeMetadata {
  notes: string[];
  warnings: string[];
  applications: string[];
  tags: string[];
}

export interface TVCSMetadata {
  manufacturer: string;
  series: string;
  family: string;
  variant: string;
  tags: string[];
  package: string;
  footprint: string;
  physicalDimensions: {
    widthMm: number;
    lengthMm: number;
    heightMm: number;
  };
  datasheetUrl?: string;
  electrical: {
    operatingVoltageMin: number;
    operatingVoltageMax: number;
    logicVoltage: number;
  };
  interfaces: string[];
  protocols: string[];
  categoryPath: string[];
}

export interface ComponentMetadata {
  id: string;
  name: string;
  aliases: string[];
  keywords: string[];
  description: string;
  tvcs?: TVCSMetadata;
  visual: VisualMetadata;
  geometry: GeometryMetadata;
  electrical: {
    pins: ElectricalPin[];
  };
  knowledge: KnowledgeMetadata;
}
