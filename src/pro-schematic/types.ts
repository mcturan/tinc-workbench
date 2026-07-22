import { Coordinate } from '../types';

// PART 1 - Bus System Types
export interface Bus {
  id: string;
  name: string; // e.g. DATA[0..7]
  segments: { start: Coordinate; end: Coordinate }[];
  metadata?: Record<string, any>;
}

export interface BusEntry {
  id: string;
  busId: string;
  netName: string;
  position: Coordinate;
  angle: number;
}

export interface BusTap {
  id: string;
  busId: string;
  netName: string;
  position: Coordinate;
}

export interface BusJunction {
  id: string;
  busId: string;
  position: Coordinate;
}

// PART 2 - Connector Types
export type ConnectorScope = 'Local' | 'Global' | 'Sheet' | 'Hierarchical';

export interface SchematicConnector {
  id: string;
  name: string;
  scope: ConnectorScope;
  position: Coordinate;
  targetObjectId?: string;
  targetPinId?: string;
  metadata?: Record<string, any>;
}

export interface NoConnectMarker {
  id: string;
  targetObjectId: string;
  targetPinId: string;
  position: Coordinate;
}

// PART 3 - Annotation Types
export type AnnotationKind =
  | 'Text'
  | 'RichText'
  | 'Label'
  | 'Note'
  | 'Dimension'
  | 'Callout'
  | 'Rectangle'
  | 'Circle'
  | 'Line'
  | 'Polygon'
  | 'Arc';

export interface BaseAnnotation {
  id: string;
  kind: AnnotationKind;
  position: Coordinate;
  style?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface TextAnnotation extends BaseAnnotation {
  kind: 'Text';
  text: string;
}

export interface RichTextAnnotation extends BaseAnnotation {
  kind: 'RichText';
  htmlText: string;
}

export interface LabelAnnotation extends BaseAnnotation {
  kind: 'Label';
  text: string;
}

export interface NoteAnnotation extends BaseAnnotation {
  kind: 'Note';
  text: string;
}

export interface DimensionAnnotation extends BaseAnnotation {
  kind: 'Dimension';
  start: Coordinate;
  end: Coordinate;
  label: string;
}

export interface CalloutAnnotation extends BaseAnnotation {
  kind: 'Callout';
  text: string;
  points: Coordinate[];
}

export interface GraphicRectangle extends BaseAnnotation {
  kind: 'Rectangle';
  width: number;
  height: number;
}

export interface GraphicCircle extends BaseAnnotation {
  kind: 'Circle';
  radius: number;
}

export interface GraphicLine extends BaseAnnotation {
  kind: 'Line';
  end: Coordinate;
}

export interface GraphicPolygon extends BaseAnnotation {
  kind: 'Polygon';
  points: Coordinate[];
}

export interface GraphicArc extends BaseAnnotation {
  kind: 'Arc';
  radius: number;
  startAngle: number;
  endAngle: number;
}

export type AnnotationObject =
  | TextAnnotation
  | RichTextAnnotation
  | LabelAnnotation
  | NoteAnnotation
  | DimensionAnnotation
  | CalloutAnnotation
  | GraphicRectangle
  | GraphicCircle
  | GraphicLine
  | GraphicPolygon
  | GraphicArc;

// PART 6 - Junction Types
export type JunctionType = 'Auto' | 'Manual';

export interface Junction {
  id: string;
  type: JunctionType;
  position: Coordinate;
  connectedWireIds: string[];
}

// PART 7 - Net Class Types
export interface NetClass {
  name: string;
  width: number;
  clearance: number;
  color: string;
  priority: number;
  nets: string[]; // Net names assigned
  metadata?: Record<string, any>;
}
