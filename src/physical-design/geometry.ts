/**
 * Physical Design Platform — Geometry Framework
 * PART 5: Reusable geometry primitives, hit-testing, bounding volumes
 */

import {
  PhysicalCoord,
  PhysicalBBox,
  PhysicalObject,
  PadObject,
  ViaObject,
  TrackObject,
  ZoneObject,
  GraphicObject,
  MountingHoleObject,
  bboxContainsPoint,
  bboxIntersects,
} from './types';

// ── Geometric Primitives ──────────────────────────────────────────────────────

export interface Segment {
  start: PhysicalCoord;
  end: PhysicalCoord;
}

export interface Arc {
  center: PhysicalCoord;
  radius: number;
  startAngle: number; // degrees
  endAngle: number;   // degrees
}

export interface Circle {
  center: PhysicalCoord;
  radius: number;
}

export interface GeoPolygon {
  points: PhysicalCoord[];
}

export interface GeoRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoundedRectangle extends GeoRectangle {
  radius: number;
}

export interface Region {
  outerContour: PhysicalCoord[];
  holes: PhysicalCoord[][];
}

// ── Bounding Box Computation ──────────────────────────────────────────────────

export function segmentBBox(seg: Segment): PhysicalBBox {
  return {
    minX: Math.min(seg.start.x, seg.end.x),
    minY: Math.min(seg.start.y, seg.end.y),
    maxX: Math.max(seg.start.x, seg.end.x),
    maxY: Math.max(seg.start.y, seg.end.y),
  };
}

export function circleBBox(c: Circle): PhysicalBBox {
  return {
    minX: c.center.x - c.radius,
    minY: c.center.y - c.radius,
    maxX: c.center.x + c.radius,
    maxY: c.center.y + c.radius,
  };
}

export function arcBBox(arc: Arc): PhysicalBBox {
  const startRad = (arc.startAngle * Math.PI) / 180;
  const endRad = (arc.endAngle * Math.PI) / 180;
  const points: PhysicalCoord[] = [
    { x: arc.center.x + arc.radius * Math.cos(startRad), y: arc.center.y + arc.radius * Math.sin(startRad) },
    { x: arc.center.x + arc.radius * Math.cos(endRad), y: arc.center.y + arc.radius * Math.sin(endRad) },
  ];
  // Check cardinal directions within arc range
  for (const angle of [0, 90, 180, 270]) {
    if (isAngleInArc(angle, arc.startAngle, arc.endAngle)) {
      const rad = (angle * Math.PI) / 180;
      points.push({ x: arc.center.x + arc.radius * Math.cos(rad), y: arc.center.y + arc.radius * Math.sin(rad) });
    }
  }
  return pointsBBox(points);
}

export function polygonBBox(polygon: GeoPolygon): PhysicalBBox {
  return pointsBBox(polygon.points);
}

export function pointsBBox(pts: PhysicalCoord[]): PhysicalBBox {
  if (pts.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = pts[0].x, minY = pts[0].y, maxX = pts[0].x, maxY = pts[0].y;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function isAngleInArc(angle: number, start: number, end: number): boolean {
  angle = ((angle % 360) + 360) % 360;
  start = ((start % 360) + 360) % 360;
  end = ((end % 360) + 360) % 360;
  if (start <= end) return angle >= start && angle <= end;
  return angle >= start || angle <= end;
}

// ── Per-Object BBox Computation ───────────────────────────────────────────────

export function computeObjectBBox(obj: PhysicalObject): PhysicalBBox | null {
  switch (obj.kind) {
    case 'pad': {
      const p = obj as PadObject;
      const hw = p.sizeX / 2;
      const hh = p.sizeY / 2;
      const cx = p.transform.x;
      const cy = p.transform.y;
      return { minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh };
    }
    case 'via': {
      const v = obj as ViaObject;
      const r = v.diameter / 2;
      const cx = v.transform.x;
      const cy = v.transform.y;
      return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
    }
    case 'track': {
      const t = obj as TrackObject;
      const hw = t.width / 2;
      return {
        minX: Math.min(t.startX, t.endX) - hw,
        minY: Math.min(t.startY, t.endY) - hw,
        maxX: Math.max(t.startX, t.endX) + hw,
        maxY: Math.max(t.startY, t.endY) + hw,
      };
    }
    case 'zone': {
      const z = obj as ZoneObject;
      if (z.outlinePoints.length === 0) return null;
      return polygonBBox({ points: z.outlinePoints });
    }
    case 'graphic': {
      const g = obj as GraphicObject;
      return computeGraphicBBox(g);
    }
    case 'mounting-hole': {
      const mh = obj as MountingHoleObject;
      const r = mh.padDiameter / 2;
      const cx = mh.transform.x;
      const cy = mh.transform.y;
      return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
    }
    default:
      return null;
  }
}

function computeGraphicBBox(g: GraphicObject): PhysicalBBox | null {
  switch (g.shape) {
    case 'line':
      if (g.startX !== undefined && g.startY !== undefined && g.endX !== undefined && g.endY !== undefined) {
        const hw = g.width / 2;
        return {
          minX: Math.min(g.startX, g.endX) - hw,
          minY: Math.min(g.startY, g.endY) - hw,
          maxX: Math.max(g.startX, g.endX) + hw,
          maxY: Math.max(g.startY, g.endY) + hw,
        };
      }
      return null;
    case 'circle':
      if (g.centerX !== undefined && g.centerY !== undefined && g.radius !== undefined) {
        const r = g.radius + g.width / 2;
        return { minX: g.centerX - r, minY: g.centerY - r, maxX: g.centerX + r, maxY: g.centerY + r };
      }
      return null;
    case 'arc':
      if (g.centerX !== undefined && g.centerY !== undefined && g.radius !== undefined && g.startAngle !== undefined && g.endAngle !== undefined) {
        const arc: Arc = { center: { x: g.centerX, y: g.centerY }, radius: g.radius, startAngle: g.startAngle, endAngle: g.endAngle };
        const bb = arcBBox(arc);
        const hw = g.width / 2;
        return { minX: bb.minX - hw, minY: bb.minY - hw, maxX: bb.maxX + hw, maxY: bb.maxY + hw };
      }
      return null;
    case 'polygon':
    case 'rectangle':
      if (g.points && g.points.length > 0) {
        const bb = polygonBBox({ points: g.points });
        const hw = g.width / 2;
        return { minX: bb.minX - hw, minY: bb.minY - hw, maxX: bb.maxX + hw, maxY: bb.maxY + hw };
      }
      return null;
    default:
      return null;
  }
}

// ── Hit Testing ───────────────────────────────────────────────────────────────

export function pointInCircle(pt: PhysicalCoord, center: PhysicalCoord, radius: number): boolean {
  const dx = pt.x - center.x;
  const dy = pt.y - center.y;
  return dx * dx + dy * dy <= radius * radius;
}

export function pointOnSegment(pt: PhysicalCoord, seg: Segment, tolerance: number): boolean {
  const dist = pointToSegmentDistance(pt, seg.start, seg.end);
  return dist <= tolerance;
}

export function pointToSegmentDistance(pt: PhysicalCoord, a: PhysicalCoord, b: PhysicalCoord): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = pt.x - a.x;
    const ey = pt.y - a.y;
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearX = a.x + t * dx;
  const nearY = a.y + t * dy;
  const ex = pt.x - nearX;
  const ey = pt.y - nearY;
  return Math.sqrt(ex * ex + ey * ey);
}

export function pointInPolygon(pt: PhysicalCoord, polygon: PhysicalCoord[]): boolean {
  // Ray casting algorithm
  let inside = false;
  const n = polygon.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

export function segmentsIntersect(a1: PhysicalCoord, a2: PhysicalCoord, b1: PhysicalCoord, b2: PhysicalCoord): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

function cross(o: PhysicalCoord, a: PhysicalCoord, b: PhysicalCoord): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export function hitTestObject(obj: PhysicalObject, pt: PhysicalCoord, tolerancePx: number): boolean {
  if (obj.bbox && !bboxContainsPoint(
    { minX: obj.bbox.minX - tolerancePx, minY: obj.bbox.minY - tolerancePx, maxX: obj.bbox.maxX + tolerancePx, maxY: obj.bbox.maxY + tolerancePx },
    pt
  )) {
    return false;
  }
  switch (obj.kind) {
    case 'pad': {
      const p = obj as PadObject;
      const cx = p.transform.x;
      const cy = p.transform.y;
      if (p.padShape === 'circle') {
        return pointInCircle(pt, { x: cx, y: cy }, p.sizeX / 2 + tolerancePx);
      }
      // Rect and others: use bbox
      return bboxContainsPoint(
        { minX: cx - p.sizeX / 2 - tolerancePx, minY: cy - p.sizeY / 2 - tolerancePx, maxX: cx + p.sizeX / 2 + tolerancePx, maxY: cy + p.sizeY / 2 + tolerancePx },
        pt
      );
    }
    case 'via': {
      const v = obj as ViaObject;
      return pointInCircle(pt, { x: v.transform.x, y: v.transform.y }, v.diameter / 2 + tolerancePx);
    }
    case 'track': {
      const t = obj as TrackObject;
      return pointOnSegment(pt, { start: { x: t.startX, y: t.startY }, end: { x: t.endX, y: t.endY } }, t.width / 2 + tolerancePx);
    }
    case 'zone': {
      const z = obj as ZoneObject;
      return z.outlinePoints.length >= 3 ? pointInPolygon(pt, z.outlinePoints) : false;
    }
    case 'mounting-hole': {
      const mh = obj as MountingHoleObject;
      return pointInCircle(pt, { x: mh.transform.x, y: mh.transform.y }, mh.padDiameter / 2 + tolerancePx);
    }
    default: {
      // For text, graphics, dimensions: use expanded bbox
      if (obj.bbox) {
        return bboxContainsPoint(
          { minX: obj.bbox.minX - tolerancePx, minY: obj.bbox.minY - tolerancePx, maxX: obj.bbox.maxX + tolerancePx, maxY: obj.bbox.maxY + tolerancePx },
          pt
        );
      }
      return false;
    }
  }
}

// ── Distance Utilities ────────────────────────────────────────────────────────

export function distancePoints(a: PhysicalCoord, b: PhysicalCoord): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function segmentLength(seg: Segment): number {
  return distancePoints(seg.start, seg.end);
}

export function segmentMidpoint(seg: Segment): PhysicalCoord {
  return { x: (seg.start.x + seg.end.x) / 2, y: (seg.start.y + seg.end.y) / 2 };
}

export function circleCircleDistance(c1: Circle, c2: Circle): number {
  return distancePoints(c1.center, c2.center) - c1.radius - c2.radius;
}

// ── Polygon Utilities ─────────────────────────────────────────────────────────

export function polygonArea(pts: PhysicalCoord[]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

export function polygonCentroid(pts: PhysicalCoord[]): PhysicalCoord {
  const n = pts.length;
  if (n === 0) return { x: 0, y: 0 };
  let cx = 0, cy = 0, area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    cx += (pts[i].x + pts[j].x) * cross;
    cy += (pts[i].y + pts[j].y) * cross;
    area += cross;
  }
  area /= 2;
  if (area === 0) return { x: pts[0].x, y: pts[0].y };
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function convexHull(pts: PhysicalCoord[]): PhysicalCoord[] {
  if (pts.length < 3) return [...pts];
  const sorted = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const hull: PhysicalCoord[] = [];
  // Lower hull
  for (const p of sorted) {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }
  // Upper hull
  const lower = hull.length + 1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (hull.length >= lower && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }
  hull.pop();
  return hull;
}

// ── Coordinate Conversion ─────────────────────────────────────────────────────

export function rotatePoint(pt: PhysicalCoord, center: PhysicalCoord, angleDeg: number): PhysicalCoord {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = pt.x - center.x;
  const dy = pt.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function mirrorPointX(pt: PhysicalCoord, axis: number): PhysicalCoord {
  return { x: 2 * axis - pt.x, y: pt.y };
}

export function mirrorPointY(pt: PhysicalCoord, axis: number): PhysicalCoord {
  return { x: pt.x, y: 2 * axis - pt.y };
}

// ── Spatial Query Helpers ─────────────────────────────────────────────────────

export function bboxOverlapArea(a: PhysicalBBox, b: PhysicalBBox): number {
  const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const overlapY = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
  return overlapX * overlapY;
}

export function bboxArea(b: PhysicalBBox): number {
  return (b.maxX - b.minX) * (b.maxY - b.minY);
}

export function bboxFromPoints(pts: PhysicalCoord[]): PhysicalBBox {
  return pointsBBox(pts);
}
