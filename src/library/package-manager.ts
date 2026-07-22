import { registerDevice, unregisterDevice } from './devices/manager';
import { registerDatasheet, unregisterDatasheet } from './datasheets/manager';
import { registerFootprint, unregisterFootprint } from './footprints/manager';
import { LibraryData } from './import-export/interfaces';
import { registerSymbol, unregisterSymbol } from './symbols/manager';
import { DatasheetReference, DeviceDefinition, FootprintDefinition, SymbolDefinition } from './types';
import { compareSemVer } from './versioning/engine';

export interface LibraryPackageManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
}

export interface LibraryPackage extends LibraryPackageManifest {
  symbols: SymbolDefinition[];
  devices: DeviceDefinition[];
  footprints: FootprintDefinition[];
  datasheets?: DatasheetReference[];
}

const installedPackages = new Map<string, LibraryPackage>();

export function installLibraryPackage(pkg: LibraryPackage): void {
  if (!pkg.id || !pkg.version) {
    throw new Error('Library package id and version are required');
  }

  const existing = installedPackages.get(pkg.id);
  if (existing && compareSemVer(existing.version, pkg.version) > 0) {
    throw new Error(`Cannot downgrade package '${pkg.id}' from ${existing.version} to ${pkg.version}`);
  }

  for (const symbol of pkg.symbols) registerSymbol(symbol);
  for (const footprint of pkg.footprints) registerFootprint(footprint);
  for (const datasheet of pkg.datasheets || []) registerDatasheet(datasheet);
  for (const device of pkg.devices) registerDevice(device);
  installedPackages.set(pkg.id, { ...pkg });
}

export function uninstallLibraryPackage(id: string): boolean {
  const pkg = installedPackages.get(id);
  if (!pkg) return false;

  for (const device of pkg.devices) unregisterDevice(device.id);
  for (const datasheet of pkg.datasheets || []) unregisterDatasheet(datasheet.id);
  for (const footprint of pkg.footprints) unregisterFootprint(footprint.id);
  for (const symbol of pkg.symbols) unregisterSymbol(symbol.id);
  installedPackages.delete(id);
  return true;
}

export function listLibraryPackages(): LibraryPackageManifest[] {
  return Array.from(installedPackages.values()).map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    dependencies: pkg.dependencies,
  }));
}

export function getLibraryPackage(id: string): LibraryPackage | undefined {
  const pkg = installedPackages.get(id);
  return pkg ? { ...pkg } : undefined;
}

export function createLibraryPackage(manifest: LibraryPackageManifest, data: LibraryData): LibraryPackage {
  return {
    ...manifest,
    symbols: data.symbols,
    devices: data.devices,
    footprints: data.footprints,
    datasheets: data.datasheets || [],
  };
}

export function clearLibraryPackages(): void {
  installedPackages.clear();
}
