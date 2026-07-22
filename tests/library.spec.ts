import {
  clearDevices,
  clearDatasheets,
  clearFootprints,
  clearLibraryPackages,
  addCatalogItemToObjectEngine,
  createSemanticObjectFromCatalogItem,
  clearMigrations,
  clearSymbols,
  createLibraryPackage,
  getInspectorLibraryMetadata,
  getLibraryMetadata,
  getSearchIndexSnapshot,
  globalLibraryCache,
  globalLibraryUsage,
  installLibraryPackage,
  JsonLibraryAdapter,
  LibraryCache,
  listCatalogPage,
  listCatalogItems,
  listFavoriteCatalogItems,
  listLibraryPackages,
  loadCatalogPage,
  MemoryLibraryStorageProvider,
  migrateComponent,
  registerDevice,
  registerFootprint,
  registerMigration,
  registerSymbol,
  saveLibrarySnapshot,
  loadLibrarySnapshot,
  searchLibrary,
  searchLibraryPage,
  uninstallLibraryPackage,
  validateLibrary,
  YamlLibraryAdapter,
  registerDatasheet,
  type DeviceDefinition,
  type FootprintDefinition,
  type LibraryData,
  type SymbolDefinition,
} from '../src/library';
import { ObjectEngine } from '../src/object-engine';
import { PersistenceDeserializer, PersistenceSerializer, PersistenceValidator } from '../src/persistence';
import { ExplorerSearch } from '../src/project-explorer/search';
import { PropertyFormatter } from '../src/property-inspector/formatter';
import { createPlan, lookupKnowledge, validatePlan } from '../src/ai';

const symbol: SymbolDefinition = {
  id: 'sym-opamp',
  displayName: 'Operational Amplifier',
  internalName: 'opamp',
  description: 'Single op-amp symbol',
  category: 'Analog',
  subcategory: 'Amplifier',
  tags: ['analog', 'amplifier'],
  aliases: ['opamp'],
  keywords: ['gain', 'amplifier'],
  version: '1.0.0',
  author: 'TINC',
  license: 'MIT',
  creationDate: '2026-01-01T00:00:00.000Z',
  lastModificationDate: '2026-01-01T00:00:00.000Z',
  deprecationState: 'active',
  variants: [{ id: 'default', name: 'Default', pins: [{ id: 'IN+', name: 'IN+', direction: 'input' }] }],
  units: [{ id: 'u1', name: 'A', pins: [{ id: 'IN+', name: 'IN+', direction: 'input' }] }],
  alternateViews: [],
};

const footprint: FootprintDefinition = {
  id: 'fp-soic8',
  name: 'SOIC-8',
  description: '8-pin SOIC footprint',
  packageDimensions: { height: 1.75, width: 4.9, length: 6, weight: 0.1 },
  padCount: 8,
  mountType: 'SMD',
  ipcMetadata: {},
  courtyardMetadata: {},
  keepoutMetadata: {},
};

const device: DeviceDefinition = {
  id: 'dev-lm358',
  name: 'LM358',
  description: 'Dual operational amplifier',
  category: 'Analog',
  symbolIds: ['sym-opamp'],
  footprintIds: ['fp-soic8'],
  manufacturerParts: [{ manufacturer: 'Texas Instruments', mpn: 'LM358DR', packageOption: 'SOIC-8', lifecycle: 'Active', availability: 1000 }],
  pinMappings: [{ symbolPinId: 'IN+', footprintPadId: '3', functionName: 'non-inverting input' }],
  functionalEquivalents: [],
  metadata: {
    electrical: { voltage: { min: 3, max: 32, unit: 'V' } },
    mechanical: { packageType: 'SOIC-8', height: 1.75, width: 4.9, weight: 0.1 },
    commercial: { manufacturer: 'Texas Instruments', mpn: 'LM358DR', lifecycle: 'Active', availability: 1000, rohs: true, reach: true },
    documentation: { datasheet: 'https://example.com/lm358.pdf' },
  },
  version: '1.0.0',
  deprecationState: 'active',
};

describe('Library Ecosystem', () => {
  beforeEach(() => {
    clearDevices();
    clearDatasheets();
    clearFootprints();
    clearSymbols();
    clearLibraryPackages();
    clearMigrations();
    globalLibraryUsage.clear();
    globalLibraryCache.clear();
  });

  it('indexes catalog items from component and library registries with pagination and lazy loading', async () => {
    registerSymbol(symbol);
    registerFootprint(footprint);
    registerDevice(device);

    const all = listCatalogItems();
    expect(all.map((item) => item.id)).toEqual(expect.arrayContaining(['ESP32', 'sym-opamp', 'fp-soic8', 'dev-lm358']));

    const page = listCatalogPage({ page: 1, pageSize: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBeGreaterThan(2);
    expect(page.hasNextPage).toBe(true);

    const lazyPage = await loadCatalogPage({ kind: 'device', page: 1, pageSize: 10 });
    expect(lazyPage.items.map((item) => item.id)).toContain('dev-lm358');
  });

  it('provides metadata records and property inspector integration for library-backed objects', () => {
    registerSymbol(symbol);
    registerFootprint(footprint);
    registerDevice(device);

    const metadata = getLibraryMetadata('dev-lm358');
    expect(metadata?.documentation).toContain('https://example.com/lm358.pdf');
    expect(metadata?.electricalPins).toContain('IN+');

    const inspectorMetadata = getInspectorLibraryMetadata({
      id: 'comp-lm358',
      type: 'dev-lm358',
      name: 'U1',
      ports: [],
      pins: [],
      properties: {},
    });
    expect(inspectorMetadata?.name).toBe('LM358');
  });

  it('installs, lists, and uninstalls library packages without duplicate APIs', () => {
    const data: LibraryData = { version: '1.0.0', symbols: [symbol], footprints: [footprint], devices: [device] };
    const pkg = createLibraryPackage({ id: 'analog-core', name: 'Analog Core', version: '1.0.0' }, data);

    installLibraryPackage(pkg);
    expect(listLibraryPackages()).toEqual([{ id: 'analog-core', name: 'Analog Core', version: '1.0.0' }]);
    expect(listCatalogItems({ kind: 'device' }).map((item) => item.id)).toContain('dev-lm358');

    expect(uninstallLibraryPackage('analog-core')).toBe(true);
    expect(listCatalogItems({ kind: 'device' }).map((item) => item.id)).not.toContain('dev-lm358');
  });

  it('supports ranking, filtering, pagination metadata, and fresh index rebuilds', () => {
    registerSymbol(symbol);
    registerFootprint(footprint);
    registerDevice(device);

    expect(getSearchIndexSnapshot().map((doc) => doc.id)).toContain('dev-lm358');
    expect(searchLibrary('LM358')[0].doc.id).toBe('dev-lm358');
    expect(searchLibrary('amplifier', { type: 'symbol' })[0].doc.id).toBe('sym-opamp');

    const page = searchLibraryPage('', undefined, { page: 1, pageSize: 1, sortBy: 'name', sortOrder: 'asc' });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBeGreaterThan(1);
    expect(page.totalPages).toBeGreaterThan(1);
  });

  it('persists favorites and recents separately from transient cache entries', () => {
    globalLibraryUsage.addFavorite('ESP32');
    globalLibraryUsage.touchRecent('dev-lm358');
    expect(globalLibraryUsage.isFavorite('ESP32')).toBe(true);
    expect(globalLibraryUsage.listRecent()).toEqual(['dev-lm358']);

    const provider = new MemoryLibraryStorageProvider();
    saveLibrarySnapshot(provider);
    globalLibraryUsage.clear();

    const loaded = loadLibrarySnapshot(provider);
    expect(loaded?.usage.favorites).toContain('ESP32');
    expect(globalLibraryUsage.listRecent()).toEqual(['dev-lm358']);

    const cache = new LibraryCache<string>(1);
    cache.set('a', 'one');
    cache.set('b', 'two');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('two');
  });

  it('serializes JSON/YAML and validates migrated library data', () => {
    registerSymbol(symbol);
    registerFootprint(footprint);
    registerDevice(device);

    const data: LibraryData = { version: '1.0.0', symbols: [symbol], footprints: [footprint], devices: [device] };
    const json = new JsonLibraryAdapter().exportLibrary(data);
    expect(new JsonLibraryAdapter().importLibrary(json).devices[0].id).toBe('dev-lm358');

    const yaml = new YamlLibraryAdapter().exportLibrary(data);
    expect(new YamlLibraryAdapter().importLibrary(yaml).symbols[0].id).toBe('sym-opamp');

    registerMigration({
      sourceVersionRange: '<1.1.0',
      targetVersion: '1.1.0',
      migrate: (value) => ({ ...value, migrated: true }),
    });
    expect(migrateComponent({ version: '1.0.0' }, '1.1.0')).toMatchObject({ version: '1.1.0', migrated: true });

    expect(validateLibrary()).toEqual([]);
  });

  it('exposes favorite catalog and AI knowledge-compatible component records', () => {
    globalLibraryUsage.addFavorite('ESP32');
    expect(listFavoriteCatalogItems().map((item) => item.id)).toContain('ESP32');
    expect(getLibraryMetadata('ESP32')?.source).toBe('component');
  });

  it('indexes datasheets and resolves datasheet-backed device documentation', () => {
    registerDatasheet({ id: 'ds-lm358', title: 'LM358 Datasheet', url: 'https://example.com/lm358.pdf' });
    registerSymbol(symbol);
    registerFootprint(footprint);
    registerDevice({
      ...device,
      metadata: {
        ...device.metadata,
        documentation: { ...device.metadata.documentation, datasheet: 'ds-lm358' },
      },
    });

    expect(listCatalogItems({ kind: 'datasheet' }).map((item) => item.id)).toContain('ds-lm358');
    expect(searchLibrary('datasheet', { type: 'datasheet' })[0].doc.id).toBe('ds-lm358');
    expect(getLibraryMetadata('dev-lm358')?.documentation).toContain('https://example.com/lm358.pdf');
  });

  it('hydrates registries from persisted library snapshots', () => {
    registerSymbol(symbol);
    registerFootprint(footprint);
    registerDatasheet({ id: 'ds-lm358', title: 'LM358 Datasheet', url: 'https://example.com/lm358.pdf' });
    registerDevice(device);

    const provider = new MemoryLibraryStorageProvider();
    saveLibrarySnapshot(provider);

    clearDevices();
    clearFootprints();
    clearSymbols();
    expect(listCatalogItems({ kind: 'device' }).map((item) => item.id)).not.toContain('dev-lm358');

    loadLibrarySnapshot(provider);
    expect(listCatalogItems({ kind: 'device' }).map((item) => item.id)).toContain('dev-lm358');
    expect(listCatalogItems({ kind: 'datasheet' }).map((item) => item.id)).toContain('ds-lm358');
  });

  it('serializes project files with library definitions and validates library-backed object types', () => {
    registerSymbol(symbol);
    registerFootprint(footprint);
    registerDevice(device);

    const engine = new ObjectEngine('proj-lib', 'Library Project');
    engine.addPage({ id: 'page-1', name: 'Page 1', layers: [], viewport: { zoom: 1, panX: 0, panY: 0 } });
    engine.addLayer('page-1', { id: 'layer-1', name: 'Layer 1', visible: true, locked: false, objects: [] });
    addCatalogItemToObjectEngine(engine, 'layer-1', 'dev-lm358', 'u1', 'U1');

    const serialized = new PersistenceSerializer().serialize(engine);
    const parsed = JSON.parse(serialized);
    expect(parsed.library.devices[0].id).toBe('dev-lm358');
    expect(new PersistenceValidator().validate(serialized).isValid).toBe(true);

    const target = new ObjectEngine('target', 'Target');
    expect(new PersistenceDeserializer().deserialize(serialized, target).success).toBe(true);
    expect((target.getObject('u1') as any)?.type).toBe('dev-lm358');
  });

  it('integrates library metadata with Project Explorer, Property Inspector, and AI validation', () => {
    registerSymbol(symbol);
    registerFootprint(footprint);
    registerDevice(device);

    const object = createSemanticObjectFromCatalogItem('dev-lm358', 'u1');
    expect(object.type).toBe('dev-lm358');

    const search = new ExplorerSearch();
    expect(search.matchesComponent(object, 'LM358DR')).toBe(true);

    const formatted = new PropertyFormatter().formatComponent(object, getLibraryMetadata('dev-lm358'));
    expect(formatted.pins.map((pin) => pin.id)).toContain('IN+');
    expect(formatted.documentation).toContain('https://example.com/lm358.pdf');

    expect(lookupKnowledge.getLibraryItem('dev-lm358')?.name).toBe('LM358');
    expect(lookupKnowledge.getPins('dev-lm358')?.map((pin) => pin.id)).toContain('IN+');
    expect(lookupKnowledge.searchLibraryKnowledge('LM358')[0].doc.id).toBe('dev-lm358');

    const plan = createPlan(
      'plan-lib',
      'Place library-backed op-amp',
      0.8,
      [{ type: 'CreateComponent', payload: { type: 'dev-lm358', id: 'u2' } }],
      [],
      []
    );
    expect(validatePlan(plan).isValid).toBe(true);
  });

  it('reports missing datasheet and manufacturer mapping diagnostics', () => {
    registerSymbol(symbol);
    registerFootprint(footprint);
    registerDevice({
      ...device,
      manufacturerParts: [{ ...device.manufacturerParts[0], manufacturer: 'Other Vendor' }],
      metadata: {
        ...device.metadata,
        documentation: { datasheet: 'missing-datasheet' },
      },
    });

    const diagnostics = validateLibrary();
    expect(diagnostics.map((diag) => diag.type)).toEqual(expect.arrayContaining(['missing-datasheet', 'manufacturer-mismatch']));
  });
});
