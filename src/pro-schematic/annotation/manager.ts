import { Coordinate } from '../../types';
import { AnnotationObject } from '../types';

const annotations = new Map<string, AnnotationObject>();

export function createAnnotation(anno: AnnotationObject): AnnotationObject {
  if (annotations.has(anno.id)) {
    throw new Error(`Annotation ${anno.id} already exists`);
  }
  annotations.set(anno.id, anno);
  return anno;
}

export function deleteAnnotation(id: string): void {
  annotations.delete(id);
}

export function listAnnotations(): AnnotationObject[] {
  return Array.from(annotations.values());
}

export function getAnnotation(id: string): AnnotationObject | undefined {
  return annotations.get(id);
}

export function clearAnnotations(): void {
  annotations.clear();
}

export function moveAnnotation(id: string, newPosition: Coordinate): void {
  const anno = annotations.get(id);
  if (!anno) {
    throw new Error(`Annotation ${id} not found`);
  }
  anno.position = { ...newPosition };
}

export function searchAnnotations(query: string): AnnotationObject[] {
  const q = query.toLowerCase();
  return listAnnotations().filter(anno => {
    if (anno.kind === 'Text' || anno.kind === 'RichText' || anno.kind === 'Label' || anno.kind === 'Note' || anno.kind === 'Callout') {
      const textVal = (anno as any).text || (anno as any).htmlText || '';
      return textVal.toLowerCase().includes(q);
    }
    return false;
  });
}
