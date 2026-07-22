/**
 * Project System — Comprehensive Test Suite
 *
 * Covers all 15 parts of the Project System specification.
 * Integration-style tests preferred over trivial unit tests.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  // Types
  ProjectMetadata,
  ProjectSettings,
  // Defaults
  createDefaultMetadata,
  createDefaultSettings,
  // Managers
  MetadataManager,
  SettingsManager,
  DocumentRegistry,
  AssetManager,
  DependencyGraph,
  AnnotationFramework,
  CrossReferenceEngine,
  // Validation & Persistence
  ProjectValidator,
  ProjectPersistence,
  // Adapters
  ProjectExplorerAdapter,
  PropertyAdapter,
  ProjectAIAdapter,
  // Facade
  ProjectManager,
} from '../src/project-system';
import { ObjectEngine } from '../src/object-engine';

// ─────────────────────────────────────────────────────────────────────────────
// Helper factories
// ─────────────────────────────────────────────────────────────────────────────

function makeObjectEngineWithPage(): ObjectEngine {
  const oe = new ObjectEngine('proj-oe', 'OE Test Project');
  oe.addPage({
    id: 'page-1',
    name: 'Sheet 1',
    layers: [
      {
        id: 'layer-1',
        name: 'Main',
        visible: true,
        locked: false,
        objects: [
          {
            id: 'obj-r1',
            type: 'Resistor',
            name: 'R1',
            ports: [],
            pins: [],
            properties: { reference: 'R1', value: '10k' },
          },
          {
            id: 'obj-u1',
            type: 'IC',
            name: 'U1',
            ports: [],
            pins: [],
            properties: { reference: 'U1' },
          },
        ],
      },
    ],
    viewport: { zoom: 1, panX: 0, panY: 0 },
  });
  return oe;
}

// ═════════════════════════════════════════════════════════════════════════════
// PART 1 — Project Metadata
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 1 — Project Metadata', () => {
  let mm: MetadataManager;

  beforeEach(() => {
    mm = new MetadataManager('My EDA Project');
  });

  it('creates metadata with required fields', () => {
    const m = mm.get();
    expect(m.uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(m.name).toBe('My EDA Project');
    expect(m.description).toBe('');
    expect(m.author).toBe('');
    expect(m.company).toBe('');
    expect(m.version).toBe('1.0.0');
    expect(m.revision).toBe(1);
    expect(m.status).toBe('draft');
    expect(m.createdAt).toBeTruthy();
    expect(m.modifiedAt).toBeTruthy();
    expect(Array.isArray(m.tags)).toBe(true);
    expect(m.customFields).toEqual({});
  });

  it('creates metadata with initial overrides', () => {
    const mm2 = new MetadataManager('PCB Design', { author: 'Alice', company: 'Acme' });
    const m = mm2.get();
    expect(m.author).toBe('Alice');
    expect(m.company).toBe('Acme');
    expect(m.name).toBe('PCB Design');
  });

  it('UUID is immutable across updates', () => {
    const originalUUID = mm.get().uuid;
    mm.update({ name: 'Renamed Project', author: 'Bob' });
    expect(mm.get().uuid).toBe(originalUUID);
  });

  it('createdAt is immutable across updates', () => {
    const original = mm.get().createdAt;
    mm.update({ name: 'New Name' });
    expect(mm.get().createdAt).toBe(original);
  });

  it('update changes modifiedAt', () => {
    const before = mm.get().modifiedAt;
    mm.update({ description: 'Updated' });
    const after = mm.get().modifiedAt;
    expect(after >= before).toBe(true);
  });

  it('bumpRevision increments revision', () => {
    expect(mm.get().revision).toBe(1);
    mm.bumpRevision();
    expect(mm.get().revision).toBe(2);
    mm.bumpRevision();
    expect(mm.get().revision).toBe(3);
  });

  it('setStatus changes project status', () => {
    mm.setStatus('in-review');
    expect(mm.get().status).toBe('in-review');
    mm.setStatus('released');
    expect(mm.get().status).toBe('released');
  });

  it('bumpVersion increments patch', () => {
    mm.bumpVersion('patch');
    expect(mm.get().version).toBe('1.0.1');
  });

  it('bumpVersion increments minor and resets patch', () => {
    mm.bumpVersion('minor');
    expect(mm.get().version).toBe('1.1.0');
  });

  it('bumpVersion increments major and resets minor and patch', () => {
    mm.bumpVersion('major');
    expect(mm.get().version).toBe('2.0.0');
  });

  it('addTag adds unique tags', () => {
    mm.addTag('analog');
    mm.addTag('digital');
    mm.addTag('analog'); // duplicate
    expect(mm.get().tags).toEqual(['analog', 'digital']);
  });

  it('removeTag removes existing tag', () => {
    mm.addTag('analog');
    mm.addTag('digital');
    mm.removeTag('analog');
    expect(mm.get().tags).toEqual(['digital']);
  });

  it('setCustomField stores custom key-value pairs', () => {
    mm.setCustomField('project-code', 'TNC-001');
    mm.setCustomField('department', 'R&D');
    const m = mm.get();
    expect(m.customFields['project-code']).toBe('TNC-001');
    expect(m.customFields['department']).toBe('R&D');
  });

  it('removeCustomField deletes a custom field', () => {
    mm.setCustomField('to-remove', 'value');
    mm.removeCustomField('to-remove');
    expect(mm.get().customFields['to-remove']).toBeUndefined();
  });

  it('generateNewUUID assigns a different UUID', () => {
    const original = mm.get().uuid;
    mm.generateNewUUID();
    expect(mm.get().uuid).not.toBe(original);
    expect(mm.get().uuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('restore reinstates a previous snapshot', () => {
    const snapshot: ProjectMetadata = {
      uuid: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      name: 'Restored Project',
      description: 'from archive',
      author: 'Charlie',
      company: 'RetroTech',
      version: '3.2.1',
      revision: 17,
      status: 'archived',
      createdAt: '2020-01-01T00:00:00.000Z',
      modifiedAt: '2024-06-15T12:00:00.000Z',
      tags: ['legacy'],
      customFields: { 'era': '2020s' },
    };
    mm.restore(snapshot);
    expect(mm.get()).toEqual(snapshot);
  });

  it('get returns a copy preventing external mutation', () => {
    const m1 = mm.get();
    m1.name = 'Mutated externally';
    expect(mm.get().name).toBe('My EDA Project');
  });

  it('createDefaultMetadata produces valid fields', () => {
    const meta = createDefaultMetadata('Default');
    expect(meta.uuid).toBeDefined();
    expect(meta.name).toBe('Default');
    expect(meta.version).toBe('1.0.0');
    expect(meta.status).toBe('draft');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 2 — Project Settings
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 2 — Project Settings', () => {
  let sm: SettingsManager;

  beforeEach(() => {
    sm = new SettingsManager();
  });

  it('creates default settings with all fields', () => {
    const s = sm.get();
    expect(s.units).toBe('mm');
    expect(s.angleUnit).toBe('deg');
    expect(s.grid.size).toBe(2.54);
    expect(s.grid.style).toBe('dots');
    expect(s.snap.enabled).toBe(true);
    expect(s.theme).toBe('dark');
    expect(s.pageDefaults.orientation).toBe('landscape');
    expect(s.annotationRules.scope).toBe('project');
    expect(s.ercOptions.runOnExport).toBe(true);
    expect(s.netNamingPreferences.netPrefix).toBe('Net');
  });

  it('setUnits changes the length unit', () => {
    sm.setUnits('mil');
    expect(sm.get().units).toBe('mil');
  });

  it('setTheme changes the theme', () => {
    sm.setTheme('light');
    expect(sm.get().theme).toBe('light');
  });

  it('updateGrid merges grid settings', () => {
    sm.updateGrid({ size: 1.27, style: 'lines' });
    const s = sm.get();
    expect(s.grid.size).toBe(1.27);
    expect(s.grid.style).toBe('lines');
    expect(s.grid.visible).toBe(true); // unchanged
  });

  it('updateSnap merges snap settings', () => {
    sm.updateSnap({ enabled: false, threshold: 10 });
    const s = sm.get();
    expect(s.snap.enabled).toBe(false);
    expect(s.snap.threshold).toBe(10);
    expect(s.snap.snapToGrid).toBe(true); // unchanged
  });

  it('updateERCOptions merges ERC options', () => {
    sm.updateERCOptions({ runOnSave: true });
    expect(sm.get().ercOptions.runOnSave).toBe(true);
    expect(sm.get().ercOptions.runOnExport).toBe(true); // unchanged
  });

  it('addIgnoredERCRule adds unique rule IDs', () => {
    sm.addIgnoredERCRule('ERC_001');
    sm.addIgnoredERCRule('ERC_002');
    sm.addIgnoredERCRule('ERC_001'); // duplicate
    expect(sm.get().ercOptions.ignoredRules).toEqual(['ERC_001', 'ERC_002']);
  });

  it('removeIgnoredERCRule removes a rule', () => {
    sm.addIgnoredERCRule('ERC_001');
    sm.removeIgnoredERCRule('ERC_001');
    expect(sm.get().ercOptions.ignoredRules).toEqual([]);
  });

  it('addLibrarySearchPath adds unique paths', () => {
    sm.addLibrarySearchPath('/libs/company');
    sm.addLibrarySearchPath('/libs/kicad');
    sm.addLibrarySearchPath('/libs/company'); // duplicate
    expect(sm.get().libraryPreferences.searchPaths).toEqual(['/libs/company', '/libs/kicad']);
  });

  it('removeLibrarySearchPath removes a path', () => {
    sm.addLibrarySearchPath('/libs/company');
    sm.removeLibrarySearchPath('/libs/company');
    expect(sm.get().libraryPreferences.searchPaths).toEqual([]);
  });

  it('updateNetNaming merges net naming preferences', () => {
    sm.updateNetNaming({ netPrefix: 'N_', powerNetPrefix: 'V_' });
    const s = sm.get();
    expect(s.netNamingPreferences.netPrefix).toBe('N_');
    expect(s.netNamingPreferences.powerNetPrefix).toBe('V_');
  });

  it('setCustomSetting stores arbitrary values', () => {
    sm.setCustomSetting('myPlugin.enabled', true);
    sm.setCustomSetting('myPlugin.threshold', 42);
    expect(sm.getCustomSetting('myPlugin.enabled')).toBe(true);
    expect(sm.getCustomSetting('myPlugin.threshold')).toBe(42);
  });

  it('validate returns no errors for defaults', () => {
    expect(sm.validate()).toEqual([]);
  });

  it('validate catches invalid grid size', () => {
    sm.updateGrid({ size: -1 });
    expect(sm.validate()).toContain('Grid size must be positive');
  });

  it('validate catches invalid page dimensions', () => {
    sm.updatePageDefaults({ width: 0, height: -5 });
    const errors = sm.validate();
    expect(errors.some(e => e.includes('width'))).toBe(true);
    expect(errors.some(e => e.includes('height'))).toBe(true);
  });

  it('get returns a deep copy preventing mutation', () => {
    const s1 = sm.get();
    s1.grid.size = 9999;
    expect(sm.get().grid.size).toBe(2.54);
  });

  it('serialization roundtrip preserves all settings', () => {
    sm.setUnits('mil');
    sm.setTheme('light');
    sm.updateGrid({ size: 1.0 });
    sm.addIgnoredERCRule('ERC_TEST');
    const json = JSON.stringify(sm.get());
    const parsed: ProjectSettings = JSON.parse(json);
    sm.restore(parsed);
    expect(sm.get().units).toBe('mil');
    expect(sm.get().theme).toBe('light');
    expect(sm.get().grid.size).toBe(1.0);
    expect(sm.get().ercOptions.ignoredRules).toContain('ERC_TEST');
  });

  it('reset restores defaults', () => {
    sm.setUnits('inch');
    sm.setTheme('light');
    sm.reset();
    expect(sm.get().units).toBe('mm');
    expect(sm.get().theme).toBe('dark');
  });

  it('createDefaultSettings with overrides applies them', () => {
    const s = createDefaultSettings({ units: 'mil', theme: 'light' });
    expect(s.units).toBe('mil');
    expect(s.theme).toBe('light');
    expect(s.grid.size).toBe(2.54); // untouched
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 3 — Document Management
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 3 — Document Management', () => {
  let dr: DocumentRegistry;

  beforeEach(() => {
    dr = new DocumentRegistry();
  });

  it('createDocument generates a unique ID', () => {
    const d1 = dr.createDocument('schematic', 'Main Schematic');
    const d2 = dr.createDocument('schematic', 'Second Sheet');
    expect(d1.id).not.toBe(d2.id);
  });

  it('createDocument sets correct defaults', () => {
    const d = dr.createDocument('schematic', 'Top Level');
    expect(d.kind).toBe('schematic');
    expect(d.title).toBe('Top Level');
    expect(d.state).toBe('closed');
    expect(d.dirty).toBe(false);
    expect(d.readonly).toBe(false);
    expect(d.version).toBe(1);
  });

  it('createDocument accepts pageId option', () => {
    const d = dr.createDocument('schematic', 'Sheet', { pageId: 'page-abc' });
    expect(d.pageId).toBe('page-abc');
  });

  it('open changes state to open', () => {
    const d = dr.createDocument('schematic', 'S1');
    dr.open(d.id);
    expect(dr.get(d.id)?.state).toBe('open');
  });

  it('open on readonly document sets readonly state', () => {
    const d = dr.createDocument('schematic', 'Locked', { readonly: true });
    dr.open(d.id);
    expect(dr.get(d.id)?.state).toBe('readonly');
  });

  it('close resets state to closed and clears dirty', () => {
    const d = dr.createDocument('schematic', 'S1');
    dr.open(d.id);
    dr.markDirty(d.id);
    dr.close(d.id);
    expect(dr.get(d.id)?.state).toBe('closed');
    expect(dr.get(d.id)?.dirty).toBe(false);
  });

  it('markDirty sets dirty and changes state to modified', () => {
    const d = dr.createDocument('schematic', 'S1');
    dr.open(d.id);
    dr.markDirty(d.id);
    expect(dr.get(d.id)?.dirty).toBe(true);
    expect(dr.get(d.id)?.state).toBe('modified');
  });

  it('markDirty returns false for readonly documents', () => {
    const d = dr.createDocument('schematic', 'Locked', { readonly: true });
    const result = dr.markDirty(d.id);
    expect(result).toBe(false);
    expect(dr.get(d.id)?.dirty).toBe(false);
  });

  it('markClean clears dirty and sets open state', () => {
    const d = dr.createDocument('schematic', 'S1');
    dr.open(d.id);
    dr.markDirty(d.id);
    dr.markClean(d.id);
    expect(dr.get(d.id)?.dirty).toBe(false);
    expect(dr.get(d.id)?.state).toBe('open');
  });

  it('setReadonly marks doc as readonly', () => {
    const d = dr.createDocument('schematic', 'S1');
    dr.open(d.id);
    dr.setReadonly(d.id, true);
    expect(dr.get(d.id)?.readonly).toBe(true);
    expect(dr.get(d.id)?.state).toBe('readonly');
  });

  it('list with kind filter returns matching documents', () => {
    dr.createDocument('schematic', 'S1');
    dr.createDocument('pcb', 'P1');
    dr.createDocument('schematic', 'S2');
    const schematics = dr.list({ kind: 'schematic' });
    expect(schematics).toHaveLength(2);
    expect(schematics.every(d => d.kind === 'schematic')).toBe(true);
  });

  it('list with state filter returns matching documents', () => {
    const d1 = dr.createDocument('schematic', 'S1');
    dr.createDocument('schematic', 'S2');
    dr.open(d1.id);
    const open = dr.list({ state: 'open' });
    expect(open).toHaveLength(1);
    expect(open[0].id).toBe(d1.id);
  });

  it('getDirtyDocuments returns only dirty docs', () => {
    const d1 = dr.createDocument('schematic', 'S1');
    const d2 = dr.createDocument('schematic', 'S2');
    dr.open(d1.id);
    dr.open(d2.id);
    dr.markDirty(d1.id);
    const dirty = dr.getDirtyDocuments();
    expect(dirty).toHaveLength(1);
    expect(dirty[0].id).toBe(d1.id);
  });

  it('hasAnyOpen returns true when at least one is open', () => {
    const d = dr.createDocument('schematic', 'S1');
    expect(dr.hasAnyOpen()).toBe(false);
    dr.open(d.id);
    expect(dr.hasAnyOpen()).toBe(true);
  });

  it('getByPageId returns the linked document', () => {
    dr.createDocument('schematic', 'No Page');
    const d = dr.createDocument('schematic', 'Linked', { pageId: 'page-xyz' });
    const found = dr.getByPageId('page-xyz');
    expect(found?.id).toBe(d.id);
  });

  it('bumpVersion increments document version', () => {
    const d = dr.createDocument('schematic', 'S1');
    expect(d.version).toBe(1);
    dr.bumpVersion(d.id);
    expect(dr.get(d.id)?.version).toBe(2);
  });

  it('delete removes document', () => {
    const d = dr.createDocument('schematic', 'S1');
    dr.delete(d.id);
    expect(dr.get(d.id)).toBeUndefined();
  });

  it('count returns correct number of documents', () => {
    dr.createDocument('schematic', 'S1');
    dr.createDocument('pcb', 'P1');
    expect(dr.count()).toBe(2);
  });

  it('restore rebuilds the registry from a snapshot', () => {
    const d1 = dr.createDocument('schematic', 'S1');
    const snapshot = dr.list();
    dr.clear();
    expect(dr.count()).toBe(0);
    dr.restore(snapshot);
    expect(dr.count()).toBe(1);
    expect(dr.get(d1.id)?.title).toBe('S1');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 4 — Project Assets
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 4 — Project Assets', () => {
  let am: AssetManager;

  beforeEach(() => {
    am = new AssetManager();
  });

  it('addAsset creates an asset with correct defaults', () => {
    const a = am.addAsset('image', 'schematic.png', '/assets/schematic.png');
    expect(a.id).toBeDefined();
    expect(a.kind).toBe('image');
    expect(a.name).toBe('schematic.png');
    expect(a.path).toBe('/assets/schematic.png');
    expect(a.mimeType).toBe('image/png');
    expect(a.linkedDocumentIds).toEqual([]);
  });

  it('addAsset derives correct MIME type per kind', () => {
    expect(am.addAsset('pdf', 'manual.pdf', '/docs/manual.pdf').mimeType).toBe('application/pdf');
    expect(am.addAsset('logo', 'logo.svg', '/assets/logo.svg').mimeType).toBe('image/svg+xml');
    expect(am.addAsset('custom-symbol', 'sym.json', '/sym.json').mimeType).toBe('application/json');
  });

  it('addAsset accepts optional metadata', () => {
    const a = am.addAsset('image', 'logo.png', '/logo.png', {
      description: 'Company logo',
      fileSize: 12345,
      hash: 'abc123',
      tags: ['branding'],
    });
    expect(a.description).toBe('Company logo');
    expect(a.fileSize).toBe(12345);
    expect(a.hash).toBe('abc123');
    expect(a.tags).toContain('branding');
  });

  it('get returns a copy preventing mutation', () => {
    const a = am.addAsset('image', 'img.png', '/img.png');
    const copy = am.get(a.id)!;
    copy.name = 'mutated';
    expect(am.get(a.id)!.name).toBe('img.png');
  });

  it('list with kind filter returns matching assets', () => {
    am.addAsset('image', 'img.png', '/img.png');
    am.addAsset('pdf', 'doc.pdf', '/doc.pdf');
    am.addAsset('image', 'img2.png', '/img2.png');
    const images = am.list({ kind: 'image' });
    expect(images).toHaveLength(2);
    expect(images.every(a => a.kind === 'image')).toBe(true);
  });

  it('findByPath locates asset by path', () => {
    am.addAsset('image', 'img.png', '/assets/img.png');
    const found = am.findByPath('/assets/img.png');
    expect(found).toBeDefined();
    expect(found!.name).toBe('img.png');
  });

  it('findByPath returns undefined for unknown path', () => {
    expect(am.findByPath('/nonexistent.png')).toBeUndefined();
  });

  it('findByName returns all matching assets', () => {
    am.addAsset('image', 'logo.png', '/v1/logo.png');
    am.addAsset('image', 'logo.png', '/v2/logo.png');
    am.addAsset('image', 'other.png', '/other.png');
    const found = am.findByName('logo.png');
    expect(found).toHaveLength(2);
  });

  it('updateAsset modifies asset fields', () => {
    const a = am.addAsset('image', 'old.png', '/old.png');
    am.updateAsset(a.id, { name: 'new.png', fileSize: 9000 });
    const updated = am.get(a.id)!;
    expect(updated.name).toBe('new.png');
    expect(updated.fileSize).toBe(9000);
  });

  it('linkDocument adds document ID to linkedDocumentIds', () => {
    const a = am.addAsset('pdf', 'datasheet.pdf', '/ds.pdf');
    am.linkDocument(a.id, 'doc-001');
    am.linkDocument(a.id, 'doc-002');
    am.linkDocument(a.id, 'doc-001'); // duplicate
    expect(am.get(a.id)!.linkedDocumentIds).toEqual(['doc-001', 'doc-002']);
  });

  it('unlinkDocument removes a specific document link', () => {
    const a = am.addAsset('pdf', 'ds.pdf', '/ds.pdf');
    am.linkDocument(a.id, 'doc-001');
    am.linkDocument(a.id, 'doc-002');
    am.unlinkDocument(a.id, 'doc-001');
    expect(am.get(a.id)!.linkedDocumentIds).toEqual(['doc-002']);
  });

  it('getOrphanedAssets finds unlinked assets', () => {
    const a1 = am.addAsset('image', 'used.png', '/used.png');
    const a2 = am.addAsset('image', 'orphan.png', '/orphan.png');
    am.linkDocument(a1.id, 'doc-active');
    const orphans = am.getOrphanedAssets(new Set(['doc-active']));
    expect(orphans).toHaveLength(1);
    expect(orphans[0].id).toBe(a2.id);
  });

  it('remove deletes an asset', () => {
    const a = am.addAsset('image', 'img.png', '/img.png');
    am.remove(a.id);
    expect(am.get(a.id)).toBeUndefined();
  });

  it('count returns correct count', () => {
    am.addAsset('image', 'a.png', '/a.png');
    am.addAsset('pdf', 'b.pdf', '/b.pdf');
    expect(am.count()).toBe(2);
  });

  it('restore rebuilds from snapshot', () => {
    const a = am.addAsset('image', 'logo.png', '/logo.png');
    const snapshot = am.list();
    am.clear();
    expect(am.count()).toBe(0);
    am.restore(snapshot);
    expect(am.count()).toBe(1);
    expect(am.get(a.id)?.name).toBe('logo.png');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 5 — Dependency Graph
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 5 — Dependency Graph', () => {
  let dg: DependencyGraph;

  beforeEach(() => {
    dg = new DependencyGraph();
  });

  it('addDependency creates a dependency with ID', () => {
    const dep = dg.addDependency('sheet-ref', 'src-a', 'tgt-b');
    expect(dep.id).toBeDefined();
    expect(dep.kind).toBe('sheet-ref');
    expect(dep.sourceId).toBe('src-a');
    expect(dep.targetId).toBe('tgt-b');
    expect(dep.resolved).toBe(true);
  });

  it('addDependency can be created as unresolved', () => {
    const dep = dg.addDependency('library-dep', 'doc-1', 'lib-missing', false);
    expect(dep.resolved).toBe(false);
  });

  it('list with kind filter returns correct deps', () => {
    dg.addDependency('sheet-ref', 'a', 'b');
    dg.addDependency('hierarchy', 'c', 'd');
    dg.addDependency('sheet-ref', 'e', 'f');
    expect(dg.list({ kind: 'sheet-ref' })).toHaveLength(2);
    expect(dg.list({ kind: 'hierarchy' })).toHaveLength(1);
  });

  it('list with sourceId filter returns correct deps', () => {
    dg.addDependency('sheet-ref', 'doc-1', 'tgt-a');
    dg.addDependency('sheet-ref', 'doc-1', 'tgt-b');
    dg.addDependency('sheet-ref', 'doc-2', 'tgt-c');
    expect(dg.list({ sourceId: 'doc-1' })).toHaveLength(2);
  });

  it('resolve marks a dependency as resolved', () => {
    const dep = dg.addDependency('library-dep', 'src', 'tgt', false);
    dg.resolve(dep.id);
    expect(dg.get(dep.id)?.resolved).toBe(true);
  });

  it('unresolve marks a dependency as unresolved', () => {
    const dep = dg.addDependency('library-dep', 'src', 'tgt', true);
    dg.unresolve(dep.id);
    expect(dg.get(dep.id)?.resolved).toBe(false);
  });

  it('remove deletes a dependency', () => {
    const dep = dg.addDependency('sheet-ref', 'a', 'b');
    dg.remove(dep.id);
    expect(dg.get(dep.id)).toBeUndefined();
  });

  it('removeBySource removes all deps from a given source', () => {
    dg.addDependency('sheet-ref', 'doc-1', 'x');
    dg.addDependency('hierarchy', 'doc-1', 'y');
    dg.addDependency('sheet-ref', 'doc-2', 'z');
    dg.removeBySource('doc-1');
    expect(dg.list({ sourceId: 'doc-1' })).toHaveLength(0);
    expect(dg.list({ sourceId: 'doc-2' })).toHaveLength(1);
  });

  it('removeByTarget removes all deps to a given target', () => {
    dg.addDependency('sheet-ref', 'a', 'common-tgt');
    dg.addDependency('hierarchy', 'b', 'common-tgt');
    dg.addDependency('sheet-ref', 'c', 'other');
    dg.removeByTarget('common-tgt');
    expect(dg.list({ targetId: 'common-tgt' })).toHaveLength(0);
  });

  it('analyze detects missing dependency (unresolved + target unknown)', () => {
    dg.addDependency('library-dep', 'src', 'missing-lib', false);
    const knownIds = new Set<string>(['src']);
    const diags = dg.analyze(knownIds);
    expect(diags.some(d => d.type === 'missing')).toBe(true);
  });

  it('analyze detects circular dependency', () => {
    dg.addDependency('sheet-ref', 'a', 'b', true);
    dg.addDependency('sheet-ref', 'b', 'a', true);
    const knownIds = new Set<string>(['a', 'b']);
    const diags = dg.analyze(knownIds);
    expect(diags.some(d => d.type === 'circular')).toBe(true);
  });

  it('analyze detects orphan target', () => {
    dg.addDependency('asset-dep', 'doc-1', 'asset-orphan', true);
    const knownIds = new Set<string>(['doc-1']); // asset-orphan not in known
    const diags = dg.analyze(knownIds);
    expect(diags.some(d => d.type === 'orphan')).toBe(true);
  });

  it('analyze returns no diagnostics for a clean graph', () => {
    dg.addDependency('sheet-ref', 'doc-a', 'doc-b', true);
    const knownIds = new Set<string>(['doc-a', 'doc-b']);
    const diags = dg.analyze(knownIds);
    expect(diags).toHaveLength(0);
  });

  it('count returns correct count', () => {
    dg.addDependency('sheet-ref', 'a', 'b');
    dg.addDependency('hierarchy', 'c', 'd');
    expect(dg.count()).toBe(2);
  });

  it('restore rebuilds from snapshot', () => {
    dg.addDependency('sheet-ref', 'a', 'b');
    const snap = dg.list();
    dg.clear();
    expect(dg.count()).toBe(0);
    dg.restore(snap);
    expect(dg.count()).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 6 — Annotation Framework
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 6 — Annotation Framework', () => {
  let af: AnnotationFramework;

  beforeEach(() => {
    af = new AnnotationFramework();
  });

  it('assign auto-numbers the first component', () => {
    const e = af.assign('R', 'obj-1');
    expect(e.prefix).toBe('R');
    expect(e.number).toBe(1);
    expect(e.reference).toBe('R1');
  });

  it('assign increments numbers for same prefix', () => {
    af.assign('R', 'obj-1');
    af.assign('R', 'obj-2');
    const e3 = af.assign('R', 'obj-3');
    expect(e3.number).toBe(3);
    expect(e3.reference).toBe('R3');
  });

  it('different prefixes are numbered independently', () => {
    af.assign('R', 'obj-r1');
    af.assign('C', 'obj-c1');
    af.assign('R', 'obj-r2');
    af.assign('C', 'obj-c2');
    expect(af.list({ prefix: 'R' }).map(e => e.number)).toEqual([1, 2]);
    expect(af.list({ prefix: 'C' }).map(e => e.number)).toEqual([1, 2]);
  });

  it('assign with custom startNumber begins at specified number', () => {
    const e = af.assign('U', 'obj-u1', { rules: { startNumber: 10 } });
    expect(e.number).toBe(10);
    expect(e.reference).toBe('U10');
  });

  it('assign skips already-used numbers', () => {
    af.assign('R', 'obj-1'); // R1
    af.assign('R', 'obj-2'); // R2
    // Manually create R4 to skip R3
    af.assignFixed('R', 4, 'obj-4');
    const e = af.assign('R', 'obj-3'); // should get R3
    expect(e.number).toBe(3);
  });

  it('getByObjectId returns the correct entry', () => {
    af.assign('R', 'resistor-xyz');
    const found = af.getByObjectId('resistor-xyz');
    expect(found?.reference).toBe('R1');
  });

  it('getByReference returns the correct entry', () => {
    af.assign('R', 'obj-1');
    const found = af.getByReference('R1');
    expect(found?.objectId).toBe('obj-1');
  });

  it('list with pageId filter returns only page entries', () => {
    af.assign('R', 'obj-1', { pageId: 'page-A' });
    af.assign('R', 'obj-2', { pageId: 'page-B' });
    af.assign('C', 'obj-3', { pageId: 'page-A' });
    const pageA = af.list({ pageId: 'page-A' });
    expect(pageA).toHaveLength(2);
    expect(pageA.every(e => e.pageId === 'page-A')).toBe(true);
  });

  it('removeByObjectId deletes the annotation for an object', () => {
    af.assign('R', 'obj-del');
    af.removeByObjectId('obj-del');
    expect(af.getByObjectId('obj-del')).toBeUndefined();
  });

  it('renumber reassigns numbers in order', () => {
    af.assign('R', 'o1'); // R1
    af.assign('R', 'o2'); // R2
    af.assign('R', 'o3'); // R3
    af.removeByObjectId('o2'); // gap: R1, R3
    af.renumber('R', 1);
    const list = af.list({ prefix: 'R' }).sort((a, b) => a.number - b.number);
    expect(list.map(e => e.number)).toEqual([1, 2]);
    expect(list.map(e => e.reference)).toEqual(['R1', 'R2']);
  });

  it('resetPage removes all annotations for a page', () => {
    af.assign('R', 'o1', { pageId: 'page-X' });
    af.assign('R', 'o2', { pageId: 'page-X' });
    af.assign('R', 'o3', { pageId: 'page-Y' });
    af.resetPage('page-X');
    expect(af.list({ pageId: 'page-X' })).toHaveLength(0);
    expect(af.list({ pageId: 'page-Y' })).toHaveLength(1);
  });

  it('detectConflicts returns conflicts when same reference is reused', () => {
    af.assignFixed('R', 1, 'obj-a');
    af.assignFixed('R', 1, 'obj-b'); // duplicate R1
    const conflicts = af.detectConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reference).toBe('R1');
    expect(conflicts[0].ids).toHaveLength(2);
  });

  it('detectConflicts returns empty for clean project', () => {
    af.assign('R', 'o1');
    af.assign('R', 'o2');
    af.assign('C', 'o3');
    expect(af.detectConflicts()).toHaveLength(0);
  });

  it('count returns correct count', () => {
    af.assign('R', 'o1');
    af.assign('C', 'o2');
    expect(af.count()).toBe(2);
  });

  it('restore rebuilds from snapshot', () => {
    af.assign('R', 'o1');
    af.assign('C', 'o2');
    const snap = af.list();
    af.clear();
    expect(af.count()).toBe(0);
    af.restore(snap);
    expect(af.count()).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 7 — Cross Reference Engine
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 7 — Cross Reference Engine', () => {
  let cre: CrossReferenceEngine;
  let dr: DocumentRegistry;

  beforeEach(() => {
    cre = new CrossReferenceEngine();
    dr = new DocumentRegistry();
  });

  it('build populates references from ObjectEngine', () => {
    const oe = makeObjectEngineWithPage();
    dr.createDocument('schematic', 'Sheet 1', { pageId: 'page-1' });
    cre.build(oe, dr);
    expect(cre.count()).toBe(2); // R1 and U1
  });

  it('getByObjectId returns the cross reference for an object', () => {
    const oe = makeObjectEngineWithPage();
    cre.build(oe, dr);
    const xref = cre.getByObjectId('obj-r1');
    expect(xref).toBeDefined();
    expect(xref!.reference).toBe('R1');
    expect(xref!.pageId).toBe('page-1');
    expect(xref!.sheetNumber).toBe('1');
  });

  it('getByReference returns all cross refs with that reference', () => {
    const oe = makeObjectEngineWithPage();
    cre.build(oe, dr);
    const refs = cre.getByReference('R1');
    expect(refs).toHaveLength(1);
    expect(refs[0].objectId).toBe('obj-r1');
  });

  it('getBySheet returns all objects on a given page', () => {
    const oe = makeObjectEngineWithPage();
    cre.build(oe, dr);
    const sheet = cre.getBySheet('page-1');
    expect(sheet).toHaveLength(2);
  });

  it('getByDocument links cross refs to the document', () => {
    const oe = makeObjectEngineWithPage();
    const doc = dr.createDocument('schematic', 'Sheet 1', { pageId: 'page-1' });
    cre.build(oe, dr);
    const refs = cre.getByDocument(doc.id);
    expect(refs).toHaveLength(2);
    expect(refs.every(r => r.documentId === doc.id)).toBe(true);
  });

  it('addNetLink links a net to an object', () => {
    const oe = makeObjectEngineWithPage();
    cre.build(oe, dr);
    cre.addNetLink('obj-r1', 'net-vcc');
    cre.addNetLink('obj-r1', 'net-gnd');
    const xref = cre.getByObjectId('obj-r1')!;
    expect(xref.netIds).toContain('net-vcc');
    expect(xref.netIds).toContain('net-gnd');
  });

  it('addNetLink does not duplicate net IDs', () => {
    const oe = makeObjectEngineWithPage();
    cre.build(oe, dr);
    cre.addNetLink('obj-r1', 'net-vcc');
    cre.addNetLink('obj-r1', 'net-vcc');
    const xref = cre.getByObjectId('obj-r1')!;
    expect(xref.netIds.filter(n => n === 'net-vcc')).toHaveLength(1);
  });

  it('clear empties the cache', () => {
    const oe = makeObjectEngineWithPage();
    cre.build(oe, dr);
    cre.clear();
    expect(cre.count()).toBe(0);
  });

  it('list returns all cross references', () => {
    const oe = makeObjectEngineWithPage();
    cre.build(oe, dr);
    expect(cre.list()).toHaveLength(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 8 — Project Validation
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 8 — Project Validation', () => {
  it('valid project produces no issues', () => {
    const pm = new ProjectManager('Valid Project');
    const issues = pm.validate();
    expect(issues).toHaveLength(0);
  });

  it('detects duplicate annotation references', () => {
    const pm = new ProjectManager('Test');
    pm.annotations.assignFixed('R', 1, 'obj-a');
    pm.annotations.assignFixed('R', 1, 'obj-b'); // conflict
    const issues = pm.validate();
    expect(issues.some(i => i.type === 'duplicate-reference')).toBe(true);
    expect(issues.some(i => i.severity === 'error')).toBe(true);
  });

  it('detects duplicate UUIDs across documents', () => {
    // The validator checks the snapshot arrays; we craft a snapshot with a duplicate directly
    const pm = new ProjectManager('Test');
    pm.createDocument('schematic', 'S1');
    const snap = pm.snapshot();
    // Inject a duplicate document entry into the snapshot arrays
    snap.documents.push({ ...snap.documents[0], title: 'Duplicate Entry' });
    // Validate directly using the validator with the bad snapshot
    const pv = new ProjectValidator();
    const issues = pv.validate(snap, pm.annotations, pm.dependencies, pm.documents, pm.assets);
    expect(issues.some(i => i.type === 'duplicate-uuid')).toBe(true);
  });

  it('detects missing document in sheet-ref dependency', () => {
    const pm = new ProjectManager('Test');
    const doc = pm.createDocument('schematic', 'Main');
    pm.addDependency('sheet-ref', doc.id, 'nonexistent-doc-id', true);
    const issues = pm.validate();
    expect(issues.some(i => i.type === 'missing-document')).toBe(true);
  });

  it('detects missing asset in asset-dep dependency', () => {
    const pm = new ProjectManager('Test');
    const doc = pm.createDocument('schematic', 'Main');
    pm.addDependency('asset-dep', doc.id, 'missing-asset-id', true);
    const issues = pm.validate();
    expect(issues.some(i => i.type === 'missing-asset')).toBe(true);
  });

  it('detects invalid settings', () => {
    const pm = new ProjectManager('Test');
    pm.settings.updateGrid({ size: -1 });
    const issues = pm.validate();
    expect(issues.some(i => i.type === 'invalid-settings')).toBe(true);
  });

  it('detects circular dependency', () => {
    const pm = new ProjectManager('Test');
    pm.addDependency('sheet-ref', 'doc-a', 'doc-b', true);
    pm.addDependency('sheet-ref', 'doc-b', 'doc-a', true);
    const issues = pm.validate();
    expect(issues.some(i => i.type === 'circular-dependency')).toBe(true);
  });

  it('returns error severity for duplicate-reference', () => {
    const pm = new ProjectManager('Test');
    pm.annotations.assignFixed('U', 1, 'a');
    pm.annotations.assignFixed('U', 1, 'b');
    const issues = pm.validate();
    const dupe = issues.find(i => i.type === 'duplicate-reference');
    expect(dupe?.severity).toBe('error');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 9 — Persistence
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 9 — Persistence', () => {
  it('snapshot captures all subsystem state', () => {
    const pm = new ProjectManager('Persist Test', { author: 'Alice' });
    pm.createDocument('schematic', 'Main Sheet');
    pm.addAsset('image', 'logo.png', '/logo.png');
    pm.addDependency('sheet-ref', 'src', 'tgt', true);
    pm.annotations.assign('R', 'obj-1');
    pm.settings.setUnits('mil');

    const snap = pm.snapshot();
    expect(snap.metadata.author).toBe('Alice');
    expect(snap.documents).toHaveLength(1);
    expect(snap.assets).toHaveLength(1);
    expect(snap.dependencies).toHaveLength(1);
    expect(snap.annotations).toHaveLength(1);
    expect(snap.settings.units).toBe('mil');
  });

  it('serialize and deserialize roundtrip preserves all data', () => {
    const pm = new ProjectManager('Roundtrip');
    pm.updateMetadata({ author: 'Bob', company: 'BobCo', description: 'Test project' });
    pm.createDocument('schematic', 'Sheet A');
    pm.addAsset('pdf', 'manual.pdf', '/docs/manual.pdf');
    pm.settings.setTheme('light');
    pm.settings.setUnits('mil');
    pm.annotations.assign('R', 'resistor-1');

    const json = pm.serialize();
    expect(typeof json).toBe('string');

    const pm2 = new ProjectManager();
    pm2.deserialize(json);

    expect(pm2.getMetadata().author).toBe('Bob');
    expect(pm2.getMetadata().company).toBe('BobCo');
    expect(pm2.documents.count()).toBe(1);
    expect(pm2.assets.count()).toBe(1);
    expect(pm2.settings.get().theme).toBe('light');
    expect(pm2.settings.get().units).toBe('mil');
    expect(pm2.annotations.count()).toBe(1);
  });

  it('restore replaces all subsystem state', () => {
    const pm = new ProjectManager('Original');
    pm.createDocument('schematic', 'Doc A');

    const snap = pm.snapshot();
    snap.metadata.name = 'Restored Name';
    snap.documents[0].title = 'Restored Doc';

    const pm2 = new ProjectManager('New');
    pm2.restore(snap);

    expect(pm2.getMetadata().name).toBe('Restored Name');
    expect(pm2.documents.list()[0].title).toBe('Restored Doc');
  });

  it('deserialize throws on invalid JSON', () => {
    const pers = new ProjectPersistence();
    expect(() => pers.deserializeSnapshot('{not valid json')).toThrow();
  });

  it('deserialize throws on missing metadata', () => {
    const pers = new ProjectPersistence();
    expect(() =>
      pers.deserializeSnapshot(JSON.stringify({ settings: {} }))
    ).toThrow(/metadata/);
  });

  it('deserialize throws on missing settings', () => {
    const pers = new ProjectPersistence();
    expect(() =>
      pers.deserializeSnapshot(JSON.stringify({ metadata: {} }))
    ).toThrow(/settings/);
  });

  it('deserialize with missing arrays defaults to empty arrays', () => {
    const pers = new ProjectPersistence();
    const minimalJson = JSON.stringify({
      metadata: createDefaultMetadata('Minimal'),
      settings: createDefaultSettings(),
    });
    const snap = pers.deserializeSnapshot(minimalJson);
    expect(snap.documents).toEqual([]);
    expect(snap.assets).toEqual([]);
    expect(snap.dependencies).toEqual([]);
    expect(snap.annotations).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 10 — Explorer Adapter
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 10 — Explorer Adapter', () => {
  it('buildProjectTree returns project-info root', () => {
    const pm = new ProjectManager('Explorer Test');
    const tree = pm.buildExplorerTree();
    expect(tree.type).toBe('project-info');
    expect(tree.label).toBe('Explorer Test');
    expect(tree.icon).toBe('📂');
  });

  it('buildProjectTree includes metadata in meta field', () => {
    const pm = new ProjectManager('Test', { author: 'Dave', version: '2.0.0' });
    const tree = pm.buildExplorerTree();
    expect(tree.meta?.author).toBe('Dave');
    expect(tree.meta?.version).toBe('2.0.0');
  });

  it('buildProjectTree includes documents folder with children', () => {
    const pm = new ProjectManager('Test');
    pm.createDocument('schematic', 'Main Sheet');
    pm.createDocument('pcb', 'Board Layout');
    const tree = pm.buildExplorerTree();
    const docsFolder = tree.children.find(c => c.type === 'documents-folder');
    expect(docsFolder).toBeDefined();
    expect(docsFolder!.children).toHaveLength(2);
    expect(docsFolder!.label).toContain('2');
  });

  it('buildProjectTree includes assets folder with children', () => {
    const pm = new ProjectManager('Test');
    pm.addAsset('image', 'logo.png', '/logo.png');
    pm.addAsset('pdf', 'manual.pdf', '/manual.pdf');
    const tree = pm.buildExplorerTree();
    const assetsFolder = tree.children.find(c => c.type === 'assets-folder');
    expect(assetsFolder).toBeDefined();
    expect(assetsFolder!.children).toHaveLength(2);
  });

  it('buildProjectTree includes dependencies folder with children', () => {
    const pm = new ProjectManager('Test');
    pm.addDependency('sheet-ref', 'a', 'b', true, 'Sheet A → B');
    const tree = pm.buildExplorerTree();
    const depsFolder = tree.children.find(c => c.type === 'dependencies-folder');
    expect(depsFolder).toBeDefined();
    expect(depsFolder!.children).toHaveLength(1);
    expect(depsFolder!.children[0].meta?.resolved).toBe(true);
  });

  it('document nodes have correct icons for kind', () => {
    const pm = new ProjectManager('Test');
    pm.createDocument('schematic', 'S1');
    pm.createDocument('pcb', 'P1');
    const tree = pm.buildExplorerTree();
    const docsFolder = tree.children.find(c => c.type === 'documents-folder')!;
    const schematic = docsFolder.children.find(c => c.meta?.kind === 'schematic');
    const pcb = docsFolder.children.find(c => c.meta?.kind === 'pcb');
    expect(schematic?.icon).toBe('⚡');
    expect(pcb?.icon).toBe('🔲');
  });

  it('empty project has no child folders', () => {
    const pm = new ProjectManager('Empty');
    const tree = pm.buildExplorerTree();
    expect(tree.children).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 11 — Property Inspector
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 11 — Property Inspector', () => {
  it('getProjectProperties returns expected groups', () => {
    const pm = new ProjectManager('Property Test');
    const groups = pm.getProjectProperties();
    const groupLabels = groups.map(g => g.label);
    expect(groupLabels).toContain('Project Identity');
    expect(groupLabels).toContain('Authorship');
    expect(groupLabels).toContain('Tags');
  });

  it('getProjectProperties contains UUID as readonly', () => {
    const pm = new ProjectManager('Test');
    const groups = pm.getProjectProperties();
    const idGroup = groups.find(g => g.label === 'Project Identity')!;
    const uuidField = idGroup.fields.find(f => f.key === 'uuid')!;
    expect(uuidField.readonly).toBe(true);
    expect(uuidField.value).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('getSettingsProperties returns expected groups', () => {
    const pm = new ProjectManager('Test');
    const groups = pm.getSettingsProperties();
    const groupLabels = groups.map(g => g.label);
    expect(groupLabels).toContain('General');
    expect(groupLabels).toContain('Grid');
    expect(groupLabels).toContain('Snap');
    expect(groupLabels).toContain('Page Defaults');
    expect(groupLabels).toContain('ERC');
  });

  it('getSettingsProperties grid fields reflect current values', () => {
    const pm = new ProjectManager('Test');
    pm.settings.updateGrid({ size: 5.08, style: 'lines' });
    const groups = pm.getSettingsProperties();
    const gridGroup = groups.find(g => g.label === 'Grid')!;
    const sizeField = gridGroup.fields.find(f => f.key === 'grid.size')!;
    const styleField = gridGroup.fields.find(f => f.key === 'grid.style')!;
    expect(sizeField.value).toBe(5.08);
    expect(styleField.value).toBe('lines');
  });

  it('getDocumentProperties returns fields for existing document', () => {
    const pm = new ProjectManager('Test');
    const doc = pm.createDocument('schematic', 'Main Sheet', 'page-1');
    const groups = pm.getDocumentProperties(doc.id);
    expect(groups).toHaveLength(1);
    const fields = groups[0].fields;
    expect(fields.find(f => f.key === 'title')?.value).toBe('Main Sheet');
    expect(fields.find(f => f.key === 'kind')?.value).toBe('schematic');
    expect(fields.find(f => f.key === 'id')?.readonly).toBe(true);
  });

  it('getDocumentProperties returns empty for unknown document', () => {
    const pm = new ProjectManager('Test');
    const groups = pm.getDocumentProperties('nonexistent');
    expect(groups).toHaveLength(0);
  });

  it('getAssetProperties returns fields for existing asset', () => {
    const pm = new ProjectManager('Test');
    const asset = pm.addAsset('pdf', 'manual.pdf', '/docs/manual.pdf', {
      description: 'Product manual',
      fileSize: 204800,
    });
    const groups = pm.getAssetProperties(asset.id);
    expect(groups).toHaveLength(1);
    const fields = groups[0].fields;
    expect(fields.find(f => f.key === 'name')?.value).toBe('manual.pdf');
    expect(fields.find(f => f.key === 'kind')?.value).toBe('pdf');
    expect(fields.find(f => f.key === 'fileSize')?.value).toBe(204800);
    expect(fields.find(f => f.key === 'id')?.readonly).toBe(true);
  });

  it('getAssetProperties returns empty for unknown asset', () => {
    const pm = new ProjectManager('Test');
    const groups = pm.getAssetProperties('nonexistent');
    expect(groups).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 12 — AI Integration
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 12 — AI Integration', () => {
  it('getProjectSummary returns key metadata fields', () => {
    const pm = new ProjectManager('AI Test', { author: 'Eve', company: 'EveCorp' });
    pm.createDocument('schematic', 'Main');
    pm.addAsset('image', 'logo.png', '/logo.png');
    const summary = pm.ai.getProjectSummary();
    expect(summary.name).toBe('AI Test');
    expect(summary.author).toBe('Eve');
    expect(summary.company).toBe('EveCorp');
    expect(summary.documentCount).toBe(1);
    expect(summary.assetCount).toBe(1);
    expect(summary.status).toBe('draft');
  });

  it('queryDocuments returns all documents', () => {
    const pm = new ProjectManager('Test');
    pm.createDocument('schematic', 'S1');
    pm.createDocument('pcb', 'P1');
    expect(pm.ai.queryDocuments()).toHaveLength(2);
  });

  it('queryDocuments with kind filter returns matching docs', () => {
    const pm = new ProjectManager('Test');
    pm.createDocument('schematic', 'S1');
    pm.createDocument('pcb', 'P1');
    pm.createDocument('schematic', 'S2');
    const schematics = pm.ai.queryDocuments({ kind: 'schematic' });
    expect(schematics).toHaveLength(2);
  });

  it('queryAssets returns all assets', () => {
    const pm = new ProjectManager('Test');
    pm.addAsset('image', 'a.png', '/a.png');
    pm.addAsset('pdf', 'b.pdf', '/b.pdf');
    expect(pm.ai.queryAssets()).toHaveLength(2);
  });

  it('queryDependencies returns all dependencies', () => {
    const pm = new ProjectManager('Test');
    pm.addDependency('sheet-ref', 'a', 'b');
    pm.addDependency('hierarchy', 'c', 'd');
    expect(pm.ai.queryDependencies()).toHaveLength(2);
  });

  it('getAnnotationByObjectId finds annotation', () => {
    const pm = new ProjectManager('Test');
    pm.annotate('R', 'my-resistor');
    const found = pm.ai.getAnnotationByObjectId('my-resistor');
    expect(found?.reference).toBe('R1');
  });

  it('searchAnnotations finds by prefix', () => {
    const pm = new ProjectManager('Test');
    pm.annotate('R', 'r1');
    pm.annotate('C', 'c1');
    pm.annotate('R', 'r2');
    const results = pm.ai.searchAnnotations('R');
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every(a => a.prefix === 'R')).toBe(true);
  });

  it('searchAnnotations with empty query returns all', () => {
    const pm = new ProjectManager('Test');
    pm.annotate('R', 'r1');
    pm.annotate('C', 'c1');
    expect(pm.ai.searchAnnotations('')).toHaveLength(2);
  });

  it('getHierarchySummary reflects hierarchy dependencies', () => {
    const pm = new ProjectManager('Test');
    pm.addDependency('hierarchy', 'top', 'child-1');
    pm.addDependency('hierarchy', 'top', 'child-2');
    pm.addDependency('sheet-ref', 'child-1', 'sheet-A');
    const summary = pm.ai.getHierarchySummary();
    expect(summary.hierarchyDependencies).toBe(2);
    expect(summary.sheetReferences).toBe(1);
    expect(summary.totalDependencies).toBe(3);
  });

  it('getAnnotationsByPrefix groups entries correctly', () => {
    const pm = new ProjectManager('Test');
    pm.annotate('R', 'r1');
    pm.annotate('R', 'r2');
    pm.annotate('C', 'c1');
    const byPrefix = pm.ai.getAnnotationsByPrefix();
    expect(byPrefix['R']).toHaveLength(2);
    expect(byPrefix['C']).toHaveLength(1);
  });

  it('getMetadata returns current metadata', () => {
    const pm = new ProjectManager('AI Meta Test', { author: 'Frank' });
    const meta = pm.ai.getMetadata();
    expect(meta.name).toBe('AI Meta Test');
    expect(meta.author).toBe('Frank');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 13 — Public API
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 13 — Public API', () => {
  it('all subsystems are accessible via ProjectManager', () => {
    const pm = new ProjectManager('Test');
    expect(pm.metadata).toBeInstanceOf(MetadataManager);
    expect(pm.settings).toBeInstanceOf(SettingsManager);
    expect(pm.documents).toBeInstanceOf(DocumentRegistry);
    expect(pm.assets).toBeInstanceOf(AssetManager);
    expect(pm.dependencies).toBeInstanceOf(DependencyGraph);
    expect(pm.annotations).toBeInstanceOf(AnnotationFramework);
    expect(pm.crossRefs).toBeInstanceOf(CrossReferenceEngine);
    expect(pm.ai).toBeInstanceOf(ProjectAIAdapter);
  });

  it('individual manager classes are importable and usable independently', () => {
    const mm = new MetadataManager('Standalone');
    const sm = new SettingsManager();
    const dr = new DocumentRegistry();
    const am = new AssetManager();
    const dg = new DependencyGraph();
    const af = new AnnotationFramework();
    const cre = new CrossReferenceEngine();
    const pv = new ProjectValidator();
    const pp = new ProjectPersistence();
    const ea = new ProjectExplorerAdapter();
    const pa = new PropertyAdapter();
    expect(mm.get().name).toBe('Standalone');
    expect(sm.get().units).toBe('mm');
    expect(dr.count()).toBe(0);
    expect(am.count()).toBe(0);
    expect(dg.count()).toBe(0);
    expect(af.count()).toBe(0);
    expect(cre.count()).toBe(0);
    expect(pv).toBeDefined();
    expect(pp).toBeDefined();
    expect(ea).toBeDefined();
    expect(pa).toBeDefined();
  });

  it('deleteDocument also removes associated dependencies', () => {
    const pm = new ProjectManager('Test');
    const doc = pm.createDocument('schematic', 'Main');
    pm.addDependency('sheet-ref', doc.id, 'some-target');
    pm.addDependency('hierarchy', 'some-parent', doc.id);
    pm.deleteDocument(doc.id);
    expect(pm.documents.get(doc.id)).toBeUndefined();
    expect(pm.dependencies.list({ sourceId: doc.id })).toHaveLength(0);
    expect(pm.dependencies.list({ targetId: doc.id })).toHaveLength(0);
  });

  it('removeAsset also removes associated dependencies', () => {
    const pm = new ProjectManager('Test');
    const asset = pm.addAsset('image', 'logo.png', '/logo.png');
    pm.addDependency('asset-dep', 'doc-1', asset.id);
    pm.removeAsset(asset.id);
    expect(pm.assets.get(asset.id)).toBeUndefined();
    expect(pm.dependencies.list({ targetId: asset.id })).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 14 — Performance
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 14 — Performance', () => {
  it('lookupUUID returns metadata for project UUID', () => {
    const pm = new ProjectManager('Perf Test');
    const uuid = pm.getMetadata().uuid;
    expect(pm.lookupUUID(uuid)).toBe('metadata');
  });

  it('lookupUUID returns document for document ID', () => {
    const pm = new ProjectManager('Perf Test');
    const doc = pm.createDocument('schematic', 'S1');
    expect(pm.lookupUUID(doc.id)).toBe('document');
  });

  it('lookupUUID returns asset for asset ID', () => {
    const pm = new ProjectManager('Perf Test');
    const asset = pm.addAsset('image', 'logo.png', '/logo.png');
    expect(pm.lookupUUID(asset.id)).toBe('asset');
  });

  it('lookupUUID returns undefined for unknown UUID', () => {
    const pm = new ProjectManager('Perf Test');
    expect(pm.lookupUUID('completely-unknown-uuid')).toBeUndefined();
  });

  it('UUID index is rebuilt after restore', () => {
    const pm = new ProjectManager('Test');
    const doc = pm.createDocument('schematic', 'Main');
    const snap = pm.snapshot();
    const pm2 = new ProjectManager('New');
    pm2.restore(snap);
    expect(pm2.lookupUUID(doc.id)).toBe('document');
  });

  it('settings get() is a deep clone (no mutation leaks)', () => {
    const pm = new ProjectManager('Test');
    const s1 = pm.getSettings();
    s1.grid.size = 999;
    s1.ercOptions.ignoredRules.push('MUTATED');
    const s2 = pm.getSettings();
    expect(s2.grid.size).toBe(2.54);
    expect(s2.ercOptions.ignoredRules).not.toContain('MUTATED');
  });

  it('lazyLoadDocument calls loader only for closed documents', async () => {
    const pm = new ProjectManager('Test');
    const doc = pm.createDocument('schematic', 'Lazy');
    let calledCount = 0;
    await pm.lazyLoadDocument(doc.id, async () => { calledCount++; });
    expect(calledCount).toBe(1);
    // Now open — should not call again
    await pm.lazyLoadDocument(doc.id, async () => { calledCount++; });
    expect(calledCount).toBe(1);
  });

  it('lazyLoadDocument skips unknown documents', async () => {
    const pm = new ProjectManager('Test');
    let called = false;
    await pm.lazyLoadDocument('nonexistent', async () => { called = true; });
    expect(called).toBe(false);
  });

  it('DependencyGraph analyze handles large graphs without stack overflow', () => {
    const dg = new DependencyGraph();
    const knownIds = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const src = `node-${i}`;
      const tgt = `node-${i + 1}`;
      knownIds.add(src);
      knownIds.add(tgt);
      dg.addDependency('sheet-ref', src, tgt, true);
    }
    // Should complete without stack overflow; no circular in a chain
    const diags = dg.analyze(knownIds);
    expect(diags).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PART 15 — Integration Tests
// ═════════════════════════════════════════════════════════════════════════════

describe('Part 15 — Integration Tests', () => {
  it('full project lifecycle: create → annotate → validate → serialize → restore → validate', () => {
    // 1. Create project
    const pm = new ProjectManager('Full Lifecycle Project', {
      author: 'Grace',
      company: 'TechCo',
    });
    pm.updateMetadata({ description: 'Integration test project', version: '1.0.0' });
    pm.settings.setUnits('mm');
    pm.settings.setTheme('dark');
    pm.settings.updateGrid({ size: 2.54 });

    // 2. Create documents and assets
    const schDoc = pm.createDocument('schematic', 'Main Schematic', 'page-main');
    const hierDoc = pm.createDocument('hierarchical-sheet', 'Power Supply', 'page-pwr');
    const logoAsset = pm.addAsset('logo', 'company-logo.svg', '/assets/logo.svg', {
      fileSize: 4096,
      description: 'Company logo for title block',
    });
    const dsAsset = pm.addAsset('datasheet-ref', 'ESP32 DS', '/datasheets/esp32.pdf');

    // 3. Add dependencies
    pm.addDependency('hierarchy', schDoc.id, hierDoc.id, true, 'Top → Power Supply');
    pm.addDependency('asset-dep', schDoc.id, logoAsset.id, true);
    pm.addDependency('asset-dep', hierDoc.id, dsAsset.id, true);

    // 4. Annotate components
    pm.annotate('R', 'r001', { pageId: 'page-main', documentId: schDoc.id });
    pm.annotate('R', 'r002', { pageId: 'page-main', documentId: schDoc.id });
    pm.annotate('C', 'c001', { pageId: 'page-main', documentId: schDoc.id });
    pm.annotate('U', 'u001', { pageId: 'page-main', documentId: schDoc.id });
    pm.annotate('L', 'l001', { pageId: 'page-pwr', documentId: hierDoc.id });

    // 5. Link documents to assets
    pm.assets.linkDocument(logoAsset.id, schDoc.id);
    pm.assets.linkDocument(dsAsset.id, hierDoc.id);

    // 6. Validate — should be clean
    const issuesBefore = pm.validate();
    // Filter out orphan warnings from the hierarchy dep targets not being in knownIds
    const errorsBefore = issuesBefore.filter(i => i.severity === 'error');
    expect(errorsBefore).toHaveLength(0);

    // 7. Verify annotation structure
    expect(pm.annotations.list({ prefix: 'R' })).toHaveLength(2);
    expect(pm.annotations.list({ prefix: 'C' })).toHaveLength(1);
    expect(pm.annotations.count()).toBe(5);
    expect(pm.annotations.detectConflicts()).toHaveLength(0);

    // 8. Build cross references from ObjectEngine
    const oe = makeObjectEngineWithPage();
    pm.buildCrossReferences(oe);
    expect(pm.crossRefs.count()).toBe(2);

    // 9. Serialize
    pm.bumpRevision();
    const json = pm.serialize();
    expect(json).toContain('Full Lifecycle Project');

    // 10. Restore into a fresh instance
    const pm2 = new ProjectManager();
    pm2.deserialize(json);

    // 11. Verify restored state
    expect(pm2.getMetadata().name).toBe('Full Lifecycle Project');
    expect(pm2.getMetadata().author).toBe('Grace');
    expect(pm2.getMetadata().revision).toBe(2);
    expect(pm2.documents.count()).toBe(2);
    expect(pm2.assets.count()).toBe(2);
    expect(pm2.dependencies.count()).toBe(3);
    expect(pm2.annotations.count()).toBe(5);
    expect(pm2.settings.get().units).toBe('mm');

    // 12. Validate again after restore — still clean
    const issuesAfter = pm2.validate().filter(i => i.severity === 'error');
    expect(issuesAfter).toHaveLength(0);

    // 13. Check UUID lookup in restored instance
    expect(pm2.lookupUUID(pm2.getMetadata().uuid)).toBe('metadata');
    const docs = pm2.documents.list();
    for (const doc of docs) {
      expect(pm2.lookupUUID(doc.id)).toBe('document');
    }

    // 14. Explorer tree
    const tree = pm2.buildExplorerTree();
    expect(tree.type).toBe('project-info');
    expect(tree.children.some(c => c.type === 'documents-folder')).toBe(true);
    expect(tree.children.some(c => c.type === 'assets-folder')).toBe(true);
    expect(tree.children.some(c => c.type === 'dependencies-folder')).toBe(true);

    // 15. AI summary
    const summary = pm2.ai.getProjectSummary();
    expect(summary.documentCount).toBe(2);
    expect(summary.assetCount).toBe(2);
    expect(summary.annotationCount).toBe(5);
  });

  it('project status lifecycle: draft → in-review → released → archived', () => {
    const pm = new ProjectManager('Status Flow');
    expect(pm.getMetadata().status).toBe('draft');
    pm.setStatus('in-review');
    expect(pm.getMetadata().status).toBe('in-review');
    pm.setStatus('released');
    expect(pm.getMetadata().status).toBe('released');
    pm.setStatus('archived');
    expect(pm.getMetadata().status).toBe('archived');
  });

  it('annotation renumbering after component removal', () => {
    const pm = new ProjectManager('Renumber Test');
    pm.annotate('R', 'r1'); // R1
    pm.annotate('R', 'r2'); // R2
    pm.annotate('R', 'r3'); // R3
    // Remove R2
    pm.annotations.removeByObjectId('r2');
    expect(pm.annotations.list({ prefix: 'R' })).toHaveLength(2);
    // Renumber from 1
    pm.renumberAnnotations('R', 1);
    const refs = pm.annotations.list({ prefix: 'R' }).map(e => e.reference).sort();
    expect(refs).toEqual(['R1', 'R2']);
  });

  it('document dirty state management across open/modify/save cycle', () => {
    const pm = new ProjectManager('Document Flow');
    const doc = pm.createDocument('schematic', 'Main');
    expect(pm.documents.get(doc.id)?.state).toBe('closed');

    pm.openDocument(doc.id);
    expect(pm.documents.get(doc.id)?.state).toBe('open');

    pm.markDocumentDirty(doc.id);
    expect(pm.documents.get(doc.id)?.state).toBe('modified');
    expect(pm.documents.get(doc.id)?.dirty).toBe(true);

    pm.markDocumentClean(doc.id);
    expect(pm.documents.get(doc.id)?.dirty).toBe(false);
    expect(pm.documents.get(doc.id)?.state).toBe('open');

    pm.closeDocument(doc.id);
    expect(pm.documents.get(doc.id)?.state).toBe('closed');
  });

  it('cross reference rebuilds correctly after page changes', () => {
    const pm = new ProjectManager('XRef Test');
    pm.createDocument('schematic', 'Sheet 1', 'page-1');
    const oe = makeObjectEngineWithPage();
    pm.buildCrossReferences(oe);
    expect(pm.crossRefs.count()).toBe(2);
    // Adding a net link works
    pm.crossRefs.addNetLink('obj-r1', 'net-5v');
    expect(pm.crossRefs.getByObjectId('obj-r1')?.netIds).toContain('net-5v');
    // Rebuild clears and re-indexes
    pm.buildCrossReferences(oe);
    expect(pm.crossRefs.count()).toBe(2);
  });

  it('settings persist across project serialize/restore', () => {
    const pm = new ProjectManager('Settings Persist');
    pm.settings.setUnits('mil');
    pm.settings.setTheme('light');
    pm.settings.updateGrid({ size: 1.0, style: 'lines' });
    pm.settings.addIgnoredERCRule('ERC_100');
    pm.settings.addLibrarySearchPath('/custom/libs');
    pm.settings.updateNetNaming({ netPrefix: 'NET_', powerNetPrefix: 'VCC_' });

    const json = pm.serialize();
    const pm2 = new ProjectManager();
    pm2.deserialize(json);

    const s = pm2.settings.get();
    expect(s.units).toBe('mil');
    expect(s.theme).toBe('light');
    expect(s.grid.size).toBe(1.0);
    expect(s.grid.style).toBe('lines');
    expect(s.ercOptions.ignoredRules).toContain('ERC_100');
    expect(s.libraryPreferences.searchPaths).toContain('/custom/libs');
    expect(s.netNamingPreferences.netPrefix).toBe('NET_');
    expect(s.netNamingPreferences.powerNetPrefix).toBe('VCC_');
  });
});
