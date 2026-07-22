import { ComponentMetadata } from '../component-library/types';
import { globalRegistry } from '../component-library';
import { getDatasheet, listDatasheets } from './datasheets/manager';
import { getDevice } from './devices/manager';
import { getFootprint } from './footprints/manager';
import { getSymbol } from './symbols/manager';
import { DeviceDefinition, FootprintDefinition, SymbolDefinition } from './types';

export interface LibraryMetadataRecord {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  aliases: string[];
  electricalPins: string[];
  documentation: string[];
  source: 'component' | 'device' | 'symbol' | 'footprint';
  raw: ComponentMetadata | DeviceDefinition | SymbolDefinition | FootprintDefinition;
}

function normalizeTokens(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function resolveDocumentation(values: Array<string | undefined>): string[] {
  const docs: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const registered = getDatasheet(value);
    docs.push(registered?.url || value);
  }
  return normalizeTokens(docs);
}

export function getLibraryMetadata(id: string): LibraryMetadataRecord | undefined {
  const component = globalRegistry.getById(id);
  if (component) {
    return {
      id: component.id,
      name: component.name,
      category: component.tvcs?.categoryPath?.[0] || 'Uncategorized',
      description: component.description,
      tags: normalizeTokens([...(component.tvcs?.tags || []), ...(component.knowledge?.tags || []), ...(component.keywords || [])]),
      aliases: normalizeTokens(component.aliases || []),
      electricalPins: component.electrical.pins.map((pin) => pin.id),
      documentation: [],
      source: 'component',
      raw: component,
    };
  }

  const device = getDevice(id);
  if (device) {
    return {
      id: device.id,
      name: device.name,
      category: device.category,
      description: device.description,
      tags: normalizeTokens([
        device.category,
        device.metadata.mechanical?.packageType,
        device.metadata.commercial?.lifecycle,
        ...device.manufacturerParts.map((part) => part.packageOption),
      ]),
      aliases: normalizeTokens([
        device.metadata.commercial?.mpn,
        ...device.manufacturerParts.flatMap((part) => [part.mpn, part.manufacturer]),
      ]),
      electricalPins: device.pinMappings.map((mapping) => mapping.symbolPinId),
      documentation: resolveDocumentation([
        device.metadata.documentation.datasheet,
        device.metadata.documentation.referenceManual,
        device.metadata.documentation.manufacturerUrl,
        ...(device.metadata.documentation.applicationNotes || []),
        ...listDatasheets()
          .filter((datasheet) => datasheet.id === device.id || datasheet.id.startsWith(`${device.id}:`))
          .map((datasheet) => datasheet.id),
      ]),
      source: 'device',
      raw: device,
    };
  }

  const symbol = getSymbol(id);
  if (symbol) {
    return {
      id: symbol.id,
      name: symbol.displayName,
      category: symbol.category,
      description: symbol.description,
      tags: normalizeTokens([...symbol.tags, ...symbol.keywords]),
      aliases: normalizeTokens(symbol.aliases),
      electricalPins: symbol.units.flatMap((unit) => unit.pins.map((pin) => pin.id)),
      documentation: [],
      source: 'symbol',
      raw: symbol,
    };
  }

  const footprint = getFootprint(id);
  if (footprint) {
    return {
      id: footprint.id,
      name: footprint.name,
      category: footprint.mountType,
      description: footprint.description,
      tags: normalizeTokens([footprint.mountType, `${footprint.padCount}-pad`]),
      aliases: [],
      electricalPins: [],
      documentation: [],
      source: 'footprint',
      raw: footprint,
    };
  }

  return undefined;
}
