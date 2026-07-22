
import { GeometryEngine } from '../../geometry-engine';

function getX(obj: any): number {
  if (obj.properties && typeof obj.properties.x === 'number') return obj.properties.x;
  if (obj.position && typeof obj.position.x === 'number') return obj.position.x;
  return 0;
}

function getY(obj: any): number {
  if (obj.properties && typeof obj.properties.y === 'number') return obj.properties.y;
  if (obj.position && typeof obj.position.y === 'number') return obj.position.y;
  return 0;
}

function setX(obj: any, val: number): void {
  if (obj.properties && typeof obj.properties.x === 'number') {
    obj.properties.x = val;
  } else if (obj.position) {
    obj.position.x = val;
  }
}

function setY(obj: any, val: number): void {
  if (obj.properties && typeof obj.properties.y === 'number') {
    obj.properties.y = val;
  } else if (obj.position) {
    obj.position.y = val;
  }
}

export function alignLeft(objects: any[], geometryEngine: GeometryEngine): void {
  if (objects.length <= 1) return;
  let minX = Infinity;
  for (const obj of objects) {
    const bounds = geometryEngine.getComponentBounds(obj);
    if (bounds.x < minX) minX = bounds.x;
  }
  for (const obj of objects) {
    const bounds = geometryEngine.getComponentBounds(obj);
    const diff = minX - bounds.x;
    setX(obj, getX(obj) + diff);
  }
}

export function alignRight(objects: any[], geometryEngine: GeometryEngine): void {
  if (objects.length <= 1) return;
  let maxX = -Infinity;
  for (const obj of objects) {
    const bounds = geometryEngine.getComponentBounds(obj);
    const right = bounds.x + bounds.width;
    if (right > maxX) maxX = right;
  }
  for (const obj of objects) {
    const bounds = geometryEngine.getComponentBounds(obj);
    const right = bounds.x + bounds.width;
    const diff = maxX - right;
    setX(obj, getX(obj) + diff);
  }
}

export function alignTop(objects: any[], geometryEngine: GeometryEngine): void {
  if (objects.length <= 1) return;
  let minY = Infinity;
  for (const obj of objects) {
    const bounds = geometryEngine.getComponentBounds(obj);
    if (bounds.y < minY) minY = bounds.y;
  }
  for (const obj of objects) {
    const bounds = geometryEngine.getComponentBounds(obj);
    const diff = minY - bounds.y;
    setY(obj, getY(obj) + diff);
  }
}

export function alignBottom(objects: any[], geometryEngine: GeometryEngine): void {
  if (objects.length <= 1) return;
  let maxY = -Infinity;
  for (const obj of objects) {
    const bounds = geometryEngine.getComponentBounds(obj);
    const bottom = bounds.y + bounds.height;
    if (bottom > maxY) maxY = bottom;
  }
  for (const obj of objects) {
    const bounds = geometryEngine.getComponentBounds(obj);
    const bottom = bounds.y + bounds.height;
    const diff = maxY - bottom;
    setY(obj, getY(obj) + diff);
  }
}

export function alignCenter(objects: any[], geometryEngine: GeometryEngine): void {
  if (objects.length <= 1) return;
  let sumX = 0;
  let sumY = 0;
  for (const obj of objects) {
    const bounds = geometryEngine.getComponentBounds(obj);
    sumX += bounds.x + bounds.width / 2;
    sumY += bounds.y + bounds.height / 2;
  }
  const avgX = sumX / objects.length;
  const avgY = sumY / objects.length;
  for (const obj of objects) {
    const bounds = geometryEngine.getComponentBounds(obj);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    setX(obj, getX(obj) + avgX - centerX);
    setY(obj, getY(obj) + avgY - centerY);
  }
}

export function distributeHorizontal(objects: any[], geometryEngine: GeometryEngine): void {
  if (objects.length <= 2) return;
  const sorted = [...objects].sort((a, b) => {
    const bA = geometryEngine.getComponentBounds(a);
    const bB = geometryEngine.getComponentBounds(b);
    return (bA.x + bA.width / 2) - (bB.x + bB.width / 2);
  });

  const firstBounds = geometryEngine.getComponentBounds(sorted[0]);
  const lastBounds = geometryEngine.getComponentBounds(sorted[sorted.length - 1]);
  const minCenterX = firstBounds.x + firstBounds.width / 2;
  const maxCenterX = lastBounds.x + lastBounds.width / 2;

  const totalSpan = maxCenterX - minCenterX;
  const interval = totalSpan / (sorted.length - 1);

  for (let i = 1; i < sorted.length - 1; i++) {
    const obj = sorted[i];
    const bounds = geometryEngine.getComponentBounds(obj);
    const currentCenter = bounds.x + bounds.width / 2;
    const targetCenter = minCenterX + i * interval;
    setX(obj, getX(obj) + targetCenter - currentCenter);
  }
}

export function distributeVertical(objects: any[], geometryEngine: GeometryEngine): void {
  if (objects.length <= 2) return;
  const sorted = [...objects].sort((a, b) => {
    const bA = geometryEngine.getComponentBounds(a);
    const bB = geometryEngine.getComponentBounds(b);
    return (bA.y + bA.height / 2) - (bB.y + bB.height / 2);
  });

  const firstBounds = geometryEngine.getComponentBounds(sorted[0]);
  const lastBounds = geometryEngine.getComponentBounds(sorted[sorted.length - 1]);
  const minCenterY = firstBounds.y + firstBounds.height / 2;
  const maxCenterY = lastBounds.y + lastBounds.height / 2;

  const totalSpan = maxCenterY - minCenterY;
  const interval = totalSpan / (sorted.length - 1);

  for (let i = 1; i < sorted.length - 1; i++) {
    const obj = sorted[i];
    const bounds = geometryEngine.getComponentBounds(obj);
    const currentCenter = bounds.y + bounds.height / 2;
    const targetCenter = minCenterY + i * interval;
    setY(obj, getY(obj) + targetCenter - currentCenter);
  }
}
