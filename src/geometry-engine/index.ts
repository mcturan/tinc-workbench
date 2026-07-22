import { Coordinate, SemanticObject, WireSegment } from '../types';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const COMPONENT_SIZES: Record<string, { width: number; height: number }> = {
  'ESP32': { width: 120, height: 180 },
  'Relay Module': { width: 100, height: 80 },
  '12V Power Supply': { width: 140, height: 90 },
  'Lamp': { width: 80, height: 80 },
};

// Local offsets for terminals relative to top-left of component
export const TERMINAL_OFFSETS: Record<string, Record<string, Coordinate>> = {
  'ESP32': {
    'GPIO23': { x: 120, y: 90 }, // right side center
  },
  'Relay Module': {
    'COM': { x: 0, y: 25 },     // left side COM
    'NO': { x: 0, y: 55 },      // left side NO
    'IN1': { x: 100, y: 40 },   // right side IN1
  },
  '12V Power Supply': {
    'V+': { x: 140, y: 30 },    // right side V+
    'V-': { x: 140, y: 60 },    // right side V-
  },
  'Lamp': {
    '+': { x: 0, y: 40 },       // left side +
    '-': { x: 80, y: 40 },      // right side -
  },
};

export class GeometryEngine {
  pointInRect(pt: Coordinate, rect: Rect): boolean {
    return (
      pt.x >= rect.x &&
      pt.x <= rect.x + rect.width &&
      pt.y >= rect.y &&
      pt.y <= rect.y + rect.height
    );
  }

  rectIntersection(r1: Rect, r2: Rect): boolean {
    return !(
      r2.x > r1.x + r1.width ||
      r2.x + r2.width < r1.x ||
      r2.y > r1.y + r1.height ||
      r2.y + r2.height < r1.y
    );
  }

  getComponentBounds(component: SemanticObject): Rect {
    const x = component.properties.x ?? 0;
    const y = component.properties.y ?? 0;
    const size = COMPONENT_SIZES[component.type] || { width: 100, height: 80 };
    return { x, y, width: size.width, height: size.height };
  }

  getTerminalLocalCoordinate(componentType: string, terminalId: string): Coordinate {
    const offsets = TERMINAL_OFFSETS[componentType];
    if (offsets && offsets[terminalId]) {
      return offsets[terminalId];
    }
    return { x: 0, y: 0 };
  }

  getTerminalWorldCoordinate(component: SemanticObject, terminalId: string): Coordinate {
    const x = component.properties.x ?? 0;
    const y = component.properties.y ?? 0;
    const local = this.getTerminalLocalCoordinate(component.type, terminalId);
    return { x: x + local.x, y: y + local.y };
  }

  routeManhattan(start: Coordinate, end: Coordinate): WireSegment[] {
    if (start.x === end.x || start.y === end.y) {
      return [{ start: { ...start }, end: { ...end } }];
    }
    return [
      { start: { ...start }, end: { x: end.x, y: start.y } },
      { start: { x: end.x, y: start.y }, end: { ...end } },
    ];
  }
}
