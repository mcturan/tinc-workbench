export type DeprecationState = 'active' | 'deprecated' | 'obsolete';

export interface PinGroup {
  name: string;
  pins: string[];
}

export interface SymbolPin {
  id: string;
  name: string;
  number?: string; // New for Symbol Editor
  direction: 'input' | 'output' | 'bidirectional' | 'passive' | 'tri-state' | 'power_input' | 'power_output' | 'unspecified';
  length?: number;
  x?: number;
  y?: number;
  rotation?: number;
  visible?: boolean;
}

export interface SymbolUnit {
  id: string;
  name: string;
  pins: SymbolPin[];
  pinGroups?: PinGroup[];
}

export type SymbolGraphicKind = 'line' | 'rect' | 'circle' | 'arc' | 'polyline' | 'text';

export interface SymbolTransform {
  x: number;
  y: number;
  rotation: number;
}

export interface BaseSymbolGraphic {
  id: string;
  kind: SymbolGraphicKind;
  transform: SymbolTransform;
  selected?: boolean;
  locked?: boolean;
}

export interface SymbolLine extends BaseSymbolGraphic {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineWidth: number;
  color?: string;
}

export interface SymbolRect extends BaseSymbolGraphic {
  kind: 'rect';
  width: number;
  height: number;
  lineWidth: number;
  fill?: string;
  color?: string;
}

export interface SymbolCircle extends BaseSymbolGraphic {
  kind: 'circle';
  radius: number;
  lineWidth: number;
  fill?: string;
  color?: string;
}

export interface SymbolArc extends BaseSymbolGraphic {
  kind: 'arc';
  radius: number;
  startAngle: number;
  endAngle: number;
  lineWidth: number;
  color?: string;
}

export interface SymbolPolyline extends BaseSymbolGraphic {
  kind: 'polyline';
  points: {x: number, y: number}[];
  lineWidth: number;
  fill?: string;
  color?: string;
}

export interface SymbolText extends BaseSymbolGraphic {
  kind: 'text';
  text: string;
  textType: 'reference' | 'value' | 'user';
  fontSize: number;
  alignment: 'left' | 'center' | 'right';
  visible: boolean;
}

export type SymbolGraphic = SymbolLine | SymbolRect | SymbolCircle | SymbolArc | SymbolPolyline | SymbolText;

export interface SymbolVariant {
  id: string;
  name: string;
  graphicsPath?: string;
  graphics?: SymbolGraphic[]; // Native primitives
  pins: SymbolPin[];
}

export interface SymbolDefinition {
  id: string;
  displayName: string;
  internalName: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  aliases: string[];
  keywords: string[];
  version: string;
  author: string;
  license: string;
  creationDate: string;
  lastModificationDate: string;
  deprecationState: DeprecationState;
  variants: SymbolVariant[];
  units: SymbolUnit[];
  alternateViews: string[];
  parentSymbolId?: string; // For inheritance
}

export interface FootprintDefinition {
  id: string;
  name: string;
  description: string;
  packageDimensions: {
    height: number;
    width: number;
    length: number;
    weight: number;
  };
  padCount: number;
  mountType: 'SMD' | 'THT' | 'Other';
  ipcMetadata: Record<string, any>;
  courtyardMetadata: Record<string, any>;
  keepoutMetadata: Record<string, any>;
}

export interface ElectricalMetadata {
  voltage?: { min?: number; nominal?: number; max?: number; unit: string };
  current?: { nominal?: number; max?: number; unit: string };
  power?: { max?: number; unit: string };
  frequency?: { max?: number; unit: string };
}

export interface MechanicalMetadata {
  packageType: string;
  height: number;
  width: number;
  weight: number;
}

export interface CommercialMetadata {
  manufacturer: string;
  mpn: string;
  supplier?: string;
  lifecycle: 'Pre-release' | 'Active' | 'NRND' | 'EOL' | 'Obsolete';
  availability: number;
  rohs: boolean;
  reach: boolean;
}

export interface DocumentationMetadata {
  datasheet?: string;
  applicationNotes?: string[];
  referenceManual?: string;
  manufacturerUrl?: string;
}

export interface DeviceMetadata {
  electrical: ElectricalMetadata;
  mechanical: MechanicalMetadata;
  commercial: CommercialMetadata;
  documentation: DocumentationMetadata;
}

export interface ManufacturerPart {
  manufacturer: string;
  mpn: string;
  packageOption: string;
  lifecycle: 'Pre-release' | 'Active' | 'NRND' | 'EOL' | 'Obsolete';
  availability: number;
}

export interface PinMapping {
  symbolPinId: string;
  footprintPadId: string;
  functionName: string;
}

export interface DeviceDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  symbolIds: string[];
  footprintIds: string[];
  manufacturerParts: ManufacturerPart[];
  pinMappings: PinMapping[];
  functionalEquivalents: string[];
  metadata: DeviceMetadata;
  version: string;
  deprecationState: DeprecationState;
}

export interface DatasheetReference {
  id: string;
  title: string;
  url: string; // file:// local path or http(s):// remote URL
  hash?: string; // version tracking
  localPath?: string;
  fileSize?: number;
}
