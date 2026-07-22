/**
 * Project System — Explorer Adapter
 *
 * Builds a structured tree for the Project Explorer panel,
 * showing documents, assets, dependencies, and project info.
 */

import { DocumentRegistry } from './document-registry';
import { AssetManager } from './asset-manager';
import { DependencyGraph } from './dependency-graph';
import { MetadataManager } from './metadata-manager';

export interface ProjectExplorerNode {
  id: string;
  label: string;
  type:
    | 'project-info'
    | 'documents-folder'
    | 'document'
    | 'assets-folder'
    | 'asset'
    | 'dependencies-folder'
    | 'dependency'
    | 'drc-folder'
    | 'drc-violation'
    | 'manufacturing-folder'
    | 'manufacturing-output';
  icon: string;
  children: ProjectExplorerNode[];
  meta?: Record<string, any>;
}

const DOCUMENT_ICONS: Record<string, string> = {
  schematic: '⚡',
  'hierarchical-sheet': '📑',
  pcb: '🔲',
  simulation: '📈',
  bom: '📋',
  unknown: '📄',
};

const ASSET_ICONS: Record<string, string> = {
  image: '🖼️',
  logo: '🏷️',
  pdf: '📑',
  'datasheet-ref': '📄',
  'custom-symbol': '🔧',
  resource: '📎',
};

export class ProjectExplorerAdapter {
  buildProjectTree(
    metaManager: MetadataManager,
    docRegistry: DocumentRegistry,
    assetManager: AssetManager,
    depGraph: DependencyGraph,
    violations: any[] = [],
    manufacturingOutputs?: { name: string; kind: string; size?: number }[]
  ): ProjectExplorerNode {
    const meta = metaManager.get();

    const root: ProjectExplorerNode = {
      id: meta.uuid,
      label: meta.name || 'Untitled Project',
      type: 'project-info',
      icon: '📂',
      children: [],
      meta: {
        version: meta.version,
        revision: meta.revision,
        status: meta.status,
        author: meta.author,
        company: meta.company,
        description: meta.description,
        modifiedAt: meta.modifiedAt,
      },
    };

    // Documents folder
    const docs = docRegistry.list();
    if (docs.length > 0) {
      const docsFolder: ProjectExplorerNode = {
        id: 'folder-project-documents',
        label: `Documents (${docs.length})`,
        type: 'documents-folder',
        icon: '📁',
        children: docs.map(d => ({
          id: d.id,
          label: d.title,
          type: 'document' as const,
          icon: DOCUMENT_ICONS[d.kind] ?? '📄',
          children: [],
          meta: {
            kind: d.kind,
            state: d.state,
            dirty: d.dirty,
            readonly: d.readonly,
            version: d.version,
            path: d.path,
          },
        })),
      };
      root.children.push(docsFolder);
    }

    // Assets folder
    const assets = assetManager.list();
    if (assets.length > 0) {
      const assetsFolder: ProjectExplorerNode = {
        id: 'folder-project-assets',
        label: `Assets (${assets.length})`,
        type: 'assets-folder',
        icon: '🖼️',
        children: assets.map(a => ({
          id: a.id,
          label: a.name,
          type: 'asset' as const,
          icon: ASSET_ICONS[a.kind] ?? '📎',
          children: [],
          meta: {
            kind: a.kind,
            path: a.path,
            mimeType: a.mimeType,
            fileSize: a.fileSize,
          },
        })),
      };
      root.children.push(assetsFolder);
    }

    // Dependencies folder
    const deps = depGraph.list();
    if (deps.length > 0) {
      const depsFolder: ProjectExplorerNode = {
        id: 'folder-project-dependencies',
        label: `Dependencies (${deps.length})`,
        type: 'dependencies-folder',
        icon: '🔗',
        children: deps.map(d => ({
          id: d.id,
          label: d.label ?? `${d.kind}: ${d.sourceId} → ${d.targetId}`,
          type: 'dependency' as const,
          icon: d.resolved ? '✅' : '❌',
          children: [],
          meta: { kind: d.kind, resolved: d.resolved, sourceId: d.sourceId, targetId: d.targetId },
        })),
      };
      root.children.push(depsFolder);
    }

    // DRC Violations
    if (violations.length > 0) {
      const drcFolder: ProjectExplorerNode = {
        id: 'folder-project-drc',
        label: `DRC Violations (${violations.length})`,
        type: 'drc-folder',
        icon: '⚠️',
        children: violations.map(v => ({
          id: v.id,
          label: `[${v.category}] ${v.message}`,
          type: 'drc-violation' as const,
          icon: v.severity === 'error' ? '🛑' : '⚠️',
          children: [],
          meta: {
            category: v.category,
            severity: v.severity,
            ruleId: v.ruleId,
            location: v.location,
            relatedObjectIds: v.relatedObjectIds
          }
        }))
      };
      root.children.push(drcFolder);
    }

    // Manufacturing Outputs
    if (manufacturingOutputs && manufacturingOutputs.length > 0) {
      const mfgFolder: ProjectExplorerNode = {
        id: 'folder-project-manufacturing',
        label: `Manufacturing Outputs (${manufacturingOutputs.length})`,
        type: 'manufacturing-folder',
        icon: '🏭',
        children: manufacturingOutputs.map(o => ({
          id: `mfg-${o.name}`,
          label: o.name,
          type: 'manufacturing-output' as const,
          icon: o.kind === 'gerber' ? '📐' : o.kind === 'drill' ? '🕳️' : '📋',
          children: [],
          meta: {
            kind: o.kind,
            size: o.size
          }
        }))
      };
      root.children.push(mfgFolder);
    }

    return root;
  }
}
