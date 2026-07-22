export type RoutingPhase = 
  | 'idle'
  | 'selecting-source'
  | 'routing'
  | 'layer-switching';

export type CornerMode = '45' | '90' | 'free';

export interface TransientTrackSegment {
  id: string;
  netId: string;
  layer: string;
  width: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface TransientVia {
  id: string;
  netId: string;
  x: number;
  y: number;
  startLayer: string;
  endLayer: string;
  diameter: number;
  drillDiameter: number;
}

export interface RoutingState {
  phase: RoutingPhase;
  activeNetId: string | null;
  currentLayer: string;
  currentWidth: number;
  cornerMode: CornerMode;
  fixedSegments: TransientTrackSegment[];
  segments: TransientTrackSegment[];
  vias: TransientVia[];
  warnings: string[];
  sourceId: string | null;
  startPoint: { x: number; y: number } | null;
  cursorPosition: { x: number; y: number } | null;
}

export interface RoutingEvent {
  type: 
    | 'START_ROUTING'
    | 'SELECT_SOURCE'
    | 'MOVE_CURSOR'
    | 'CLICK'
    | 'CHANGE_LAYER'
    | 'CHANGE_WIDTH'
    | 'SET_CORNER_MODE'
    | 'UPDATE_WARNINGS'
    | 'CYCLE_CORNER_MODE'
    | 'CANCEL'
    | 'COMMIT';
  payload?: any;
}

export interface RoutingStateMachine {
  getState(): RoutingState;
  dispatch(event: RoutingEvent): void;
}
