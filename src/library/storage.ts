import { clearDatasheets, listDatasheets, registerDatasheet } from './datasheets/manager';
import { clearDevices, listDevices, registerDevice } from './devices/manager';
import { clearFootprints, listFootprints, registerFootprint } from './footprints/manager';
import { LibraryData } from './import-export/interfaces';
import { clearSymbols, listSymbols, registerSymbol } from './symbols/manager';
import { globalLibraryUsage, LibraryUsageSnapshot } from './usage/manager';

export interface LibraryPersistenceSnapshot {
  version: string;
  library: LibraryData;
  usage: LibraryUsageSnapshot;
}

export interface LibraryStorageProvider {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryLibraryStorageProvider implements LibraryStorageProvider {
  private values = new Map<string, string>();

  read(key: string): string | null {
    return this.values.get(key) || null;
  }

  write(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

export function createLibrarySnapshot(version = '1.0.0'): LibraryPersistenceSnapshot {
  return {
    version,
    library: {
      version,
      symbols: listSymbols(),
      devices: listDevices(),
      footprints: listFootprints(),
      datasheets: listDatasheets(),
    },
    usage: globalLibraryUsage.snapshot(),
  };
}

export function saveLibrarySnapshot(
  provider: LibraryStorageProvider,
  key = 'tinc.library',
  snapshot = createLibrarySnapshot()
): void {
  provider.write(key, JSON.stringify(snapshot, null, 2));
}

export function loadLibrarySnapshot(
  provider: LibraryStorageProvider,
  key = 'tinc.library'
): LibraryPersistenceSnapshot | undefined {
  const raw = provider.read(key);
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as LibraryPersistenceSnapshot;
  hydrateLibraryData(parsed.library);
  globalLibraryUsage.restore(parsed.usage || {});
  return parsed;
}

export function hydrateLibraryData(data: LibraryData): void {
  clearDevices();
  clearFootprints();
  clearSymbols();
  clearDatasheets();

  for (const symbol of data.symbols || []) registerSymbol(symbol);
  for (const footprint of data.footprints || []) registerFootprint(footprint);
  for (const datasheet of data.datasheets || []) registerDatasheet(datasheet);
  for (const device of data.devices || []) registerDevice(device);
}
