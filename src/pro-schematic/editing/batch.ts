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

export function rotate(objects: any[], angleDegrees: number, _geometryEngine: GeometryEngine): void {
  if (objects.length === 0) return;

  let sumX = 0;
  let sumY = 0;
  for (const obj of objects) {
    sumX += getX(obj);
    sumY += getY(obj);
  }
  const centerX = sumX / objects.length;
  const centerY = sumY / objects.length;

  const angleRad = (angleDegrees * Math.PI) / 180;

  for (const obj of objects) {
    const ox = getX(obj);
    const oy = getY(obj);
    const dx = ox - centerX;
    const dy = oy - centerY;
    const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
    const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
    setX(obj, centerX + rx);
    setY(obj, centerY + ry);
  }
}

export function mirror(objects: any[], axis: 'H' | 'V', _geometryEngine: GeometryEngine): void {
  if (objects.length === 0) return;

  let sumX = 0;
  let sumY = 0;
  for (const obj of objects) {
    sumX += getX(obj);
    sumY += getY(obj);
  }
  const centerX = sumX / objects.length;
  const centerY = sumY / objects.length;

  for (const obj of objects) {
    const ox = getX(obj);
    const oy = getY(obj);
    if (axis === 'H') {
      const dx = ox - centerX;
      setX(obj, centerX - dx);
    } else {
      const dy = oy - centerY;
      setY(obj, centerY - dy);
    }
  }
}

export function arrayCopy(
  objects: any[],
  count: number,
  spacing: number,
  axis: 'X' | 'Y',
  duplicateFn: (objs: any[], offset: { x: number; y: number }) => any[]
): any[] {
  const result: any[] = [];
  for (let i = 1; i <= count; i++) {
    const offset = {
      x: axis === 'X' ? spacing * i : 0,
      y: axis === 'Y' ? spacing * i : 0,
    };
    result.push(...duplicateFn(objects, offset));
  }
  return result;
}
