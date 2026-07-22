/**
 * Library Ecosystem — Extended Test Suite
 *
 * Covers Parts 1–17 of Milestone B in depth:
 *   Symbol Library, Device Library, Footprint Infrastructure, Metadata Engine,
 *   Datasheet Manager, Search Engine, Validation, Import/Export, Versioning,
 *   Favorites & Recent, Cache Layer, Property Inspector, Project Explorer,
 *   AI Knowledge, Persistence, Performance characteristics.
 */

import {
  // Symbol Manager
  registerSymbol,
  unregisterSymbol,
  getSymbol,
  listSymbols,
  clearSymbols,
  resolveInheritedSymbol,
  // Device Manager
  registerDevice,
  unregisterDevice,
  getDevice,
  listDevices,
  clearDevices,
  findEquivalentDevices,
  // Footprint Manager
  registerFootprint,
  unregisterFootprint,
  getFootprint,
  listFootprints,
  clearFootprints,
  // Datasheet Manager
  registerDatasheet,
  unregisterDatasheet,
  getDatasheet,
  listDatasheets,
  clearDatasheets,
  // Types
  type SymbolDefinition,
  type DeviceDefinition,
  type FootprintDefinition,
  type DatasheetReference,
  type LibraryData,
  // Catalog
  listCatalogItems,
  listCatalogPage,
  getCatalogItem,
  createCatalogItemFromComponent,
  // Metadata
  getLibraryMetadata,
  // Search
  searchLibrary,
  searchLibraryPage,
  getSearchIndexSnapshot,
  // Validation
  validateLibrary,
  // Versioning
  parseSemVer,
  compareSemVer,
  registerMigration,
  clearMigrations,
  migrateComponent,
  // Package Manager
  installLibraryPackage,
  uninstallLibraryPackage,
  listLibraryPackages,
  getLibraryPackage,
  createLibraryPackage,
  clearLibraryPackages,
  // Storage
  createLibrarySnapshot,
  saveLibrarySnapshot,
  loadLibrarySnapshot,
  hydrateLibraryData,
  MemoryLibraryStorageProvider,
  // Cache
  LibraryCache,
  globalLibraryCache,
  // Usage
  globalLibraryUsage,
  // Import/Export
  JsonLibraryAdapter,
  YamlLibraryAdapter,
  KiCadLibraryAdapter,
  EagleLibraryAdapter,
  AltiumLibraryAdapter,
  // Integrations
  getInspectorLibraryMetadata,
  matchesProjectExplorerLibraryQuery,
  markCatalogItemUsed,
  listFavoriteCatalogItems,
  createSemanticObjectFromCatalogItem,
  addCatalogItemToObjectEngine,
} from '../src/library';
import { ObjectEngine } from '../src/object-engine';
import { ExplorerSearch } from '../src/project-explorer/search';
import { PropertyFormatter } from '../src/property-inspector/formatter';
import { lookupKnowledge } from '../src/ai';
import { PersistenceSerializer, PersistenceDeserializer, PersistenceValidator } from '../src/persistence';
import { globalRegistry } from '../src/component-library';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function makeSymbol(id: string, opts: Partial<SymbolDefinition> = {}): SymbolDefinition {
  return {
    id,
    displayName: opts.displayName ?? `Symbol ${id}`,
    internalName: opts.internalName ?? id.toLowerCase(),
    description: opts.description ?? `Description for ${id}`,
    category: opts.category ?? 'General',
    subcategory: opts.subcategory ?? 'Misc',
    tags: opts.tags ?? ['test'],
    aliases: opts.aliases ?? [],
    keywords: opts.keywords ?? [],
    version: opts.version ?? '1.0.0',
    author: opts.author ?? 'Test',
    license: opts.license ?? 'MIT',
    creationDate: opts.creationDate ?? '2026-01-01T00:00:00.000Z',
    lastModificationDate: opts.lastModificationDate ?? '2026-01-01T00:00:00.000Z',
    deprecationState: opts.deprecationState ?? 'active',
    variants: opts.variants ?? [{ id: 'default', name: 'Default', pins: [{ id: 'P1', name: 'P1', direction: 'passive' }] }],
    units: opts.units ?? [{ id: 'u1', name: 'A', pins: [{ id: 'P1', name: 'P1', direction: 'passive' }] }],
    alternateViews: opts.alternateViews ?? [],
    parentSymbolId: opts.parentSymbolId,
  };
}

function makeDevice(id: string, symbolIds: string[] = [], footprintIds: string[] = [], opts: Partial<DeviceDefinition> = {}): DeviceDefinition {
  return {
    id,
    name: opts.name ?? `Device ${id}`,
    description: opts.description ?? `Device for ${id}`,
    category: opts.category ?? 'General',
    symbolIds,
    footprintIds,
    manufacturerParts: opts.manufacturerParts ?? [{ manufacturer: 'TINC', mpn: `MPN-${id}`, packageOption: 'SMD', lifecycle: 'Active', availability: 100 }],
    pinMappings: opts.pinMappings ?? [],
    functionalEquivalents: opts.functionalEquivalents ?? [],
    metadata: opts.metadata ?? {
      electrical: { voltage: { min: 0, max: 5, unit: 'V' } },
      mechanical: { packageType: 'SMD', height: 1, width: 2, weight: 0.01 },
      commercial: { manufacturer: 'TINC', mpn: `MPN-${id}`, lifecycle: 'Active', availability: 100, rohs: true, reach: true },
      documentation: { datasheet: `https://example.com/${id}.pdf` },
    },
    version: opts.version ?? '1.0.0',
    deprecationState: opts.deprecationState ?? 'active',
  };
}

function makeFootprint(id: string, opts: Partial<FootprintDefinition> = {}): FootprintDefinition {
  return {
    id,
    name: opts.name ?? `FP ${id}`,
    description: opts.description ?? `Footprint for ${id}`,
    packageDimensions: opts.packageDimensions ?? { height: 1.5, width: 3.0, length: 4.0, weight: 0.05 },
    padCount: opts.padCount ?? 4,
    mountType: opts.mountType ?? 'SMD',
    ipcMetadata: opts.ipcMetadata ?? {},
    courtyardMetadata: opts.courtyardMetadata ?? {},
    keepoutMetadata: opts.keepoutMetadata ?? {},
  };
}

function makeDatasheet(id: string, opts: Partial<DatasheetReference> = {}): DatasheetReference {
  return {
    id,
    title: opts.title ?? `Datasheet ${id}`,
    url: opts.url ?? `https://example.com/${id}.pdf`,
    hash: opts.hash,
    localPath: opts.localPath,
    fileSize: opts.fileSize,
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  clearSymbols();
  clearDevices();
  clearFootprints();
  clearDatasheets();
  clearLibraryPackages();
  clearMigrations();
  globalLibraryUsage.clear();
  globalLibraryCache.clear();
});

// ─── PART 1: Symbol Library ───────────────────────────────────────────────────

describe('Part 1 — Symbol Library', () => {
  it('registers and retrieves a symbol by ID', () => {
    const sym = makeSymbol('sym-1');
    registerSymbol(sym);
    expect(getSymbol('sym-1')).toMatchObject({ id: 'sym-1', displayName: 'Symbol sym-1' });
  });

  it('unregisters a symbol', () => {
    registerSymbol(makeSymbol('sym-2'));
    unregisterSymbol('sym-2');
    expect(getSymbol('sym-2')).toBeUndefined();
  });

  it('lists all registered symbols', () => {
    registerSymbol(makeSymbol('s1'));
    registerSymbol(makeSymbol('s2'));
    registerSymbol(makeSymbol('s3'));
    expect(listSymbols().length).toBe(3);
  });

  it('clearSymbols removes all entries', () => {
    registerSymbol(makeSymbol('s1'));
    registerSymbol(makeSymbol('s2'));
    clearSymbols();
    expect(listSymbols()).toHaveLength(0);
  });

  it('throws when registering symbol without ID', () => {
    expect(() => registerSymbol({ ...makeSymbol('ok'), id: '' })).toThrow('Symbol ID is required');
  });

  it('supports symbol categories, subcategories, tags and aliases', () => {
    const sym = makeSymbol('sym-cat', { category: 'Analog', subcategory: 'Amplifier', tags: ['opamp', 'analog'], aliases: ['oa'] });
    registerSymbol(sym);
    const retrieved = getSymbol('sym-cat')!;
    expect(retrieved.category).toBe('Analog');
    expect(retrieved.subcategory).toBe('Amplifier');
    expect(retrieved.tags).toContain('opamp');
    expect(retrieved.aliases).toContain('oa');
  });

  it('supports multiple variants per symbol', () => {
    const sym = makeSymbol('sym-v', {
      variants: [
        { id: 'v1', name: 'IEEE', pins: [{ id: 'IN', name: 'IN', direction: 'input' }] },
        { id: 'v2', name: 'DIN', pins: [{ id: 'IN', name: 'IN', direction: 'input' }, { id: 'OUT', name: 'OUT', direction: 'output' }] },
      ],
    });
    registerSymbol(sym);
    expect(getSymbol('sym-v')!.variants).toHaveLength(2);
    expect(getSymbol('sym-v')!.variants[1].pins).toHaveLength(2);
  });

  it('supports multiple units per symbol', () => {
    const sym = makeSymbol('sym-u', {
      units: [
        { id: 'u1', name: 'Unit A', pins: [{ id: 'IN+', name: 'IN+', direction: 'input' }] },
        { id: 'u2', name: 'Unit B', pins: [{ id: 'IN-', name: 'IN-', direction: 'input' }] },
      ],
    });
    registerSymbol(sym);
    expect(getSymbol('sym-u')!.units).toHaveLength(2);
  });

  it('supports pin grouping within a unit', () => {
    const sym = makeSymbol('sym-pg', {
      units: [{
        id: 'u1',
        name: 'Main',
        pins: [
          { id: 'A', name: 'A', direction: 'input' },
          { id: 'B', name: 'B', direction: 'input' },
        ],
        pinGroups: [{ name: 'Inputs', pins: ['A', 'B'] }],
      }],
    });
    registerSymbol(sym);
    expect(getSymbol('sym-pg')!.units[0].pinGroups).toHaveLength(1);
    expect(getSymbol('sym-pg')!.units[0].pinGroups![0].pins).toContain('A');
  });

  it('resolves single-level symbol inheritance', () => {
    const parent = makeSymbol('sym-parent', {
      tags: ['parent-tag'],
      aliases: ['parent-alias'],
      keywords: ['pk1'],
      units: [{ id: 'pu1', name: 'Parent Unit', pins: [{ id: 'PPIN', name: 'PPIN', direction: 'passive' }] }],
    });
    const child = makeSymbol('sym-child', {
      parentSymbolId: 'sym-parent',
      tags: ['child-tag'],
      aliases: ['child-alias'],
      keywords: ['ck1'],
      units: [],  // empty → inherit from parent
    });
    registerSymbol(parent);
    registerSymbol(child);

    const resolved = getSymbol('sym-child')!;
    // Tags and keywords and aliases merged
    expect(resolved.tags).toEqual(expect.arrayContaining(['parent-tag', 'child-tag']));
    expect(resolved.aliases).toEqual(expect.arrayContaining(['parent-alias', 'child-alias']));
    expect(resolved.keywords).toEqual(expect.arrayContaining(['pk1', 'ck1']));
    // Units inherited from parent when child has none
    expect(resolved.units).toHaveLength(1);
    expect(resolved.units[0].pins[0].id).toBe('PPIN');
  });

  it('child overrides parent variants when non-empty', () => {
    const parent = makeSymbol('sym-par2', {
      variants: [{ id: 'pv', name: 'Parent Variant', pins: [{ id: 'PP', name: 'PP', direction: 'passive' }] }],
    });
    const child = makeSymbol('sym-ch2', {
      parentSymbolId: 'sym-par2',
      variants: [{ id: 'cv', name: 'Child Variant', pins: [{ id: 'CP', name: 'CP', direction: 'passive' }] }],
    });
    registerSymbol(parent);
    registerSymbol(child);
    const resolved = getSymbol('sym-ch2')!;
    expect(resolved.variants[0].id).toBe('cv');
  });

  it('resolveInheritedSymbol breaks circular inheritance safely', () => {
    const a = makeSymbol('circ-a', { parentSymbolId: 'circ-b' });
    const b = makeSymbol('circ-b', { parentSymbolId: 'circ-a' });
    registerSymbol(a);
    registerSymbol(b);
    // Should not throw or loop infinitely
    expect(() => getSymbol('circ-a')).not.toThrow();
    expect(() => getSymbol('circ-b')).not.toThrow();
  });

  it('symbol without parentSymbolId is returned as-is', () => {
    const sym = makeSymbol('sym-no-parent');
    registerSymbol(sym);
    const raw = sym;
    const resolved = resolveInheritedSymbol(raw);
    expect(resolved).toBe(raw);
  });

  it('supports deprecation state', () => {
    registerSymbol(makeSymbol('sym-active', { deprecationState: 'active' }));
    registerSymbol(makeSymbol('sym-dep', { deprecationState: 'deprecated' }));
    registerSymbol(makeSymbol('sym-obs', { deprecationState: 'obsolete' }));
    expect(getSymbol('sym-active')!.deprecationState).toBe('active');
    expect(getSymbol('sym-dep')!.deprecationState).toBe('deprecated');
    expect(getSymbol('sym-obs')!.deprecationState).toBe('obsolete');
  });

  it('supports alternate views field', () => {
    const sym = makeSymbol('sym-alt', { alternateViews: ['de-morgan', 'functional'] });
    registerSymbol(sym);
    expect(getSymbol('sym-alt')!.alternateViews).toContain('de-morgan');
  });

  it('symbol registry updates when re-registering same ID', () => {
    registerSymbol(makeSymbol('sym-dup', { displayName: 'First' }));
    registerSymbol(makeSymbol('sym-dup', { displayName: 'Second' }));
    expect(getSymbol('sym-dup')!.displayName).toBe('Second');
  });
});

// ─── PART 2: Device Library ───────────────────────────────────────────────────

describe('Part 2 — Device Library', () => {
  it('registers and retrieves a device by ID', () => {
    const dev = makeDevice('dev-1', ['s1'], ['fp1']);
    registerDevice(dev);
    expect(getDevice('dev-1')).toMatchObject({ id: 'dev-1' });
  });

  it('unregisters a device', () => {
    registerDevice(makeDevice('dev-del'));
    unregisterDevice('dev-del');
    expect(getDevice('dev-del')).toBeUndefined();
  });

  it('lists all devices', () => {
    registerDevice(makeDevice('d1'));
    registerDevice(makeDevice('d2'));
    expect(listDevices()).toHaveLength(2);
  });

  it('clearDevices removes all entries', () => {
    registerDevice(makeDevice('d1'));
    clearDevices();
    expect(listDevices()).toHaveLength(0);
  });

  it('throws when registering device without ID', () => {
    expect(() => registerDevice({ ...makeDevice('ok'), id: '' })).toThrow('Device ID is required');
  });

  it('stores multiple manufacturer parts per device', () => {
    const dev = makeDevice('dev-multi', [], [], {
      manufacturerParts: [
        { manufacturer: 'TI', mpn: 'LM358DR', packageOption: 'SOIC-8', lifecycle: 'Active', availability: 1000 },
        { manufacturer: 'STM', mpn: 'LM358DT', packageOption: 'SOIC-8', lifecycle: 'Active', availability: 500 },
      ],
    });
    registerDevice(dev);
    expect(getDevice('dev-multi')!.manufacturerParts).toHaveLength(2);
    expect(getDevice('dev-multi')!.manufacturerParts.map(p => p.manufacturer)).toContain('STM');
  });

  it('supports pin mappings between symbols and footprints', () => {
    const dev = makeDevice('dev-mapped', ['sym1'], ['fp1'], {
      pinMappings: [
        { symbolPinId: 'IN+', footprintPadId: '1', functionName: 'Positive Input' },
        { symbolPinId: 'IN-', footprintPadId: '2', functionName: 'Negative Input' },
      ],
    });
    registerDevice(dev);
    expect(getDevice('dev-mapped')!.pinMappings).toHaveLength(2);
  });

  it('finds functional equivalent devices', () => {
    registerDevice(makeDevice('dev-a'));
    registerDevice(makeDevice('dev-b'));
    const dev = makeDevice('dev-main', [], [], { functionalEquivalents: ['dev-a', 'dev-b'] });
    registerDevice(dev);
    const equivalents = findEquivalentDevices('dev-main');
    expect(equivalents.map(d => d.id)).toEqual(expect.arrayContaining(['dev-a', 'dev-b']));
  });

  it('findEquivalentDevices returns empty for device with no equivalents', () => {
    registerDevice(makeDevice('dev-solo'));
    expect(findEquivalentDevices('dev-solo')).toHaveLength(0);
  });

  it('findEquivalentDevices returns empty for non-existent ID', () => {
    expect(findEquivalentDevices('does-not-exist')).toHaveLength(0);
  });

  it('stores full electrical metadata', () => {
    const dev = makeDevice('dev-elec', [], [], {
      metadata: {
        electrical: {
          voltage: { min: 3.3, nominal: 5, max: 12, unit: 'V' },
          current: { nominal: 0.1, max: 0.5, unit: 'A' },
          power: { max: 2, unit: 'W' },
          frequency: { max: 100e6, unit: 'Hz' },
        },
        mechanical: { packageType: 'DIP-8', height: 5.5, width: 7.6, weight: 0.3 },
        commercial: { manufacturer: 'NXP', mpn: 'SA555D', lifecycle: 'Active', availability: 5000, rohs: true, reach: true },
        documentation: { datasheet: 'https://nxp.com/sa555d.pdf', applicationNotes: ['app-note-1'], manufacturerUrl: 'https://nxp.com' },
      },
    });
    registerDevice(dev);
    const d = getDevice('dev-elec')!;
    expect(d.metadata.electrical.voltage!.nominal).toBe(5);
    expect(d.metadata.electrical.current!.max).toBe(0.5);
    expect(d.metadata.electrical.power!.max).toBe(2);
    expect(d.metadata.electrical.frequency!.max).toBe(100e6);
  });

  it('supports all commercial lifecycle states', () => {
    const lifecycles = ['Pre-release', 'Active', 'NRND', 'EOL', 'Obsolete'] as const;
    for (const lc of lifecycles) {
      const id = `dev-lc-${lc}`;
      registerDevice(makeDevice(id, [], [], {
        metadata: {
          electrical: {},
          mechanical: { packageType: 'SMD', height: 1, width: 1, weight: 0 },
          commercial: { manufacturer: 'Test', mpn: `T-${lc}`, lifecycle: lc, availability: 0, rohs: true, reach: false },
          documentation: {},
        },
      }));
      expect(getDevice(id)!.metadata.commercial.lifecycle).toBe(lc);
    }
  });

  it('supports generic vs manufacturer-specific devices via category and manufacturerParts', () => {
    const generic = makeDevice('dev-generic', [], [], { category: 'Generic', manufacturerParts: [] });
    const specific = makeDevice('dev-specific', [], [], { category: 'Specific', manufacturerParts: [{ manufacturer: 'TI', mpn: 'LMX1', packageOption: 'TQFP', lifecycle: 'Active', availability: 200 }] });
    registerDevice(generic);
    registerDevice(specific);
    expect(getDevice('dev-generic')!.manufacturerParts).toHaveLength(0);
    expect(getDevice('dev-specific')!.manufacturerParts).toHaveLength(1);
  });
});

// ─── PART 3: Footprint Infrastructure ────────────────────────────────────────

describe('Part 3 — Footprint Infrastructure', () => {
  it('registers and retrieves a footprint', () => {
    const fp = makeFootprint('fp-dip8', { name: 'DIP-8', padCount: 8, mountType: 'THT' });
    registerFootprint(fp);
    expect(getFootprint('fp-dip8')).toMatchObject({ id: 'fp-dip8', name: 'DIP-8' });
  });

  it('unregisters a footprint', () => {
    registerFootprint(makeFootprint('fp-del'));
    unregisterFootprint('fp-del');
    expect(getFootprint('fp-del')).toBeUndefined();
  });

  it('lists all footprints', () => {
    registerFootprint(makeFootprint('fp1'));
    registerFootprint(makeFootprint('fp2'));
    expect(listFootprints()).toHaveLength(2);
  });

  it('clearFootprints removes all entries', () => {
    registerFootprint(makeFootprint('fp1'));
    clearFootprints();
    expect(listFootprints()).toHaveLength(0);
  });

  it('throws when registering footprint without ID', () => {
    expect(() => registerFootprint({ ...makeFootprint('ok'), id: '' })).toThrow('Footprint ID is required');
  });

  it('supports SMD mount type', () => {
    const fp = makeFootprint('fp-smd', { mountType: 'SMD', padCount: 8 });
    registerFootprint(fp);
    expect(getFootprint('fp-smd')!.mountType).toBe('SMD');
  });

  it('supports THT mount type', () => {
    const fp = makeFootprint('fp-tht', { mountType: 'THT', padCount: 2 });
    registerFootprint(fp);
    expect(getFootprint('fp-tht')!.mountType).toBe('THT');
  });

  it('supports Other mount type', () => {
    const fp = makeFootprint('fp-other', { mountType: 'Other', padCount: 0 });
    registerFootprint(fp);
    expect(getFootprint('fp-other')!.mountType).toBe('Other');
  });

  it('stores package dimensions', () => {
    const fp = makeFootprint('fp-dim', { packageDimensions: { height: 2.5, width: 6.0, length: 8.0, weight: 0.2 } });
    registerFootprint(fp);
    const d = getFootprint('fp-dim')!.packageDimensions;
    expect(d.height).toBe(2.5);
    expect(d.width).toBe(6.0);
    expect(d.length).toBe(8.0);
    expect(d.weight).toBe(0.2);
  });

  it('stores IPC, courtyard and keepout metadata', () => {
    const fp = makeFootprint('fp-meta', {
      ipcMetadata: { class: 'A', density: 'nominal' },
      courtyardMetadata: { margin: 0.25 },
      keepoutMetadata: { copper: true, silkscreen: false },
    });
    registerFootprint(fp);
    const retrieved = getFootprint('fp-meta')!;
    expect(retrieved.ipcMetadata).toMatchObject({ class: 'A' });
    expect(retrieved.courtyardMetadata).toMatchObject({ margin: 0.25 });
    expect(retrieved.keepoutMetadata).toMatchObject({ copper: true });
  });

  it('correctly stores pad count for various packages', () => {
    const packages = [{ id: 'soic8', pads: 8 }, { id: 'qfp44', pads: 44 }, { id: 'bga256', pads: 256 }];
    for (const p of packages) {
      registerFootprint(makeFootprint(p.id, { padCount: p.pads }));
      expect(getFootprint(p.id)!.padCount).toBe(p.pads);
    }
  });
});

// ─── PART 4: Metadata Engine ──────────────────────────────────────────────────

describe('Part 4 — Metadata Engine', () => {
  it('returns metadata for component-library backed objects', () => {
    const meta = getLibraryMetadata('ESP32');
    expect(meta).toBeDefined();
    expect(meta!.source).toBe('component');
    expect(meta!.name).toBe('ESP32 DevKit');
    expect(meta!.electricalPins.length).toBeGreaterThan(0);
  });

  it('returns metadata for registered symbols', () => {
    const sym = makeSymbol('sym-meta', {
      category: 'Analog', tags: ['opamp'], aliases: ['oa'],
      units: [{ id: 'u1', name: 'A', pins: [{ id: 'IN+', name: 'IN+', direction: 'input' }] }],
    });
    registerSymbol(sym);
    const meta = getLibraryMetadata('sym-meta')!;
    expect(meta.source).toBe('symbol');
    expect(meta.category).toBe('Analog');
    expect(meta.tags).toContain('opamp');
    expect(meta.electricalPins).toContain('IN+');
  });

  it('returns metadata for registered devices with documentation URLs', () => {
    const sym = makeSymbol('sym-d');
    registerSymbol(sym);
    const dev = makeDevice('dev-d', ['sym-d'], [], {
      metadata: {
        electrical: { voltage: { min: 0, max: 5, unit: 'V' } },
        mechanical: { packageType: 'SOIC-8', height: 1.75, width: 4.9, weight: 0.1 },
        commercial: { manufacturer: 'TI', mpn: 'LM358', lifecycle: 'Active', availability: 1000, rohs: true, reach: true },
        documentation: { datasheet: 'https://ti.com/lm358.pdf', applicationNotes: ['app1'], manufacturerUrl: 'https://ti.com' },
      },
    });
    registerDevice(dev);
    const meta = getLibraryMetadata('dev-d')!;
    expect(meta.source).toBe('device');
    expect(meta.documentation).toContain('https://ti.com/lm358.pdf');
    expect(meta.documentation).toContain('https://ti.com');
  });

  it('returns metadata for registered footprints', () => {
    const fp = makeFootprint('fp-md', { mountType: 'THT', padCount: 2 });
    registerFootprint(fp);
    const meta = getLibraryMetadata('fp-md')!;
    expect(meta.source).toBe('footprint');
    expect(meta.tags).toContain('THT');
    expect(meta.tags).toContain('2-pad');
  });

  it('returns undefined for unknown IDs', () => {
    expect(getLibraryMetadata('does-not-exist')).toBeUndefined();
  });

  it('device metadata includes aliases from all manufacturer parts', () => {
    const dev = makeDevice('dev-aliases', [], [], {
      manufacturerParts: [
        { manufacturer: 'TI', mpn: 'LM741CN', packageOption: 'DIP-8', lifecycle: 'Active', availability: 100 },
        { manufacturer: 'LT', mpn: 'LT741C', packageOption: 'TO-99', lifecycle: 'NRND', availability: 10 },
      ],
    });
    registerDevice(dev);
    const meta = getLibraryMetadata('dev-aliases')!;
    expect(meta.aliases).toEqual(expect.arrayContaining(['LM741CN', 'LT741C', 'TI', 'LT']));
  });
});

// ─── PART 5: Datasheet Manager ────────────────────────────────────────────────

describe('Part 5 — Datasheet Manager', () => {
  it('registers and retrieves a datasheet reference', () => {
    const ds = makeDatasheet('ds-1');
    registerDatasheet(ds);
    expect(getDatasheet('ds-1')).toMatchObject({ id: 'ds-1' });
  });

  it('unregisters a datasheet', () => {
    registerDatasheet(makeDatasheet('ds-del'));
    unregisterDatasheet('ds-del');
    expect(getDatasheet('ds-del')).toBeUndefined();
  });

  it('lists all datasheets', () => {
    registerDatasheet(makeDatasheet('ds-a'));
    registerDatasheet(makeDatasheet('ds-b'));
    expect(listDatasheets()).toHaveLength(2);
  });

  it('clearDatasheets removes all entries', () => {
    registerDatasheet(makeDatasheet('ds-1'));
    clearDatasheets();
    expect(listDatasheets()).toHaveLength(0);
  });

  it('supports local file path references', () => {
    const ds = makeDatasheet('ds-local', { url: 'file:///home/user/datasheets/esp32.pdf', localPath: '/home/user/datasheets/esp32.pdf' });
    registerDatasheet(ds);
    expect(getDatasheet('ds-local')!.localPath).toBe('/home/user/datasheets/esp32.pdf');
  });

  it('supports remote URL references', () => {
    const ds = makeDatasheet('ds-remote', { url: 'https://espressif.com/esp32.pdf' });
    registerDatasheet(ds);
    expect(getDatasheet('ds-remote')!.url).toMatch(/^https?:\/\//);
  });

  it('tracks version hash for datasheets', () => {
    const ds = makeDatasheet('ds-hash', { hash: 'sha256:abc123' });
    registerDatasheet(ds);
    expect(getDatasheet('ds-hash')!.hash).toBe('sha256:abc123');
  });

  it('stores file size metadata', () => {
    const ds = makeDatasheet('ds-size', { fileSize: 2048576 });
    registerDatasheet(ds);
    expect(getDatasheet('ds-size')!.fileSize).toBe(2048576);
  });
});

// ─── PART 6: Search Engine ────────────────────────────────────────────────────

describe('Part 6 — Search Engine', () => {
  beforeEach(() => {
    registerSymbol(makeSymbol('sym-opamp', { displayName: 'Operational Amplifier', category: 'Analog', tags: ['analog', 'amplifier'], aliases: ['opamp'], keywords: ['gain'] }));
    registerSymbol(makeSymbol('sym-diode', { displayName: 'Rectifier Diode', category: 'Discrete', tags: ['diode', 'discrete'] }));
    registerFootprint(makeFootprint('fp-soic8', { name: 'SOIC-8', mountType: 'SMD', padCount: 8 }));
    registerDevice(makeDevice('dev-lm358', ['sym-opamp'], ['fp-soic8'], { name: 'LM358', metadata: {
      electrical: { voltage: { min: 3, max: 32, unit: 'V' } },
      mechanical: { packageType: 'SOIC-8', height: 1.75, width: 4.9, weight: 0.1 },
      commercial: { manufacturer: 'Texas Instruments', mpn: 'LM358DR', lifecycle: 'Active', availability: 1000, rohs: true, reach: true },
      documentation: {},
    }}));
    registerDatasheet(makeDatasheet('ds-lm358', { title: 'LM358 Datasheet', url: 'https://ti.com/lm358.pdf' }));
  });

  it('rebuilds search index and includes all types', () => {
    const snapshot = getSearchIndexSnapshot();
    const types = new Set(snapshot.map(d => d.type));
    expect(types).toContain('symbol');
    expect(types).toContain('device');
    expect(types).toContain('footprint');
    expect(types).toContain('datasheet');
  });

  it('exact name match returns highest score', () => {
    const results = searchLibrary('LM358');
    expect(results[0].doc.id).toBe('dev-lm358');
    expect(results[0].score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it('exact MPN match scores very high', () => {
    const results = searchLibrary('LM358DR');
    expect(results[0].doc.id).toBe('dev-lm358');
  });

  it('prefix name match finds results', () => {
    const results = searchLibrary('Operat');
    expect(results.map(r => r.doc.id)).toContain('sym-opamp');
  });

  it('keyword search returns relevant symbols', () => {
    const results = searchLibrary('amplifier', { type: 'symbol' });
    expect(results.map(r => r.doc.id)).toContain('sym-opamp');
  });

  it('alias search finds matching symbol', () => {
    const results = searchLibrary('opamp');
    expect(results.map(r => r.doc.id)).toContain('sym-opamp');
  });

  it('category filter narrows results', () => {
    const results = searchLibrary('', { category: 'Analog' });
    expect(results.every(r => r.doc.category === 'Analog')).toBe(true);
  });

  it('type filter returns only matching type', () => {
    const results = searchLibrary('', { type: 'footprint' });
    expect(results.every(r => r.doc.type === 'footprint')).toBe(true);
    expect(results.map(r => r.doc.id)).toContain('fp-soic8');
  });

  it('manufacturer filter returns matching devices', () => {
    const results = searchLibrary('', { manufacturer: 'Texas Instruments' });
    expect(results.map(r => r.doc.id)).toContain('dev-lm358');
  });

  it('tag filter returns matching symbols', () => {
    const results = searchLibrary('', { tag: 'diode' });
    expect(results.map(r => r.doc.id)).toContain('sym-diode');
    expect(results.map(r => r.doc.id)).not.toContain('sym-opamp');
  });

  it('fuzzy search finds close matches', () => {
    const results = searchLibrary('LM358D', undefined, { fuzzy: true });
    expect(results.length).toBeGreaterThan(0);
  });

  it('sorts by name ascending', () => {
    const results = searchLibrary('', undefined, { sortBy: 'name', sortOrder: 'asc' });
    const names = results.map(r => r.doc.name.toLowerCase());
    for (let i = 1; i < names.length; i++) {
      expect(names[i] >= names[i - 1]).toBe(true);
    }
  });

  it('sorts by name descending', () => {
    const results = searchLibrary('', undefined, { sortBy: 'name', sortOrder: 'desc' });
    const names = results.map(r => r.doc.name.toLowerCase());
    for (let i = 1; i < names.length; i++) {
      expect(names[i] <= names[i - 1]).toBe(true);
    }
  });

  it('pagination returns correct page', () => {
    const page1 = searchLibrary('', undefined, { page: 1, pageSize: 2 });
    const page2 = searchLibrary('', undefined, { page: 2, pageSize: 2 });
    expect(page1).toHaveLength(2);
    // Pages should have different results
    expect(page1[0].doc.id).not.toBe(page2[0]?.doc.id);
  });

  it('searchLibraryPage returns paginated metadata', () => {
    const page = searchLibraryPage('', undefined, { page: 1, pageSize: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBeGreaterThan(2);
    expect(page.totalPages).toBeGreaterThan(1);
    expect(page.hasNextPage).toBe(true);
    expect(page.query).toBe('');
  });

  it('empty query returns all indexed documents', () => {
    const results = searchLibrary('');
    expect(results.length).toBe(getSearchIndexSnapshot().length);
  });

  it('mountType filter returns matching footprints', () => {
    const results = searchLibrary('', { mountType: 'SMD' });
    expect(results.every(r => r.doc.mountType === 'SMD')).toBe(true);
  });

  it('datasheet type search finds indexed datasheets', () => {
    const results = searchLibrary('Datasheet', { type: 'datasheet' });
    expect(results.map(r => r.doc.id)).toContain('ds-lm358');
  });
});

// ─── PART 7: Validation Engine ────────────────────────────────────────────────

describe('Part 7 — Validation Engine', () => {
  it('reports no diagnostics for a valid library', () => {
    registerSymbol(makeSymbol('sym-v1'));
    registerFootprint(makeFootprint('fp-v1'));
    registerDevice(makeDevice('dev-v1', ['sym-v1'], ['fp-v1']));
    const diags = validateLibrary();
    expect(diags).toHaveLength(0);
  });

  it('detects duplicate IDs across devices, symbols, and footprints', () => {
    registerSymbol(makeSymbol('shared-id'));
    registerDevice(makeDevice('shared-id', [], []));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'duplicate-id')).toBe(true);
  });

  it('detects duplicate symbol display names within same category', () => {
    registerSymbol(makeSymbol('sym-a1', { category: 'Analog', displayName: 'OpAmp' }));
    registerSymbol(makeSymbol('sym-a2', { category: 'Analog', displayName: 'OpAmp' }));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'duplicate-name')).toBe(true);
  });

  it('does not flag duplicate names across different categories', () => {
    registerSymbol(makeSymbol('sym-b1', { category: 'Analog', displayName: 'Buffer' }));
    registerSymbol(makeSymbol('sym-b2', { category: 'Digital', displayName: 'Buffer' }));
    const diags = validateLibrary().filter(d => d.type === 'duplicate-name');
    expect(diags).toHaveLength(0);
  });

  it('detects circular symbol inheritance', () => {
    registerSymbol(makeSymbol('circ-1', { parentSymbolId: 'circ-2' }));
    registerSymbol(makeSymbol('circ-2', { parentSymbolId: 'circ-1' }));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'circular-inheritance')).toBe(true);
  });

  it('detects missing symbol reference from device', () => {
    registerDevice(makeDevice('dev-missing-sym', ['non-existent-symbol'], []));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'missing-symbol' && d.targetId === 'dev-missing-sym')).toBe(true);
  });

  it('detects missing footprint reference from device', () => {
    const sym = makeSymbol('sym-fp-test');
    registerSymbol(sym);
    registerDevice(makeDevice('dev-missing-fp', ['sym-fp-test'], ['non-existent-fp']));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'missing-footprint' && d.targetId === 'dev-missing-fp')).toBe(true);
  });

  it('detects broken pin mapping to non-existent symbol pin', () => {
    const sym = makeSymbol('sym-pm', {
      variants: [{ id: 'v1', name: 'V1', pins: [{ id: 'REAL-PIN', name: 'REAL-PIN', direction: 'passive' }] }],
      units: [{ id: 'u1', name: 'A', pins: [{ id: 'REAL-PIN', name: 'REAL-PIN', direction: 'passive' }] }],
    });
    registerSymbol(sym);
    registerFootprint(makeFootprint('fp-pm', { padCount: 4 }));
    registerDevice(makeDevice('dev-pm', ['sym-pm'], ['fp-pm'], {
      pinMappings: [{ symbolPinId: 'FAKE-PIN', footprintPadId: '1', functionName: 'test' }],
    }));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'broken-mapping' && d.targetId === 'dev-pm')).toBe(true);
  });

  it('detects broken pin mapping to pad number exceeding footprint pad count', () => {
    registerSymbol(makeSymbol('sym-pme'));
    registerFootprint(makeFootprint('fp-pme', { padCount: 4 }));
    registerDevice(makeDevice('dev-pme', ['sym-pme'], ['fp-pme'], {
      pinMappings: [{ symbolPinId: 'P1', footprintPadId: '99', functionName: 'test' }],
    }));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'broken-mapping')).toBe(true);
  });

  it('reports incomplete metadata warning when manufacturer or MPN missing', () => {
    registerDevice(makeDevice('dev-nomanuf', [], [], {
      metadata: {
        electrical: {},
        mechanical: { packageType: 'SMD', height: 1, width: 1, weight: 0 },
        commercial: { manufacturer: '', mpn: '', lifecycle: 'Active', availability: 0, rohs: true, reach: true },
        documentation: {},
      },
    }));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'incomplete-metadata')).toBe(true);
  });

  it('reports missing package type warning', () => {
    registerDevice(makeDevice('dev-nopkg', [], [], {
      metadata: {
        electrical: {},
        mechanical: { packageType: '', height: 1, width: 1, weight: 0 },
        commercial: { manufacturer: 'Test', mpn: 'T1', lifecycle: 'Active', availability: 0, rohs: true, reach: true },
        documentation: {},
      },
    }));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'incomplete-metadata')).toBe(true);
  });

  it('reports missing datasheet reference when datasheet ID is invalid', () => {
    registerSymbol(makeSymbol('sym-nods'));
    registerFootprint(makeFootprint('fp-nods'));
    registerDevice(makeDevice('dev-nods', ['sym-nods'], ['fp-nods'], {
      metadata: {
        electrical: {},
        mechanical: { packageType: 'SMD', height: 1, width: 1, weight: 0 },
        commercial: { manufacturer: 'Test', mpn: 'T1', lifecycle: 'Active', availability: 0, rohs: true, reach: true },
        documentation: { datasheet: 'missing-ds-id' },
      },
    }));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'missing-datasheet')).toBe(true);
  });

  it('does NOT report missing datasheet when datasheet is an external https URL', () => {
    registerDevice(makeDevice('dev-https-ds', [], [], {
      metadata: {
        electrical: {},
        mechanical: { packageType: 'SMD', height: 1, width: 1, weight: 0 },
        commercial: { manufacturer: 'Test', mpn: 'T1', lifecycle: 'Active', availability: 100, rohs: true, reach: true },
        documentation: { datasheet: 'https://example.com/ds.pdf' },
      },
    }));
    const diags = validateLibrary().filter(d => d.type === 'missing-datasheet');
    expect(diags).toHaveLength(0);
  });

  it('flags invalid footprint dimensions', () => {
    registerFootprint(makeFootprint('fp-invalid', { packageDimensions: { height: -1, width: 0, length: 5, weight: 0 } }));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'invalid-package')).toBe(true);
  });

  it('reports manufacturer mismatch between parts and commercial metadata', () => {
    registerDevice(makeDevice('dev-mismatch', [], [], {
      manufacturerParts: [{ manufacturer: 'Other Vendor', mpn: 'OV-001', packageOption: 'SMD', lifecycle: 'Active', availability: 100 }],
      metadata: {
        electrical: {},
        mechanical: { packageType: 'SMD', height: 1, width: 1, weight: 0 },
        commercial: { manufacturer: 'Official Vendor', mpn: 'OV-001', lifecycle: 'Active', availability: 100, rohs: true, reach: true },
        documentation: {},
      },
    }));
    const diags = validateLibrary();
    expect(diags.some(d => d.type === 'manufacturer-mismatch')).toBe(true);
  });
});

// ─── PART 8: Import / Export ──────────────────────────────────────────────────

describe('Part 8 — Import/Export', () => {
  const sym = makeSymbol('sym-ie');
  const fp = makeFootprint('fp-ie');
  const dev = makeDevice('dev-ie', ['sym-ie'], ['fp-ie']);
  const ds = makeDatasheet('ds-ie');
  const data: LibraryData = { version: '1.0.0', symbols: [sym], devices: [dev], footprints: [fp], datasheets: [ds] };

  it('JSON round-trip preserves all library data', () => {
    const adapter = new JsonLibraryAdapter();
    const json = adapter.exportLibrary(data);
    const parsed = adapter.importLibrary(json);
    expect(parsed.symbols[0].id).toBe('sym-ie');
    expect(parsed.devices[0].id).toBe('dev-ie');
    expect(parsed.footprints[0].id).toBe('fp-ie');
    expect(parsed.datasheets![0].id).toBe('ds-ie');
    expect(parsed.version).toBe('1.0.0');
  });

  it('JSON importLibrary handles missing optional fields gracefully', () => {
    const adapter = new JsonLibraryAdapter();
    const parsed = adapter.importLibrary('{}');
    expect(parsed.symbols).toHaveLength(0);
    expect(parsed.devices).toHaveLength(0);
    expect(parsed.footprints).toHaveLength(0);
    expect(parsed.version).toBe('1.0.0');
  });

  it('YAML round-trip preserves symbol IDs', () => {
    const adapter = new YamlLibraryAdapter();
    const yaml = adapter.exportLibrary(data);
    expect(yaml).toContain('version: 1.0.0');
    const imported = adapter.importLibrary(yaml);
    expect(imported.symbols[0].id).toBe('sym-ie');
  });

  it('YAML exportLibrary emits device entries', () => {
    const adapter = new YamlLibraryAdapter();
    const yaml = adapter.exportLibrary(data);
    expect(yaml).toContain('devices:');
  });

  it('KiCad adapter is defined as interface stub and throws on import', () => {
    const adapter = new KiCadLibraryAdapter();
    expect(adapter.formatName).toBe('KiCad');
    expect(() => adapter.importLibrary('')).toThrow();
  });

  it('KiCad adapter throws on export (interface stub)', () => {
    expect(() => new KiCadLibraryAdapter().exportLibrary(data)).toThrow();
  });

  it('Eagle adapter is defined as interface stub and throws on import', () => {
    const adapter = new EagleLibraryAdapter();
    expect(adapter.formatName).toBe('Eagle');
    expect(() => adapter.importLibrary('')).toThrow();
  });

  it('Eagle adapter throws on export (interface stub)', () => {
    expect(() => new EagleLibraryAdapter().exportLibrary(data)).toThrow();
  });

  it('Altium adapter is defined as interface stub and throws on import', () => {
    const adapter = new AltiumLibraryAdapter();
    expect(adapter.formatName).toBe('Altium');
    expect(() => adapter.importLibrary('')).toThrow();
  });

  it('Altium adapter throws on export (interface stub)', () => {
    expect(() => new AltiumLibraryAdapter().exportLibrary(data)).toThrow();
  });
});

// ─── PART 9: Versioning ───────────────────────────────────────────────────────

describe('Part 9 — Versioning', () => {
  it('parseSemVer correctly parses versions', () => {
    const v = parseSemVer('2.3.4');
    expect(v).toMatchObject({ major: 2, minor: 3, patch: 4 });
  });

  it('parseSemVer handles pre-release suffix', () => {
    const v = parseSemVer('1.0.0-alpha');
    expect(v.preRelease).toBe('alpha');
  });

  it('parseSemVer handles single segment version', () => {
    const v = parseSemVer('3');
    expect(v.major).toBe(3);
    expect(v.minor).toBe(0);
    expect(v.patch).toBe(0);
  });

  it('compareSemVer returns 0 for equal versions', () => {
    expect(compareSemVer('1.2.3', '1.2.3')).toBe(0);
  });

  it('compareSemVer correctly orders major versions', () => {
    expect(compareSemVer('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareSemVer('1.0.0', '2.0.0')).toBeLessThan(0);
  });

  it('compareSemVer correctly orders minor versions', () => {
    expect(compareSemVer('1.2.0', '1.1.0')).toBeGreaterThan(0);
    expect(compareSemVer('1.1.0', '1.2.0')).toBeLessThan(0);
  });

  it('compareSemVer correctly orders patch versions', () => {
    expect(compareSemVer('1.0.2', '1.0.1')).toBeGreaterThan(0);
  });

  it('pre-release version is less than release', () => {
    expect(compareSemVer('1.0.0-alpha', '1.0.0')).toBeLessThan(0);
    expect(compareSemVer('1.0.0', '1.0.0-alpha')).toBeGreaterThan(0);
  });

  it('applies single migration to component', () => {
    registerMigration({
      sourceVersionRange: '<1.1.0',
      targetVersion: '1.1.0',
      migrate: (data) => ({ ...data, newField: 'migrated' }),
    });
    const result = migrateComponent({ version: '1.0.0' }, '1.1.0');
    expect(result.version).toBe('1.1.0');
    expect(result.newField).toBe('migrated');
  });

  it('applies chained migrations in order', () => {
    registerMigration({
      sourceVersionRange: '<1.1.0',
      targetVersion: '1.1.0',
      migrate: (d) => ({ ...d, step1: true }),
    });
    registerMigration({
      sourceVersionRange: '<1.2.0',
      targetVersion: '1.2.0',
      migrate: (d) => ({ ...d, step2: true }),
    });
    const result = migrateComponent({ version: '1.0.0' }, '1.2.0');
    expect(result.step1).toBe(true);
    expect(result.step2).toBe(true);
    expect(result.version).toBe('1.2.0');
  });

  it('skips migration when current version already meets target', () => {
    registerMigration({
      sourceVersionRange: '<1.1.0',
      targetVersion: '1.1.0',
      migrate: (d) => ({ ...d, shouldNotApply: true }),
    });
    const result = migrateComponent({ version: '1.1.0' }, '1.1.0');
    expect(result.shouldNotApply).toBeUndefined();
  });

  it('clearMigrations removes all registered migration hooks', () => {
    registerMigration({ sourceVersionRange: '<1.0.0', targetVersion: '1.0.0', migrate: (d) => d });
    clearMigrations();
    // After clearing, migration should not run
    const result = migrateComponent({ version: '0.9.0' }, '1.0.0');
    expect(result.version).toBe('0.9.0'); // unchanged since no migrations
  });
});

// ─── PART 10: Favorites & Recent ─────────────────────────────────────────────

describe('Part 10 — Favorites & Recent', () => {
  it('adds and checks favorites', () => {
    globalLibraryUsage.addFavorite('ESP32');
    expect(globalLibraryUsage.isFavorite('ESP32')).toBe(true);
  });

  it('removes a favorite', () => {
    globalLibraryUsage.addFavorite('ESP32');
    globalLibraryUsage.removeFavorite('ESP32');
    expect(globalLibraryUsage.isFavorite('ESP32')).toBe(false);
  });

  it('lists all favorites', () => {
    globalLibraryUsage.addFavorite('a');
    globalLibraryUsage.addFavorite('b');
    globalLibraryUsage.addFavorite('c');
    expect(globalLibraryUsage.listFavorites()).toHaveLength(3);
  });

  it('ignores blank favorite IDs', () => {
    globalLibraryUsage.addFavorite('');
    globalLibraryUsage.addFavorite('  ');
    expect(globalLibraryUsage.listFavorites()).toHaveLength(0);
  });

  it('touchRecent adds to recent list', () => {
    globalLibraryUsage.touchRecent('item-1');
    expect(globalLibraryUsage.listRecent()).toContain('item-1');
  });

  it('touchRecent moves existing item to front', () => {
    globalLibraryUsage.touchRecent('a');
    globalLibraryUsage.touchRecent('b');
    globalLibraryUsage.touchRecent('a');
    expect(globalLibraryUsage.listRecent()[0]).toBe('a');
  });

  it('recent list respects maximum limit', () => {
    for (let i = 0; i < 30; i++) {
      globalLibraryUsage.touchRecent(`item-${i}`);
    }
    expect(globalLibraryUsage.listRecent().length).toBeLessThanOrEqual(25);
  });

  it('clear removes both favorites and recent', () => {
    globalLibraryUsage.addFavorite('x');
    globalLibraryUsage.touchRecent('y');
    globalLibraryUsage.clear();
    expect(globalLibraryUsage.listFavorites()).toHaveLength(0);
    expect(globalLibraryUsage.listRecent()).toHaveLength(0);
  });

  it('snapshot and restore correctly persist usage state', () => {
    globalLibraryUsage.addFavorite('fav1');
    globalLibraryUsage.touchRecent('rec1');
    const snap = globalLibraryUsage.snapshot();
    globalLibraryUsage.clear();
    globalLibraryUsage.restore(snap);
    expect(globalLibraryUsage.isFavorite('fav1')).toBe(true);
    expect(globalLibraryUsage.listRecent()).toContain('rec1');
  });

  it('restore with empty snapshot is safe', () => {
    expect(() => globalLibraryUsage.restore({})).not.toThrow();
    expect(globalLibraryUsage.listFavorites()).toHaveLength(0);
  });

  it('listFavoriteCatalogItems returns only favorited catalog items', () => {
    registerSymbol(makeSymbol('sym-fav', { displayName: 'Fav Symbol' }));
    globalLibraryUsage.addFavorite('sym-fav');
    const favs = listFavoriteCatalogItems();
    expect(favs.map(f => f.id)).toContain('sym-fav');
  });

  it('markCatalogItemUsed adds to recent list', () => {
    registerSymbol(makeSymbol('sym-mark', { displayName: 'Mark Test' }));
    markCatalogItemUsed('sym-mark');
    expect(globalLibraryUsage.listRecent()).toContain('sym-mark');
  });
});

// ─── PART 11: Cache Layer ─────────────────────────────────────────────────────

describe('Part 11 — Cache Layer', () => {
  it('stores and retrieves cache entries', () => {
    const cache = new LibraryCache<string>();
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined for missing keys', () => {
    const cache = new LibraryCache<string>();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('has() returns true for existing valid entry', () => {
    const cache = new LibraryCache<string>();
    cache.set('k', 'v');
    expect(cache.has('k')).toBe(true);
  });

  it('has() returns false for missing entry', () => {
    const cache = new LibraryCache<string>();
    expect(cache.has('nope')).toBe(false);
  });

  it('deletes a specific key', () => {
    const cache = new LibraryCache<string>();
    cache.set('del', 'val');
    cache.delete('del');
    expect(cache.get('del')).toBeUndefined();
  });

  it('clear removes all entries', () => {
    const cache = new LibraryCache<string>();
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.keys()).toHaveLength(0);
  });

  it('evicts oldest entry when maxEntries is exceeded', () => {
    const cache = new LibraryCache<string>(2);
    cache.set('first', 'val1');
    cache.set('second', 'val2');
    cache.set('third', 'val3');  // exceeds max → evicts 'first'
    expect(cache.get('first')).toBeUndefined();
    expect(cache.get('third')).toBe('val3');
  });

  it('respects TTL expiration', async () => {
    const cache = new LibraryCache<string>();
    cache.set('ttl-key', 'val', 1); // 1ms TTL
    await new Promise(r => setTimeout(r, 10));
    expect(cache.get('ttl-key')).toBeUndefined();
  });

  it('snapshot and restore roundtrip', () => {
    const cache = new LibraryCache<number>();
    cache.set('a', 1);
    cache.set('b', 2);
    const snap = cache.snapshot();
    const cache2 = new LibraryCache<number>();
    cache2.restore(snap);
    expect(cache2.get('a')).toBe(1);
    expect(cache2.get('b')).toBe(2);
  });

  it('keys() returns only non-expired keys', async () => {
    const cache = new LibraryCache<string>();
    cache.set('live', 'val', 60000);
    cache.set('dead', 'val', 1);
    await new Promise(r => setTimeout(r, 10));
    expect(cache.keys()).toContain('live');
    expect(cache.keys()).not.toContain('dead');
  });

  it('globalLibraryCache is a shared singleton', () => {
    globalLibraryCache.set('shared-key', 'shared-val');
    expect(globalLibraryCache.get('shared-key')).toBe('shared-val');
    globalLibraryCache.clear();
  });
});

// ─── PART 12: Package Manager ─────────────────────────────────────────────────

describe('Package Manager', () => {
  const sym = makeSymbol('pkg-sym');
  const fp = makeFootprint('pkg-fp');
  const dev = makeDevice('pkg-dev', ['pkg-sym'], ['pkg-fp']);
  const ds = makeDatasheet('pkg-ds');
  const data: LibraryData = { version: '1.0.0', symbols: [sym], devices: [dev], footprints: [fp], datasheets: [ds] };

  it('installs a library package and populates registries', () => {
    const pkg = createLibraryPackage({ id: 'my-lib', name: 'My Library', version: '1.0.0' }, data);
    installLibraryPackage(pkg);
    expect(getSymbol('pkg-sym')).toBeDefined();
    expect(getDevice('pkg-dev')).toBeDefined();
    expect(getFootprint('pkg-fp')).toBeDefined();
    expect(getDatasheet('pkg-ds')).toBeDefined();
  });

  it('lists installed packages', () => {
    const pkg = createLibraryPackage({ id: 'lib2', name: 'Lib 2', version: '1.0.0' }, data);
    installLibraryPackage(pkg);
    expect(listLibraryPackages().map(p => p.id)).toContain('lib2');
  });

  it('retrieves a specific package by ID', () => {
    const pkg = createLibraryPackage({ id: 'lib3', name: 'Lib 3', version: '2.1.0' }, data);
    installLibraryPackage(pkg);
    const retrieved = getLibraryPackage('lib3');
    expect(retrieved?.version).toBe('2.1.0');
  });

  it('uninstalls a package and removes its entries', () => {
    const pkg = createLibraryPackage({ id: 'lib4', name: 'Lib 4', version: '1.0.0' }, data);
    installLibraryPackage(pkg);
    expect(uninstallLibraryPackage('lib4')).toBe(true);
    expect(getDevice('pkg-dev')).toBeUndefined();
    expect(getSymbol('pkg-sym')).toBeUndefined();
  });

  it('returns false when uninstalling non-existent package', () => {
    expect(uninstallLibraryPackage('does-not-exist')).toBe(false);
  });

  it('prevents downgrading an installed package', () => {
    const v2 = createLibraryPackage({ id: 'lib-ver', name: 'Versioned', version: '2.0.0' }, data);
    installLibraryPackage(v2);
    const v1 = createLibraryPackage({ id: 'lib-ver', name: 'Versioned', version: '1.0.0' }, data);
    expect(() => installLibraryPackage(v1)).toThrow();
  });

  it('allows upgrading an installed package', () => {
    const v1 = createLibraryPackage({ id: 'lib-up', name: 'Upgrading', version: '1.0.0' }, data);
    installLibraryPackage(v1);
    const v2 = createLibraryPackage({ id: 'lib-up', name: 'Upgrading', version: '2.0.0' }, { ...data, version: '2.0.0' });
    expect(() => installLibraryPackage(v2)).not.toThrow();
    expect(getLibraryPackage('lib-up')?.version).toBe('2.0.0');
  });

  it('throws when package ID or version is missing', () => {
    expect(() => installLibraryPackage({ ...createLibraryPackage({ id: '', name: 'x', version: '1.0.0' }, data) })).toThrow();
    expect(() => installLibraryPackage({ ...createLibraryPackage({ id: 'x', name: 'x', version: '' }, data) })).toThrow();
  });

  it('clearLibraryPackages removes all installed packages', () => {
    const pkg = createLibraryPackage({ id: 'lib5', name: 'Lib 5', version: '1.0.0' }, data);
    installLibraryPackage(pkg);
    clearLibraryPackages();
    expect(listLibraryPackages()).toHaveLength(0);
  });

  it('package supports optional description and dependencies', () => {
    const pkg = createLibraryPackage({ id: 'lib-dep', name: 'With Deps', version: '1.0.0', description: 'A library', dependencies: { 'base-lib': '^1.0.0' } }, data);
    installLibraryPackage(pkg);
    const manifest = listLibraryPackages().find(p => p.id === 'lib-dep')!;
    expect(manifest.description).toBe('A library');
    expect(manifest.dependencies).toMatchObject({ 'base-lib': '^1.0.0' });
  });
});

// ─── PART 13: Storage ─────────────────────────────────────────────────────────

describe('Part 13 — Persistence & Storage', () => {
  it('MemoryLibraryStorageProvider reads and writes', () => {
    const p = new MemoryLibraryStorageProvider();
    p.write('key', 'value');
    expect(p.read('key')).toBe('value');
  });

  it('MemoryLibraryStorageProvider returns null for missing key', () => {
    const p = new MemoryLibraryStorageProvider();
    expect(p.read('missing')).toBeNull();
  });

  it('MemoryLibraryStorageProvider removes keys', () => {
    const p = new MemoryLibraryStorageProvider();
    p.write('k', 'v');
    p.remove('k');
    expect(p.read('k')).toBeNull();
  });

  it('createLibrarySnapshot captures current registry state', () => {
    registerSymbol(makeSymbol('snap-sym'));
    registerDevice(makeDevice('snap-dev'));
    const snap = createLibrarySnapshot();
    expect(snap.library.symbols.map(s => s.id)).toContain('snap-sym');
    expect(snap.library.devices.map(d => d.id)).toContain('snap-dev');
    expect(snap.version).toBe('1.0.0');
  });

  it('saveLibrarySnapshot and loadLibrarySnapshot round-trip correctly', () => {
    registerSymbol(makeSymbol('save-sym'));
    const p = new MemoryLibraryStorageProvider();
    saveLibrarySnapshot(p);
    clearSymbols();
    expect(listSymbols()).toHaveLength(0);
    loadLibrarySnapshot(p);
    expect(getSymbol('save-sym')).toBeDefined();
  });

  it('loadLibrarySnapshot returns undefined for missing key', () => {
    const p = new MemoryLibraryStorageProvider();
    expect(loadLibrarySnapshot(p)).toBeUndefined();
  });

  it('hydrateLibraryData clears and reloads all registries', () => {
    registerSymbol(makeSymbol('old-sym'));
    hydrateLibraryData({ version: '1.0.0', symbols: [makeSymbol('new-sym')], devices: [], footprints: [] });
    expect(getSymbol('old-sym')).toBeUndefined();
    expect(getSymbol('new-sym')).toBeDefined();
  });

  it('snapshot captures usage state', () => {
    globalLibraryUsage.addFavorite('ESP32');
    const snap = createLibrarySnapshot();
    expect(snap.usage.favorites).toContain('ESP32');
  });

  it('loadLibrarySnapshot restores usage state', () => {
    globalLibraryUsage.addFavorite('fav-item');
    const p = new MemoryLibraryStorageProvider();
    saveLibrarySnapshot(p);
    globalLibraryUsage.clear();
    loadLibrarySnapshot(p);
    expect(globalLibraryUsage.isFavorite('fav-item')).toBe(true);
  });

  it('PersistenceSerializer embeds library data in project file', () => {
    registerSymbol(makeSymbol('proj-sym'));
    registerDevice(makeDevice('proj-dev', ['proj-sym'], []));
    const engine = new ObjectEngine('proj-1', 'Library Test Project');
    const serialized = new PersistenceSerializer().serialize(engine);
    const parsed = JSON.parse(serialized);
    expect(parsed.library.symbols.map((s: any) => s.id)).toContain('proj-sym');
    expect(parsed.library.devices.map((d: any) => d.id)).toContain('proj-dev');
  });

  it('PersistenceValidator accepts project with library data', () => {
    registerSymbol(makeSymbol('val-sym'));
    const engine = new ObjectEngine('val-1', 'Validation Test');
    const serialized = new PersistenceSerializer().serialize(engine);
    const result = new PersistenceValidator().validate(serialized);
    expect(result.isValid).toBe(true);
  });

  it('PersistenceDeserializer restores project after serialization', () => {
    registerSymbol(makeSymbol('deser-sym', { displayName: 'Deser Symbol' }));
    const engine = new ObjectEngine('deser-1', 'Deserialize Test');
    engine.addPage({ id: 'p1', name: 'P1', layers: [], viewport: { zoom: 1, panX: 0, panY: 0 } });
    engine.addLayer('p1', { id: 'l1', name: 'L1', visible: true, locked: false, objects: [] });
    const serialized = new PersistenceSerializer().serialize(engine);
    const target = new ObjectEngine('target-1', 'Target');
    const result = new PersistenceDeserializer().deserialize(serialized, target);
    expect(result.success).toBe(true);
  });
});

// ─── PART 14: Catalog ─────────────────────────────────────────────────────────

describe('Catalog', () => {
  beforeEach(() => {
    registerSymbol(makeSymbol('cat-sym', { displayName: 'Cat Symbol', deprecationState: 'active' }));
    registerSymbol(makeSymbol('cat-sym-dep', { displayName: 'Deprecated Symbol', deprecationState: 'deprecated' }));
    registerFootprint(makeFootprint('cat-fp'));
    registerDevice(makeDevice('cat-dev', ['cat-sym'], ['cat-fp']));
  });

  it('listCatalogItems returns all active items by default', () => {
    const items = listCatalogItems();
    expect(items.map(i => i.id)).toContain('cat-sym');
  });

  it('deprecated items are excluded by default', () => {
    const items = listCatalogItems();
    expect(items.map(i => i.id)).not.toContain('cat-sym-dep');
  });

  it('deprecated items appear when includeDeprecated is true', () => {
    const items = listCatalogItems({ includeDeprecated: true });
    expect(items.map(i => i.id)).toContain('cat-sym-dep');
  });

  it('kind filter returns only matching types', () => {
    const symItems = listCatalogItems({ kind: 'symbol' });
    expect(symItems.every(i => i.kind === 'symbol')).toBe(true);
  });

  it('category filter narrows catalog results', () => {
    const items = listCatalogItems({ category: 'general' });
    expect(items.every(i => i.category.toLowerCase() === 'general')).toBe(true);
  });

  it('getCatalogItem returns item and touches recent', () => {
    const item = getCatalogItem('cat-sym');
    expect(item?.id).toBe('cat-sym');
    expect(globalLibraryUsage.listRecent()).toContain('cat-sym');
  });

  it('getCatalogItem returns undefined for missing ID', () => {
    expect(getCatalogItem('nonexistent')).toBeUndefined();
  });

  it('listCatalogPage supports pagination', () => {
    const page = listCatalogPage({ page: 1, pageSize: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBeGreaterThan(2);
  });

  it('createCatalogItemFromComponent creates correct catalog entry', () => {
    const compMeta = globalRegistry.getById('ESP32')!;
    const item = createCatalogItemFromComponent(compMeta);
    expect(item.id).toBe('ESP32');
    expect(item.kind).toBe('component');
    expect(item.source).toBe('component-library');
  });
});

// ─── PART 15: AI Knowledge Integration ──────────────────────────────────────

describe('Part 14 — AI Knowledge Integration', () => {
  beforeEach(() => {
    registerSymbol(makeSymbol('ai-sym', {
      displayName: 'AI Test Symbol',
      units: [{ id: 'u1', name: 'A', pins: [{ id: 'IN', name: 'IN', direction: 'input' }, { id: 'OUT', name: 'OUT', direction: 'output' }] }],
    }));
    registerFootprint(makeFootprint('ai-fp'));
    registerDevice(makeDevice('ai-dev', ['ai-sym'], ['ai-fp'], {
      name: 'AI Test Device',
      pinMappings: [{ symbolPinId: 'IN', footprintPadId: '1', functionName: 'input' }],
      metadata: {
        electrical: {},
        mechanical: { packageType: 'SMD', height: 1, width: 1, weight: 0 },
        commercial: { manufacturer: 'TINC', mpn: 'AI-001', lifecycle: 'Active', availability: 100, rohs: true, reach: true },
        documentation: { datasheet: 'https://example.com/ai-dev.pdf' },
      },
    }));
  });

  it('getLibraryItem returns device metadata via knowledge API', () => {
    const item = lookupKnowledge.getLibraryItem('ai-dev');
    expect(item).toBeDefined();
    expect(item!.name).toBe('AI Test Device');
  });

  it('getPins returns pins from device via knowledge API', () => {
    const pins = lookupKnowledge.getPins('ai-dev');
    expect(pins).toBeDefined();
    expect(pins!.map(p => p.id)).toContain('IN');
  });

  it('getPins returns component pins from component-library', () => {
    const pins = lookupKnowledge.getPins('ESP32');
    expect(pins).toBeDefined();
    expect(pins!.length).toBeGreaterThan(0);
  });

  it('searchLibraryKnowledge returns matching library items', () => {
    const results = lookupKnowledge.searchLibraryKnowledge('AI Test Device');
    expect(results.map(r => r.doc.id)).toContain('ai-dev');
  });

  it('getLibraryItem returns undefined for unknown ID', () => {
    expect(lookupKnowledge.getLibraryItem('totally-unknown-id')).toBeUndefined();
  });
});

// ─── PART 16: Project Explorer Integration ───────────────────────────────────

describe('Part 13 — Project Explorer Integration', () => {
  it('ExplorerSearch matches by library alias', () => {
    registerSymbol(makeSymbol('sym-search', { aliases: ['my-search-alias'], displayName: 'Searchable Symbol' }));
    const engine = new ObjectEngine('expl', 'Explorer Test');
    engine.addPage({ id: 'p1', name: 'P1', layers: [], viewport: { zoom: 1, panX: 0, panY: 0 } });
    engine.addLayer('p1', { id: 'l1', name: 'L1', visible: true, locked: false, objects: [] });
    const obj = createSemanticObjectFromCatalogItem('sym-search', 'comp-1', 'C1');
    engine.addComponent('l1', obj);

    const search = new ExplorerSearch();
    expect(search.matchesComponent(obj, 'my-search-alias')).toBe(true);
  });

  it('ExplorerSearch matches by object type', () => {
    const obj = { id: 'o1', type: 'sym-typecheck', name: 'Test', ports: [], pins: [], properties: {} };
    const search = new ExplorerSearch();
    expect(search.matchesComponent(obj as any, 'sym-typecheck')).toBe(true);
  });

  it('ExplorerSearch matches by object ID', () => {
    const obj = { id: 'unique-comp-id-xyz', type: 'some-type', name: 'Name', ports: [], pins: [], properties: {} };
    const search = new ExplorerSearch();
    expect(search.matchesComponent(obj as any, 'unique-comp-id')).toBe(true);
  });

  it('ExplorerSearch empty query always returns true', () => {
    const obj = { id: 'any', type: 'any', name: 'any', ports: [], pins: [], properties: {} };
    const search = new ExplorerSearch();
    expect(search.matchesComponent(obj as any, '')).toBe(true);
  });

  it('matchesProjectExplorerLibraryQuery matches by device tag metadata', () => {
    registerDevice(makeDevice('dev-lib-tag', [], [], { name: 'TagTest Device', metadata: {
      electrical: {},
      mechanical: { packageType: 'SOIC-8', height: 1, width: 1, weight: 0 },
      commercial: { manufacturer: 'TI', mpn: 'TAG-001', lifecycle: 'Active', availability: 100, rohs: true, reach: true },
      documentation: {},
    }}));
    const obj = { id: 'c1', type: 'dev-lib-tag', name: 'TagTest', ports: [], pins: [], properties: {} };
    expect(matchesProjectExplorerLibraryQuery(obj as any, 'SOIC-8')).toBe(true);
  });
});

// ─── PART 17: Property Inspector Integration ─────────────────────────────────

describe('Part 12 — Property Inspector Integration', () => {
  it('formats component with library metadata (source: symbol)', () => {
    registerSymbol(makeSymbol('sym-prop', {
      category: 'Digital',
      units: [{ id: 'u1', name: 'A', pins: [{ id: 'CLK', name: 'CLK', direction: 'input' }, { id: 'D', name: 'D', direction: 'output' }] }],
    }));
    const obj = createSemanticObjectFromCatalogItem('sym-prop', 'u1', 'U1');
    const meta = getLibraryMetadata('sym-prop');
    const formatter = new PropertyFormatter();
    const result = formatter.formatComponent(obj, meta!);
    expect(result.category).toBe('Digital');
    expect(result.pins.map(p => p.id)).toContain('CLK');
    expect(result.pins.map(p => p.id)).toContain('D');
  });

  it('formats component with device library metadata', () => {
    registerSymbol(makeSymbol('sym-dev-prop', {
      units: [{ id: 'u1', name: 'A', pins: [{ id: 'VCC', name: 'VCC', direction: 'passive' }] }],
    }));
    registerDevice(makeDevice('dev-prop', ['sym-dev-prop'], [], {
      name: 'Test IC',
      pinMappings: [{ symbolPinId: 'VCC', footprintPadId: '1', functionName: 'Power' }],
      metadata: {
        electrical: {},
        mechanical: { packageType: 'DIP-8', height: 5, width: 7, weight: 0.3 },
        commercial: { manufacturer: 'TI', mpn: 'TIC001', lifecycle: 'Active', availability: 100, rohs: true, reach: true },
        documentation: { datasheet: 'https://ti.com/tic001.pdf' },
      },
    }));
    const obj = createSemanticObjectFromCatalogItem('dev-prop', 'u2', 'U2');
    const meta = getLibraryMetadata('dev-prop');
    const formatter = new PropertyFormatter();
    const result = formatter.formatComponent(obj, meta!);
    expect(result.documentation).toContain('https://ti.com/tic001.pdf');
    expect(result.pins.map(p => p.id)).toContain('VCC');
  });

  it('getInspectorLibraryMetadata resolves by object type', () => {
    registerDevice(makeDevice('dev-insp', [], [], { name: 'Inspector Test Device' }));
    const obj = { id: 'u3', type: 'dev-insp', name: 'Test', ports: [], pins: [], properties: {} };
    const meta = getInspectorLibraryMetadata(obj as any);
    expect(meta?.name).toBe('Inspector Test Device');
  });

  it('addCatalogItemToObjectEngine creates and registers object', () => {
    registerSymbol(makeSymbol('sym-add', { displayName: 'Add To Engine' }));
    const engine = new ObjectEngine('add-test', 'Add Test');
    engine.addPage({ id: 'p1', name: 'P1', layers: [], viewport: { zoom: 1, panX: 0, panY: 0 } });
    engine.addLayer('p1', { id: 'l1', name: 'L1', visible: true, locked: false, objects: [] });
    const obj = addCatalogItemToObjectEngine(engine, 'l1', 'sym-add', 'u4', 'U4');
    expect(obj.type).toBe('sym-add');
    expect(engine.getObject('u4')).toBeDefined();
    expect(globalLibraryUsage.listRecent()).toContain('sym-add');
  });

  it('createSemanticObjectFromCatalogItem throws for unknown catalog ID', () => {
    expect(() => createSemanticObjectFromCatalogItem('totally-unknown', 'x')).toThrow();
  });
});
