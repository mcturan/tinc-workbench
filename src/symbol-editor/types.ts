export type SymbolItemKind = 'line' | 'rect' | 'circle' | 'arc' | 'polyline' | 'pin' | 'text';

export interface SymbolTransform {
  x: number;
  y: number;
  rotation: number;
}

export interface BaseSymbolItem {
  id: string;
  kind: SymbolItemKind;
  transform: SymbolTransform;
  selected: boolean;
  locked: boolean;
}

export interface SymbolLine extends BaseSymbolItem {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineWidth: number;
  color?: string;
}

export interface SymbolRect extends BaseSymbolItem {
  kind: 'rect';
  width: number;
  height: number;
  lineWidth: number;
  fill?: string;
  color?: string;
}

export interface SymbolCircle extends BaseSymbolItem {
  kind: 'circle';
  radius: number;
  lineWidth: number;
  fill?: string;
  color?: string;
}

export interface SymbolArc extends BaseSymbolItem {
  kind: 'arc';
  radius: number;
  startAngle: number;
  endAngle: number;
  lineWidth: number;
  color?: string;
}

export interface SymbolPolyline extends BaseSymbolItem {
  kind: 'polyline';
  points: {x: number, y: number}[];
  lineWidth: number;
  fill?: string;
  color?: string;
}

export interface SymbolPinItem extends BaseSymbolItem {
  kind: 'pin';
  name: string;
  number: string;
  direction: 'input' | 'output' | 'bidirectional' | 'passive' | 'tri-state' | 'power_input' | 'power_output' | 'unspecified';
  electricalType: string;
  length: number;
  visible: boolean;
}

export interface SymbolText extends BaseSymbolItem {
  kind: 'text';
  text: string;
  textType: 'reference' | 'value' | 'user';
  fontSize: number;
  alignment: 'left' | 'center' | 'right';
  visible: boolean;
}

export type SymbolItem = SymbolLine | SymbolRect | SymbolCircle | SymbolArc | SymbolPolyline | SymbolPinItem | SymbolText;

export interface SymbolDocument {
  id: string;
  name: string;
  description: string;
  items: SymbolItem[];
}
