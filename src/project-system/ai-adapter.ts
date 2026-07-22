/**
 * Project System — AI Adapter
 *
 * Provides a structured, read-only query interface for the AI layer.
 * No LLM integration. Pure data access.
 */

import { MetadataManager } from './metadata-manager';
import { DocumentRegistry } from './document-registry';
import { DependencyGraph } from './dependency-graph';
import { AssetManager } from './asset-manager';
import { AnnotationFramework } from './annotation-framework';
import {
  DocumentMetadata,
  ProjectAsset,
  ProjectDependency,
  AnnotationEntry,
  DocumentKind,
  AssetKind,
  DependencyKind,
} from './types';

export class ProjectAIAdapter {
  constructor(
    private readonly metaManager: MetadataManager,
    private readonly docRegistry: DocumentRegistry,
    private readonly depGraph: DependencyGraph,
    private readonly assetManager: AssetManager,
    private readonly annoFramework: AnnotationFramework
  ) {}

  /** High-level project summary for AI context. */
  getProjectSummary(): Record<string, any> {
    const meta = this.metaManager.get();
    return {
      name: meta.name,
      description: meta.description,
      version: meta.version,
      revision: meta.revision,
      status: meta.status,
      author: meta.author,
      company: meta.company,
      tags: meta.tags,
      documentCount: this.docRegistry.count(),
      assetCount: this.assetManager.count(),
      dependencyCount: this.depGraph.count(),
      annotationCount: this.annoFramework.count(),
      createdAt: meta.createdAt,
      modifiedAt: meta.modifiedAt,
    };
  }

  /** Query documents, optionally filtered by kind. */
  queryDocuments(filter?: { kind?: DocumentKind }): DocumentMetadata[] {
    return this.docRegistry.list(filter);
  }

  /** Query assets, optionally filtered by kind. */
  queryAssets(filter?: { kind?: AssetKind }): ProjectAsset[] {
    return this.assetManager.list(filter);
  }

  /** Query dependencies, optionally filtered by kind. */
  queryDependencies(filter?: { kind?: DependencyKind }): ProjectDependency[] {
    return this.depGraph.list(filter);
  }

  /** Get the annotation for a specific object. */
  getAnnotationByObjectId(objectId: string): AnnotationEntry | undefined {
    return this.annoFramework.getByObjectId(objectId);
  }

  /** Full-text search over annotation references. */
  searchAnnotations(query: string): AnnotationEntry[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.annoFramework.list();
    return this.annoFramework.list().filter(
      e =>
        e.reference.toLowerCase().includes(q) ||
        e.prefix.toLowerCase().includes(q)
    );
  }

  /** Summary of hierarchy structure for AI context. */
  getHierarchySummary(): Record<string, any> {
    const hierarchyDeps = this.depGraph.list({ kind: 'hierarchy' });
    const sheetDeps = this.depGraph.list({ kind: 'sheet-ref' });
    const hierarchicalSheets = this.docRegistry.list({ kind: 'hierarchical-sheet' });
    return {
      hierarchicalSheets: hierarchicalSheets.length,
      hierarchyDependencies: hierarchyDeps.length,
      sheetReferences: sheetDeps.length,
      totalDependencies: this.depGraph.count(),
      totalDocuments: this.docRegistry.count(),
    };
  }

  /** Metadata record for AI systems. */
  getMetadata(): ReturnType<MetadataManager['get']> {
    return this.metaManager.get();
  }

  /** All annotations grouped by prefix. */
  getAnnotationsByPrefix(): Record<string, AnnotationEntry[]> {
    const result: Record<string, AnnotationEntry[]> = {};
    for (const entry of this.annoFramework.list()) {
      if (!result[entry.prefix]) result[entry.prefix] = [];
      result[entry.prefix].push(entry);
    }
    return result;
  }
}
