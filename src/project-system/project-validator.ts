/**
 * Project System — Project Validator
 *
 * Validates the complete project state: duplicate references, duplicate UUIDs,
 * missing documents, broken hierarchy, missing assets, invalid settings,
 * orphan dependencies, and circular dependencies.
 */

import { ProjectValidationIssue, ProjectSystemSnapshot } from './types';
import { AnnotationFramework } from './annotation-framework';
import { DependencyGraph } from './dependency-graph';
import { DocumentRegistry } from './document-registry';
import { AssetManager } from './asset-manager';

export class ProjectValidator {
  validate(
    snapshot: ProjectSystemSnapshot,
    annoFramework: AnnotationFramework,
    depGraph: DependencyGraph,
    docRegistry: DocumentRegistry,
    assetManager: AssetManager
  ): ProjectValidationIssue[] {
    const issues: ProjectValidationIssue[] = [];

    // 1. Duplicate annotation references
    const conflicts = annoFramework.detectConflicts();
    for (const c of conflicts) {
      issues.push({
        type: 'duplicate-reference',
        severity: 'error',
        message: `Duplicate annotation reference '${c.reference}' is used by ${c.ids.length} objects`,
        targetId: c.reference,
      });
    }

    // 2. Duplicate UUIDs across metadata, documents, and assets
    const seenUUIDs = new Set<string>();
    seenUUIDs.add(snapshot.metadata.uuid);

    for (const doc of snapshot.documents) {
      if (seenUUIDs.has(doc.id)) {
        issues.push({
          type: 'duplicate-uuid',
          severity: 'error',
          message: `Duplicate UUID '${doc.id}' found in document registry`,
          targetId: doc.id,
        });
      }
      seenUUIDs.add(doc.id);
    }

    for (const asset of snapshot.assets) {
      if (seenUUIDs.has(asset.id)) {
        issues.push({
          type: 'duplicate-uuid',
          severity: 'error',
          message: `Duplicate UUID '${asset.id}' found in asset registry`,
          targetId: asset.id,
        });
      }
      seenUUIDs.add(asset.id);
    }

    // 3. Missing documents referenced by hierarchy dependencies
    for (const dep of snapshot.dependencies) {
      if ((dep.kind === 'sheet-ref' || dep.kind === 'hierarchy') && dep.targetId) {
        if (!docRegistry.get(dep.targetId)) {
          issues.push({
            type: 'missing-document',
            severity: 'error',
            message: `Dependency '${dep.kind}' references missing document '${dep.targetId}'`,
            targetId: dep.targetId,
          });
        }
      }
    }

    // 4. Broken hierarchy: hierarchical-sheet documents referencing unknown pages
    for (const doc of snapshot.documents) {
      if (doc.kind === 'hierarchical-sheet' && doc.pageId) {
        // Validate that the pageId is tracked — we can only check against deps or known IDs
        const hasMatchingDep = snapshot.dependencies.some(
          d => d.kind === 'hierarchy' && d.targetId === doc.id
        );
        if (!hasMatchingDep && snapshot.documents.filter(d => d.kind === 'hierarchical-sheet').length > 1) {
          issues.push({
            type: 'broken-hierarchy',
            severity: 'warning',
            message: `Hierarchical sheet '${doc.title}' (${doc.id}) has no parent hierarchy dependency`,
            targetId: doc.id,
          });
        }
      }
    }

    // 5. Missing assets referenced by asset dependencies
    for (const dep of snapshot.dependencies) {
      if (dep.kind === 'asset-dep' && dep.targetId) {
        if (!assetManager.get(dep.targetId)) {
          issues.push({
            type: 'missing-asset',
            severity: 'warning',
            message: `Asset dependency references missing asset '${dep.targetId}'`,
            targetId: dep.targetId,
          });
        }
      }
    }

    // 6. Invalid settings
    const settingsErrors = this.validateSettings(snapshot);
    for (const err of settingsErrors) {
      issues.push({ type: 'invalid-settings', severity: 'warning', message: err });
    }

    // 7. Orphan and circular dependencies via dep graph
    const knownIds = new Set<string>([
      snapshot.metadata.uuid,
      ...snapshot.documents.map(d => d.id),
      ...snapshot.assets.map(a => a.id),
    ]);
    const depDiags = depGraph.analyze(knownIds);
    for (const d of depDiags) {
      let type: ProjectValidationIssue['type'];
      if (d.type === 'circular') type = 'circular-dependency';
      else if (d.type === 'orphan') type = 'orphan-dependency';
      else type = 'missing-document';

      issues.push({
        type,
        severity: d.severity,
        message: d.message,
        targetId: d.involvedIds[0],
      });
    }

    return issues;
  }

  private validateSettings(snapshot: ProjectSystemSnapshot): string[] {
    const errors: string[] = [];
    const s = snapshot.settings;
    if (!s) return errors;
    if (s.grid?.size <= 0) errors.push('Grid size must be positive');
    if (s.pageDefaults?.width <= 0) errors.push('Page width must be positive');
    if (s.pageDefaults?.height <= 0) errors.push('Page height must be positive');
    if (s.snap?.threshold < 0) errors.push('Snap threshold must be non-negative');
    return errors;
  }
}
