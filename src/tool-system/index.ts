import { Coordinate, SemanticObject, WireSegment } from '../types';
import { SelectionEngine } from '../selection-engine';
import { GeometryEngine } from '../geometry-engine';
import { CommandEngine } from '../command-engine';
import { ObjectEngine } from '../object-engine';
import { generateUUID } from '../utils';
import { LiveValidationState } from '../connection-intelligence/types';
import { globalPreviewValidator, globalOverlay } from '../connection-intelligence';

export interface ActiveSourceTerminal {
  componentId: string;
  terminalId: string;
  type: 'PORT' | 'PIN';
  startWorldPt: Coordinate;
}

export class ToolSystem {
  private draggingComponentId: string | null = null;
  private dragStartPointer: Coordinate = { x: 0, y: 0 };
  private dragStartComponentPos: Coordinate = { x: 0, y: 0 };
  private currentPointer: Coordinate = { x: 0, y: 0 };

  private hoveredTerminalId: string | null = null;
  private hoveredComponentId: string | null = null;

  // Wiring gesture properties (UX-009 / UX-010)
  private activeSourceTerminal: ActiveSourceTerminal | null = null;
  private transientWireSegments: WireSegment[] | null = null;
  private liveValidationState: LiveValidationState | null = null;

  // Drag Selection
  private isDragSelecting: boolean = false;
  private dragSelectionStart: Coordinate | null = null;

  constructor() {}

  // Added isShiftDown parameter for additive selection
  handlePointerDown(
    pt: Coordinate,
    objectEngine: ObjectEngine,
    selectionEngine: SelectionEngine,
    geometryEngine: GeometryEngine,
    isShiftDown: boolean = false
  ): void {
    this.currentPointer = { ...pt };

    // 1. If hovered on a terminal, initiate wiring gesture instead of selecting/dragging
    if (this.hoveredTerminalId && this.hoveredComponentId) {
      const sourceComp = objectEngine.getObject(this.hoveredComponentId) as SemanticObject;
      if (sourceComp) {
        const startWorldPt = geometryEngine.getTerminalWorldCoordinate(sourceComp, this.hoveredTerminalId);
        const isPort = sourceComp.ports.some((p) => p.id === this.hoveredTerminalId);

        this.activeSourceTerminal = {
          componentId: sourceComp.id,
          terminalId: this.hoveredTerminalId,
          type: isPort ? 'PORT' : 'PIN',
          startWorldPt,
        };
        this.transientWireSegments = [];
        return;
      }
    }

    // 2. O(N) lookup for component under pointer
    const page = objectEngine.getProject().pages[0]; // Active page-1
    if (!page) return;

    let hitComponent: SemanticObject | null = null;
    for (const layer of page.layers) {
      for (const comp of layer.objects) {
        const bounds = geometryEngine.getComponentBounds(comp);
        if (geometryEngine.pointInRect(pt, bounds)) {
          hitComponent = comp;
          break;
        }
      }
      if (hitComponent) break;
    }

    if (hitComponent) {
      if (isShiftDown) {
        selectionEngine.toggle(hitComponent.id);
      } else {
        if (!selectionEngine.isSelected(hitComponent.id)) {
          selectionEngine.select(hitComponent.id);
        }
      }
      // If we clicked a selected component, we drag all selected? Currently it just drags one. Let's keep it simple for now, drag one or multiple. We'll drag all selected later.
      this.draggingComponentId = hitComponent.id;
      this.dragStartPointer = { ...pt };
      this.dragStartComponentPos = {
        x: hitComponent.properties.x ?? 0,
        y: hitComponent.properties.y ?? 0,
      };
    } else {
      if (!isShiftDown) {
        selectionEngine.clear();
      }
      this.draggingComponentId = null;
      this.isDragSelecting = true;
      this.dragSelectionStart = { ...pt };
    }
  }

  handlePointerMove(
    pt: Coordinate,
    objectEngine: ObjectEngine,
    geometryEngine: GeometryEngine
  ): void {
    this.currentPointer = { ...pt };

    // 1. Update terminal hover snaps (snapping radius is 12px)
    const page = objectEngine.getProject().pages[0];
    if (!page) return;

    this.hoveredTerminalId = null;
    this.hoveredComponentId = null;

    const targetRadius = 12;

    for (const layer of page.layers) {
      for (const comp of layer.objects) {
        const terminals = [...comp.ports, ...comp.pins];
        for (const term of terminals) {
          const worldPt = geometryEngine.getTerminalWorldCoordinate(comp, term.id);
          const dist = Math.hypot(pt.x - worldPt.x, pt.y - worldPt.y);
          if (dist <= targetRadius) {
            this.hoveredTerminalId = term.id;
            this.hoveredComponentId = comp.id;
            break;
          }
        }
        if (this.hoveredTerminalId) break;
      }
      if (this.hoveredTerminalId) break;
    }

    // 2. If wiring gesture is active, update Manhattan orthogonal path preview (UX-009)
    if (this.activeSourceTerminal) {
      // If we are hovered on a target port/pin, route directly to its center, else to pointer
      let endPt = pt;
      if (this.hoveredTerminalId && this.hoveredComponentId && this.hoveredComponentId !== this.activeSourceTerminal.componentId) {
        const targetComp = objectEngine.getObject(this.hoveredComponentId) as SemanticObject;
        if (targetComp) {
          endPt = geometryEngine.getTerminalWorldCoordinate(targetComp, this.hoveredTerminalId);
        }
      }
      this.transientWireSegments = geometryEngine.routeManhattan(this.activeSourceTerminal.startWorldPt, endPt);

      // Execute live connection validation (Sprint 07)
      this.liveValidationState = globalPreviewValidator.validatePreview(
        this.activeSourceTerminal,
        this.hoveredTerminalId,
        this.hoveredComponentId,
        objectEngine
      );

      if (this.liveValidationState && this.liveValidationState.status !== 'NONE' && this.liveValidationState.message) {
        let severity: 'ERROR' | 'WARNING' | 'INFO' = 'INFO';
        if (this.liveValidationState.status === 'RED') severity = 'ERROR';
        else if (this.liveValidationState.status === 'YELLOW') severity = 'WARNING';
        globalOverlay.show(this.liveValidationState.message, severity);
      } else {
        globalOverlay.hide();
      }
    }
  }

  getLiveValidationState(): LiveValidationState | null {
    return this.liveValidationState;
  }

  cancelWiring(): void {
    this.activeSourceTerminal = null;
    this.transientWireSegments = null;
    this.liveValidationState = null;
    globalOverlay.hide();
  }

  handlePointerUp(
    commandEngine: CommandEngine,
    objectEngine: ObjectEngine,
    geometryEngine: GeometryEngine,
    selectionEngine: SelectionEngine,
    isShiftDown: boolean = false
  ): void {
    // 1. If wiring, attempt to finalize connectionve, try committing connection (UX-010)
    if (this.activeSourceTerminal) {
      globalOverlay.hide();

      if (
        this.hoveredTerminalId &&
        this.hoveredComponentId &&
        this.hoveredComponentId !== this.activeSourceTerminal.componentId
      ) {
        // Enforce validation commit rejection (Sprint 07)
        const valState = globalPreviewValidator.validatePreview(
          this.activeSourceTerminal,
          this.hoveredTerminalId,
          this.hoveredComponentId,
          objectEngine
        );

        if (valState.status === 'RED') {
          // Reject invalid connection commit
          this.cancelWiring();
          return;
        }

        const targetComp = objectEngine.getObject(this.hoveredComponentId) as SemanticObject;
        if (targetComp) {
          const targetWorldPt = geometryEngine.getTerminalWorldCoordinate(targetComp, this.hoveredTerminalId);
          const isPort = targetComp.ports.some((p) => p.id === this.hoveredTerminalId);

          const finalSegments = geometryEngine.routeManhattan(this.activeSourceTerminal.startWorldPt, targetWorldPt);

          const connId = `conn-${generateUUID().substring(0, 8)}`;
          const wireId = `wire-${generateUUID().substring(0, 8)}`;

          commandEngine.executeTransaction([
            {
              id: `cmd-conn-${generateUUID().substring(0, 8)}`,
              name: 'CreateConnection',
              payload: {
                connection: {
                  id: connId,
                  source: {
                    type: this.activeSourceTerminal.type,
                    targetId: this.activeSourceTerminal.terminalId,
                  },
                  target: {
                    type: isPort ? 'PORT' : 'PIN',
                    targetId: this.hoveredTerminalId,
                  },
                  netId: `net-${generateUUID().substring(0, 8)}`,
                },
              },
            },
            {
              id: `cmd-wire-${generateUUID().substring(0, 8)}`,
              name: 'CreateWire',
              payload: {
                wire: {
                  id: wireId,
                  logicalConnectionId: connId,
                  segments: finalSegments,
                },
              },
            },
          ]);
        }
      }
      this.activeSourceTerminal = null;
      this.transientWireSegments = null;
      this.liveValidationState = null;
      return;
    }

    // 2. If dragging component, commit position
    if (this.draggingComponentId) {
      const dx = this.currentPointer.x - this.dragStartPointer.x;
      const dy = this.currentPointer.y - this.dragStartPointer.y;

      const rawX = this.dragStartComponentPos.x + dx;
      const rawY = this.dragStartComponentPos.y + dy;
      const snappedX = Math.round(rawX / 20) * 20;
      const snappedY = Math.round(rawY / 20) * 20;

      const hasMoved = snappedX !== this.dragStartComponentPos.x || snappedY !== this.dragStartComponentPos.y;

      if (hasMoved) {
        commandEngine.dispatch({
          id: `cmd-move-${generateUUID().substring(0, 8)}`,
          name: 'MoveComponent',
          payload: {
            componentId: this.draggingComponentId,
            x: snappedX,
            y: snappedY,
          },
        });
      }
    }
    this.draggingComponentId = null;

    // 3. If drag selecting, finalize selection
    if (this.isDragSelecting && this.dragSelectionStart) {
      // Find all components within the rectangle
      const rect = this.getDragSelectionRect();
      if (rect && (rect.width > 5 || rect.height > 5)) { // Avoid tiny clicks
        const page = objectEngine.getProject().pages[0];
        if (page) {
          const selected = [];
          for (const layer of page.layers) {
            for (const comp of layer.objects) {
              const bounds = geometryEngine.getComponentBounds(comp);
              // Simple AABB intersection
              if (geometryEngine.rectIntersection(rect, bounds)) {
                selected.push(comp.id);
              }
            }
          }
          if (!isShiftDown) selectionEngine.clear();
          selectionEngine.addSelect(selected);
        }
      }
      this.isDragSelecting = false;
      this.dragSelectionStart = null;
    }
  }

  getDragSelectionRect(): { x: number, y: number, width: number, height: number } | null {
    if (!this.isDragSelecting || !this.dragSelectionStart) return null;
    const x = Math.min(this.dragSelectionStart.x, this.currentPointer.x);
    const y = Math.min(this.dragSelectionStart.y, this.currentPointer.y);
    const w = Math.abs(this.dragSelectionStart.x - this.currentPointer.x);
    const h = Math.abs(this.dragSelectionStart.y - this.currentPointer.y);
    return { x, y, width: w, height: h };
  }

  getDraggingState(): { id: string; x: number; y: number } | null {
    if (!this.draggingComponentId) return null;

    const dx = this.currentPointer.x - this.dragStartPointer.x;
    const dy = this.currentPointer.y - this.dragStartPointer.y;
    const rawX = this.dragStartComponentPos.x + dx;
    const rawY = this.dragStartComponentPos.y + dy;
    const snappedX = Math.round(rawX / 20) * 20;
    const snappedY = Math.round(rawY / 20) * 20;

    return {
      id: this.draggingComponentId,
      x: snappedX,
      y: snappedY,
    };
  }

  getHoveredTerminal(): { componentId: string; terminalId: string } | null {
    if (!this.hoveredTerminalId || !this.hoveredComponentId) return null;
    return {
      componentId: this.hoveredComponentId,
      terminalId: this.hoveredTerminalId,
    };
  }

  getTransientWire(): WireSegment[] | null {
    return this.transientWireSegments;
  }

  isWiring(): boolean {
    return this.activeSourceTerminal !== null;
  }
}
