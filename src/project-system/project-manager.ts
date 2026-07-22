/**
 * Project System — Project Manager
 *
 * Central facade composing all project subsystems.
 * This is the primary entry point for consumers.
 *
 * - O(1) UUID lookup via internal index
 * - Lazy document loading
 * - Incremental dependency updates
 * - Cached settings (clone-on-get)
 */

import {
  ProjectMetadata,
  ProjectSettings,
  ProjectSystemSnapshot,
  ProjectStatus,
  DocumentKind,
  AssetKind,
  DependencyKind,
  AnnotationRules,
  ProjectValidationIssue,
  DocumentMetadata,
  ProjectAsset,
  ProjectDependency,
  AnnotationEntry,
} from './types';
import { MetadataManager } from './metadata-manager';
import { SettingsManager } from './settings-manager';
import { DocumentRegistry } from './document-registry';
import { AssetManager } from './asset-manager';
import { DependencyGraph } from './dependency-graph';
import { AnnotationFramework } from './annotation-framework';
import { CrossReferenceEngine } from './cross-reference-engine';
import { ProjectPersistence } from './project-persistence';
import { ProjectValidator } from './project-validator';
import { ProjectExplorerAdapter, ProjectExplorerNode } from './explorer-adapter';
import { PropertyAdapter, PropertyGroup } from './property-adapter';
import { ProjectAIAdapter } from './ai-adapter';
import { ObjectEngine } from '../object-engine';

export class ProjectManager {
  readonly metadata: MetadataManager;
  readonly settings: SettingsManager;
  readonly documents: DocumentRegistry;
  readonly assets: AssetManager;
  readonly dependencies: DependencyGraph;
  readonly annotations: AnnotationFramework;
  readonly crossRefs: CrossReferenceEngine;

  private readonly persistence: ProjectPersistence;
  private readonly validator: ProjectValidator;
  private readonly explorerAdapter: ProjectExplorerAdapter;
  private readonly propertyAdapter: PropertyAdapter;
  private readonly _ai: ProjectAIAdapter;

  // O(1) UUID lookup index
  private uuidIndex = new Map<string, 'metadata' | 'document' | 'asset'>();

  constructor(projectName = 'Untitled Project', initial?: Partial<ProjectMetadata>) {
    this.metadata = new MetadataManager(projectName, initial);
    this.settings = new SettingsManager();
    this.documents = new DocumentRegistry();
    this.assets = new AssetManager();
    this.dependencies = new DependencyGraph();
    this.annotations = new AnnotationFramework();
    this.crossRefs = new CrossReferenceEngine();
    this.persistence = new ProjectPersistence();
    this.validator = new ProjectValidator();
    this.explorerAdapter = new ProjectExplorerAdapter();
    this.propertyAdapter = new PropertyAdapter();
    this._ai = new ProjectAIAdapter(
      this.metadata,
      this.documents,
      this.dependencies,
      this.assets,
      this.annotations
    );
    this.rebuildUUIDIndex();
  }

  // ── AI Adapter ──────────────────────────────────────────────────────────────

  get ai(): ProjectAIAdapter {
    return this._ai;
  }

  // ── Metadata ────────────────────────────────────────────────────────────────

  getMetadata(): ProjectMetadata {
    return this.metadata.get();
  }

  updateMetadata(patch: Partial<Omit<ProjectMetadata, 'uuid' | 'createdAt'>>): void {
    this.metadata.update(patch);
    this.rebuildUUIDIndex();
  }

  setStatus(status: ProjectStatus): void {
    this.metadata.setStatus(status);
  }

  bumpVersion(part: 'major' | 'minor' | 'patch' = 'patch'): void {
    this.metadata.bumpVersion(part);
  }

  bumpRevision(): void {
    this.metadata.bumpRevision();
  }

  addTag(tag: string): void {
    this.metadata.addTag(tag);
  }

  removeTag(tag: string): void {
    this.metadata.removeTag(tag);
  }

  setCustomField(key: string, value: string): void {
    this.metadata.setCustomField(key, value);
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  getSettings(): ProjectSettings {
    return this.settings.get();
  }

  updateSettings(patch: Partial<ProjectSettings>): void {
    this.settings.patch(patch);
  }

  validateSettings(): string[] {
    return this.settings.validate();
  }

  resetSettings(): void {
    this.settings.reset();
  }

  // ── Documents ──────────────────────────────────────────────────────────────

  createDocument(kind: DocumentKind, title: string, pageId?: string): DocumentMetadata {
    const doc = this.documents.createDocument(kind, title, { pageId });
    this.uuidIndex.set(doc.id, 'document');
    return doc;
  }

  openDocument(id: string): boolean {
    return this.documents.open(id);
  }

  closeDocument(id: string): boolean {
    return this.documents.close(id);
  }

  markDocumentDirty(id: string): boolean {
    return this.documents.markDirty(id);
  }

  markDocumentClean(id: string): boolean {
    return this.documents.markClean(id);
  }

  deleteDocument(id: string): boolean {
    const deleted = this.documents.delete(id);
    if (deleted) {
      this.uuidIndex.delete(id);
      this.dependencies.removeBySource(id);
      this.dependencies.removeByTarget(id);
    }
    return deleted;
  }

  listDocuments(filter?: { kind?: DocumentKind }): DocumentMetadata[] {
    return this.documents.list(filter);
  }

  // ── Assets ──────────────────────────────────────────────────────────────────

  addAsset(
    kind: AssetKind,
    name: string,
    path: string,
    opts?: Partial<Omit<ProjectAsset, 'id' | 'kind' | 'name' | 'path' | 'createdAt'>>
  ): ProjectAsset {
    const asset = this.assets.addAsset(kind, name, path, opts);
    this.uuidIndex.set(asset.id, 'asset');
    return asset;
  }

  removeAsset(id: string): boolean {
    const removed = this.assets.remove(id);
    if (removed) {
      this.uuidIndex.delete(id);
      this.dependencies.removeByTarget(id);
    }
    return removed;
  }

  listAssets(filter?: { kind?: AssetKind }): ProjectAsset[] {
    return this.assets.list(filter);
  }

  // ── Dependencies ──────────────────────────────────────────────────────────

  addDependency(
    kind: DependencyKind,
    sourceId: string,
    targetId: string,
    resolved = true,
    label?: string
  ): ProjectDependency {
    return this.dependencies.addDependency(kind, sourceId, targetId, resolved, label);
  }

  removeDependency(id: string): boolean {
    return this.dependencies.remove(id);
  }

  listDependencies(filter?: { kind?: DependencyKind }): ProjectDependency[] {
    return this.dependencies.list(filter);
  }

  analyzeDependencies(): ReturnType<DependencyGraph['analyze']> {
    const knownIds = this.buildKnownIds();
    return this.dependencies.analyze(knownIds);
  }

  // ── Annotations ────────────────────────────────────────────────────────────

  annotate(
    prefix: string,
    objectId: string,
    opts: { pageId?: string; documentId?: string; rules?: Partial<AnnotationRules> } = {}
  ): AnnotationEntry {
    return this.annotations.assign(prefix, objectId, opts);
  }

  renumberAnnotations(prefix: string, startNumber: number, pageId?: string): AnnotationEntry[] {
    return this.annotations.renumber(prefix, startNumber, pageId);
  }

  detectAnnotationConflicts(): Array<{ reference: string; ids: string[] }> {
    return this.annotations.detectConflicts();
  }

  // ── Cross References ────────────────────────────────────────────────────────

  buildCrossReferences(objectEngine: ObjectEngine): void {
    this.crossRefs.build(objectEngine, this.documents);
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  validate(): ProjectValidationIssue[] {
    const snap = this.snapshot();
    return this.validator.validate(snap, this.annotations, this.dependencies, this.documents, this.assets);
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  snapshot(): ProjectSystemSnapshot {
    return this.persistence.snapshot(
      this.metadata,
      this.settings,
      this.documents,
      this.assets,
      this.dependencies,
      this.annotations
    );
  }

  restore(snap: ProjectSystemSnapshot): void {
    this.persistence.restore(
      snap,
      this.metadata,
      this.settings,
      this.documents,
      this.assets,
      this.dependencies,
      this.annotations
    );
    this.rebuildUUIDIndex();
  }

  serialize(): string {
    return this.persistence.serializeSnapshot(this.snapshot());
  }

  deserialize(json: string): void {
    const snap = this.persistence.deserializeSnapshot(json);
    this.restore(snap);
  }

  // ── Explorer Adapter ────────────────────────────────────────────────────────

  buildExplorerTree(): ProjectExplorerNode {
    return this.explorerAdapter.buildProjectTree(
      this.metadata,
      this.documents,
      this.assets,
      this.dependencies
    );
  }

  // ── Property Adapter ────────────────────────────────────────────────────────

  getProjectProperties(): PropertyGroup[] {
    return this.propertyAdapter.getProjectProperties(this.metadata);
  }

  getSettingsProperties(): PropertyGroup[] {
    return this.propertyAdapter.getSettingsProperties(this.settings);
  }

  getDocumentProperties(docId: string): PropertyGroup[] {
    return this.propertyAdapter.getDocumentProperties(this.documents, docId);
  }

  getAssetProperties(assetId: string): PropertyGroup[] {
    return this.propertyAdapter.getAssetProperties(this.assets, assetId);
  }

  // ── Performance: O(1) UUID Lookup ──────────────────────────────────────────

  lookupUUID(uuid: string): 'metadata' | 'document' | 'asset' | undefined {
    return this.uuidIndex.get(uuid);
  }

  // ── Lazy Document Loading ───────────────────────────────────────────────────

  lazyLoadDocument(id: string, loader: () => Promise<void>): Promise<void> {
    const doc = this.documents.get(id);
    if (!doc || doc.state !== 'closed') return Promise.resolve();
    return loader().then(() => {
      this.documents.open(id);
    });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private buildKnownIds(): Set<string> {
    return new Set<string>([
      this.metadata.get().uuid,
      ...this.documents.list().map(d => d.id),
      ...this.assets.list().map(a => a.id),
    ]);
  }

  private rebuildUUIDIndex(): void {
    this.uuidIndex.clear();
    const meta = this.metadata.get();
    this.uuidIndex.set(meta.uuid, 'metadata');
    for (const doc of this.documents.list()) {
      this.uuidIndex.set(doc.id, 'document');
    }
    for (const asset of this.assets.list()) {
      this.uuidIndex.set(asset.id, 'asset');
    }
  }
}
