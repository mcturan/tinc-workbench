import { RoutingState, RoutingEvent, RoutingStateMachine } from './types';

export class Router implements RoutingStateMachine {
  private state: RoutingState;

  constructor(defaultLayer: string = 'F.Cu') {
    this.state = this.getInitialState(defaultLayer);
  }

  private getInitialState(defaultLayer: string): RoutingState {
    return {
      phase: 'idle',
      activeNetId: null,
      currentLayer: defaultLayer,
      currentWidth: 250_000,
      cornerMode: '45',
      fixedSegments: [],
      segments: [],
      vias: [],
      warnings: [],
      sourceId: null,
      startPoint: null,
      cursorPosition: null,
    };
  }

  getState(): RoutingState {
    return { ...this.state };
  }

  dispatch(event: RoutingEvent): void {
    switch (this.state.phase) {
      case 'idle':
        this.handleIdleEvent(event);
        break;
      case 'selecting-source':
        this.handleSelectingSourceEvent(event);
        break;
      case 'routing':
        this.handleRoutingEvent(event);
        break;
    }
  }

  private handleIdleEvent(event: RoutingEvent): void {
    if (event.type === 'START_ROUTING') {
      this.state.phase = 'selecting-source';
      if (event.payload?.layer) {
        this.state.currentLayer = event.payload.layer;
      }
    }
  }

  private handleSelectingSourceEvent(event: RoutingEvent): void {
    if (event.type === 'CANCEL') {
      this.state = this.getInitialState(this.state.currentLayer);
    } else if (event.type === 'SELECT_SOURCE') {
      this.state.phase = 'routing';
      this.state.sourceId = event.payload.sourceId;
      this.state.activeNetId = event.payload.netId || null;
      if (event.payload.layer) {
        this.state.currentLayer = event.payload.layer;
      }
      this.state.cursorPosition = event.payload.position || null;
      this.state.startPoint = event.payload.position || null;
    }
  }

  private handleRoutingEvent(event: RoutingEvent): void {
    if (event.type === 'CANCEL') {
      this.state = this.getInitialState(this.state.currentLayer);
    } else if (event.type === 'MOVE_CURSOR') {
      this.state.cursorPosition = event.payload.position;
      this.updateTransientSegments();
    } else if (event.type === 'CYCLE_CORNER_MODE') {
      const modes: ('45' | '90' | 'free')[] = ['45', '90', 'free'];
      const idx = modes.indexOf(this.state.cornerMode);
      this.state.cornerMode = modes[(idx + 1) % modes.length];
      this.updateTransientSegments();
    } else if (event.type === 'CLICK') {
      if (this.state.segments.length > 0 && this.state.cursorPosition) {
        this.state.fixedSegments.push(...this.state.segments);
        this.state.startPoint = this.state.cursorPosition;
        this.state.segments = [];
      }
    } else if (event.type === 'CHANGE_LAYER') {
      if (event.payload?.layer && event.payload.layer !== this.state.currentLayer && this.state.cursorPosition) {
        // Fix current segments
        if (this.state.segments.length > 0) {
          this.state.fixedSegments.push(...this.state.segments);
        }
        
        // Add a via at the cursor position
        this.state.vias.push({
          id: 'via-' + Math.random().toString(36).substr(2, 9),
          netId: this.state.activeNetId || '',
          x: this.state.cursorPosition.x,
          y: this.state.cursorPosition.y,
          startLayer: this.state.currentLayer,
          endLayer: event.payload.layer,
          diameter: 600000,      // 0.6mm default
          drillDiameter: 300000  // 0.3mm default
        });

        // Switch layer
        this.state.currentLayer = event.payload.layer;
        this.state.startPoint = this.state.cursorPosition;
        this.state.segments = [];
      }
    } else if (event.type === 'COMMIT') {
      this.state = this.getInitialState(this.state.currentLayer);
    } else if (event.type === 'UPDATE_WARNINGS') {
      this.state.warnings = event.payload?.warnings || [];
    } else if (event.type === 'CHANGE_WIDTH') {
      if (event.payload?.width > 0) {
        this.state.currentWidth = event.payload.width;
        this.updateTransientSegments();
      }
    } else if (event.type === 'SET_CORNER_MODE') {
      if (event.payload?.mode) {
        this.state.cornerMode = event.payload.mode;
        this.updateTransientSegments();
      }
    }
  }

  private updateTransientSegments(): void {
    if (!this.state.startPoint || !this.state.cursorPosition) {
      this.state.segments = [];
      return;
    }

    const start = this.state.startPoint;
    const end = this.state.cursorPosition;
    const mode = this.state.cornerMode;
    const layer = this.state.currentLayer;
    const netId = this.state.activeNetId || '';
    const width = this.state.currentWidth || 250000;

    if (start.x === end.x && start.y === end.y) {
      this.state.segments = [];
      return;
    }

    const createSeg = (sx: number, sy: number, ex: number, ey: number) => ({
      id: 'transient-' + Math.random().toString(36).substr(2, 9),
      netId,
      layer,
      width,
      startX: sx,
      startY: sy,
      endX: ex,
      endY: ey
    });

    if (mode === 'free') {
      this.state.segments = [createSeg(start.x, start.y, end.x, end.y)];
      return;
    }

    if (mode === '90') {
      if (start.x !== end.x && start.y !== end.y) {
        this.state.segments = [
          createSeg(start.x, start.y, end.x, start.y),
          createSeg(end.x, start.y, end.x, end.y)
        ];
      } else {
        this.state.segments = [createSeg(start.x, start.y, end.x, end.y)];
      }
      return;
    }

    if (mode === '45') {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx === absDy || dx === 0 || dy === 0) {
        this.state.segments = [createSeg(start.x, start.y, end.x, end.y)];
      } else {
        const minD = Math.min(absDx, absDy);
        const signX = Math.sign(dx);
        const signY = Math.sign(dy);

        const midX = start.x + minD * signX;
        const midY = start.y + minD * signY;

        this.state.segments = [
          createSeg(start.x, start.y, midX, midY),
          createSeg(midX, midY, end.x, end.y)
        ];
      }
    }
  }
}
