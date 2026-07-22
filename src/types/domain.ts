// Core Domain Model Types

export interface Coordinate {
  x: number;
  y: number;
}

export type EndpointType = 'PORT' | 'PIN' | 'FLOATING';

export interface PortEndpoint {
  type: 'PORT';
  targetId: string; // Format: "componentId:portId"
  coordinate?: never;
}

export interface PinEndpoint {
  type: 'PIN';
  targetId: string; // Format: "componentId:pinId"
  coordinate?: never;
}

export interface FloatingEndpoint {
  type: 'FLOATING';
  coordinate: Coordinate;
  targetId?: never;
}

export type Endpoint = PortEndpoint | PinEndpoint | FloatingEndpoint;

export interface Port {
  id: string;
  name: string;
  direction: 'input' | 'output' | 'bidirectional' | 'passive' | 'tri-state';
  signalCategory: string; // e.g., 'analog', 'digital', etc.
}

export interface Pin {
  id: string;
  name: string;
  direction: 'input' | 'output' | 'bidirectional' | 'passive' | 'tri-state';
  signalCategory: string;
}

export interface SemanticObject {
  id: string;
  type: string;
  name: string;
  ports: Port[];
  pins: Pin[];
  properties: Record<string, any>;
  inventoryItemId?: string; // Reference to workshop inventory
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objects: SemanticObject[];
}

export interface Page {
  id: string;
  name: string;
  layers: Layer[];
  viewport: ViewportState;
}

export interface ProjectDocumentation {
  notes: string;
  designDecisions: string;
  todoList: string;
  changelog: string;
  datasheetReferences: string[];
  externalReferences: string[];
}

// Ensure the WorkshopState type exists without strict coupling to the internal structure
export interface Project {
  id: string;
  name: string;
  pages: Page[];
  documentation?: ProjectDocumentation;
  workshop?: any; // Represents WorkshopState
}

export interface LogicalConnection {
  id: string;
  source: Endpoint;
  target: Endpoint;
  netId: string;
  metadata?: Record<string, any>;
}

export interface WireSegment {
  start: Coordinate;
  end: Coordinate;
}

export interface Wire {
  id: string;
  logicalConnectionId: string;
  segments: WireSegment[];
  style?: {
    color?: string;
    width?: number;
    dashArray?: string;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
}

// ----------------------------------------------------
// Subsystem / Infrastructure Interface Contracts
// ----------------------------------------------------

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface MutationDelta {
  added: any[];
  updated: any[];
  deleted: string[];
}

export interface Command {
  id: string;
  name: string;
  payload: any;
  timestamp?: number;
}

export interface CommandResult {
  success: boolean;
  delta?: MutationDelta;
  error?: string;
}

export interface Transaction {
  id: string;
  commands: Command[];
}

export type DeltaAction =
  | { type: 'CREATE_PAGE'; page: Page }
  | { type: 'DELETE_PAGE'; pageId: string; resolvedCoordinates?: Record<string, { x: number; y: number }> }
  | { type: 'CREATE_LAYER'; pageId: string; layer: Layer }
  | { type: 'DELETE_LAYER'; layerId: string; resolvedCoordinates?: Record<string, { x: number; y: number }> }
  | { type: 'CREATE_COMPONENT'; layerId: string; component: SemanticObject }
  | { type: 'DELETE_COMPONENT'; componentId: string; resolvedCoordinates?: Record<string, { x: number; y: number }> }
  | { type: 'CREATE_CONNECTION'; connection: LogicalConnection }
  | { type: 'DELETE_CONNECTION'; connectionId: string }
  | { type: 'CREATE_WIRE'; wire: Wire }
  | { type: 'DELETE_WIRE'; wireId: string }
  | { type: 'MOVE_COMPONENT'; componentId: string; x: number; y: number; wireUpdates?: { wireId: string; segments: WireSegment[] }[] }
  | { type: 'CREATE_FOOTPRINT'; boardId: string; footprint: any }
  | { type: 'DELETE_FOOTPRINT'; boardId: string; footprintId: string }
  | { type: 'UPDATE_FOOTPRINT'; boardId: string; footprintId: string; updates: any }
  | { type: 'CREATE_PCB_OBJECT'; boardId: string; object: any }
  | { type: 'DELETE_PCB_OBJECT'; boardId: string; objectId: string }
  | { type: 'UPDATE_PCB_OBJECT'; boardId: string; objectId: string; updates: any }
  | { type: 'SET_BOARD_OUTLINE'; boardId: string; outline: any[] }
  | { type: 'CREATE_SYMBOL_ITEM'; docId: string; item: any }
  | { type: 'DELETE_SYMBOL_ITEM'; docId: string; itemId: string }
  | { type: 'UPDATE_SYMBOL_ITEM'; docId: string; itemId: string; updates: any }
  | { type: 'UPDATE_PROJECT_DOCUMENTATION'; doc: ProjectDocumentation | undefined }
  | { type: 'CREATE_DEVICE_OBJECT'; layerId: string; object: any }
  | { type: 'DELETE_DEVICE_OBJECT'; objectId: string }
  | { type: 'UPDATE_DEVICE_OBJECT'; objectId: string; updates: any };

export interface HistoryDelta {
  forward: DeltaAction[];
  reverse: DeltaAction[];
}

export interface HistoryNode {
  id: string;
  parentId: string | null;
  commandId: string;
  description: string;
  timestamp: number;
  delta: HistoryDelta;
}

export interface HistorySnapshot {
  historyNodeId: string;
  projectState: Project;
}

export interface Event {
  id?: string;
  type?: string;
  timestamp?: number;
  namespace: string;
  name: string;
  payload: any;
  context?: Record<string, any>;
}

export interface EventSubscription {
  id: string;
  namespace: string;
  name: string;
  priority: number; // 0 to 100
  callback: (event: Event) => void | Promise<void>;
}

export interface GeometryService {
  pointToSegmentDistance(point: Coordinate, start: Coordinate, end: Coordinate): number;
  calculateBoundingBox(points: Coordinate[]): { min: Coordinate; max: Coordinate };
  intersects(boxA: { min: Coordinate; max: Coordinate }, boxB: { min: Coordinate; max: Coordinate }): boolean;
}

export interface SpatialQueryService {
  queryRange(box: { min: Coordinate; max: Coordinate }): string[];
}

export interface RenderProjection {
  worldToScreen(coord: Coordinate): Coordinate;
  screenToWorld(coord: Coordinate): Coordinate;
}

export interface NormalizedInputEvent {
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'keydown' | 'keyup';
  coord: Coordinate;
  key?: string;
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
  };
}

export interface Tool {
  id: string;
  name: string;
  onActivate(): void;
  onDeactivate(): void;
  onInput(event: NormalizedInputEvent): void;
}

export interface SelectionState {
  selectedIds: string[];
  primaryId: string | null;
  cyclingCandidates: string[];
}

export interface StorageSnapshot {
  project: Project;
  logicalConnections: LogicalConnection[];
  wires: Wire[];
}

export interface StorageProvider {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
}

export interface PluginCapability {
  name: string;
  granted: boolean;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
}

export interface PermissionDecision {
  allowed: boolean;
  reason?: string;
}

export type CanonicalEntity = Project | Page | Layer | SemanticObject | Port | Pin | LogicalConnection | Wire;
export type CanonicalEntityKind = 'Project' | 'Page' | 'Layer' | 'SemanticObject' | 'Port' | 'Pin' | 'LogicalConnection' | 'Wire';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CommandExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandExecutionError';
  }
}

export class FatalIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalIntegrityError';
  }
}
