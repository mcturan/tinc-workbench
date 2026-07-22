/**
 * Project System — Project Persistence
 *
 * Serializes and deserializes the complete ProjectSystemSnapshot.
 * Delegates to individual managers for restore.
 */

import { ProjectSystemSnapshot } from './types';
import { MetadataManager } from './metadata-manager';
import { SettingsManager } from './settings-manager';
import { DocumentRegistry } from './document-registry';
import { AssetManager } from './asset-manager';
import { DependencyGraph } from './dependency-graph';
import { AnnotationFramework } from './annotation-framework';

export class ProjectPersistence {
  /** Take a full snapshot of all subsystem state. */
  snapshot(
    meta: MetadataManager,
    settings: SettingsManager,
    docRegistry: DocumentRegistry,
    assetManager: AssetManager,
    depGraph: DependencyGraph,
    annoFramework: AnnotationFramework
  ): ProjectSystemSnapshot {
    return {
      metadata: meta.get(),
      settings: settings.get(),
      documents: docRegistry.list(),
      assets: assetManager.list(),
      dependencies: depGraph.list(),
      annotations: annoFramework.list(),
    };
  }

  /** Restore all subsystem state from a snapshot. */
  restore(
    snap: ProjectSystemSnapshot,
    meta: MetadataManager,
    settings: SettingsManager,
    docRegistry: DocumentRegistry,
    assetManager: AssetManager,
    depGraph: DependencyGraph,
    annoFramework: AnnotationFramework
  ): void {
    meta.restore(snap.metadata);
    settings.restore(snap.settings);
    docRegistry.restore(snap.documents);
    assetManager.restore(snap.assets);
    depGraph.restore(snap.dependencies);
    annoFramework.restore(snap.annotations);
  }

  /** Serialize a snapshot to JSON string. */
  serializeSnapshot(snap: ProjectSystemSnapshot): string {
    return JSON.stringify(snap, null, 2);
  }

  /** Deserialize a snapshot from JSON string. */
  deserializeSnapshot(json: string): ProjectSystemSnapshot {
    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch (e: any) {
      throw new Error(`Failed to parse project snapshot JSON: ${e.message}`);
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid project snapshot: not an object');
    }
    if (!parsed.metadata) {
      throw new Error('Invalid project snapshot: missing metadata section');
    }
    if (!parsed.settings) {
      throw new Error('Invalid project snapshot: missing settings section');
    }
    return {
      metadata: parsed.metadata,
      settings: parsed.settings,
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
      dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
      annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
    };
  }
}
