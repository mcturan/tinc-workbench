import { PhysicalTransform, PhysicalBBox, PhysicalCoord } from '../physical-design/types';

export type DeviceObjectKind = 'enclosure' | 'perfboard' | 'breadboard' | 'module' | 'wire';

export interface DeviceObjectBase {
  id: string;
  kind: DeviceObjectKind;
  layerId: string;
  transform: PhysicalTransform;
  visible: boolean;
  locked: boolean;
  selected: boolean;
  metadata?: Record<string, unknown>;
  bbox?: PhysicalBBox;
  inventoryItemId?: string;
}

export interface EnclosureObject extends DeviceObjectBase {
  kind: 'enclosure';
  width: number; // nm
  height: number; // nm
  label: string;
  mountingHoles: { x: number; y: number; diameter: number }[];
  margins?: { top: number; right: number; bottom: number; left: number };
  standoffs?: { x: number; y: number; diameter: number; height: number }[];
  keepouts?: PhysicalBBox[];
}

export interface PerfboardObject extends DeviceObjectBase {
  kind: 'perfboard';
  width: number; // nm
  height: number; // nm
  pitch: number; // nm, typically 2.54mm (100mil)
  rows: number;
  cols: number;
  view: 'top' | 'bottom';
  showNumbering?: boolean;
}

export interface BreadboardObject extends DeviceObjectBase {
  kind: 'breadboard';
  size: 'full' | 'half' | 'mini';
  width: number; // nm
  height: number; // nm
}

export interface PhysicalModuleObject extends DeviceObjectBase {
  kind: 'module';
  moduleType: string; // e.g., 'Arduino Uno', 'ESP32'
  width: number; // nm
  height: number; // nm
  libraryId?: string; // Reference to Library System
  connectionPoints?: { id: string; x: number; y: number; label?: string }[];
  mountingHoles?: { x: number; y: number; diameter: number }[];
  labels?: { x: number; y: number; text: string; size: number }[];
}

export interface PhysicalWireObject extends DeviceObjectBase {
  kind: 'wire';
  points: PhysicalCoord[]; // Routing points
  color: string; // Hex color or named color
  label: string;
  cornerMode?: 'free' | '90' | '45';
  anchors?: { index: number; x: number; y: number }[];
}

export type DeviceObject = EnclosureObject | PerfboardObject | BreadboardObject | PhysicalModuleObject | PhysicalWireObject;

export interface DeviceLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objects: DeviceObject[];
}

export interface DeviceWorkspaceState {
  id: string;
  layers: DeviceLayer[];
  grid: {
    enabled: boolean;
    pitchX: number;
    pitchY: number;
  };
}
