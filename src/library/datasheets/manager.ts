import { DatasheetReference } from '../types';

const datasheetsRegistry = new Map<string, DatasheetReference>();

export function registerDatasheet(ref: DatasheetReference): void {
  if (!ref.id) {
    throw new Error('Datasheet ID is required');
  }
  datasheetsRegistry.set(ref.id, ref);
}

export function unregisterDatasheet(id: string): void {
  datasheetsRegistry.delete(id);
}

export function getDatasheet(id: string): DatasheetReference | undefined {
  return datasheetsRegistry.get(id);
}

export function listDatasheets(): DatasheetReference[] {
  return Array.from(datasheetsRegistry.values());
}

export function clearDatasheets(): void {
  datasheetsRegistry.clear();
}
