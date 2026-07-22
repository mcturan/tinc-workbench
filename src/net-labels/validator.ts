import { listLabels } from './labels';
import { getComponentByPath } from '../hierarchy/instance';
import { ERCDiagnostic } from '../erc/types';
import { ObjectEngine } from '../object-engine';
import { resolveHierarchy } from '../hierarchy';

export function validateSignals(objectEngine: ObjectEngine): ERCDiagnostic[] {
  const diagnostics: ERCDiagnostic[] = [];
  const allLabels = listLabels();

  for (const label of allLabels) {
    if (!label.name || label.name.trim() === '') {
      diagnostics.push({
        id: `LABEL-EMPTY-${label.id}`,
        severity: 'Error',
        category: 'Connectivity',
        title: 'Empty Net Label',
        description: `Net label '${label.id}' name cannot be empty.`,
        affectedObjects: [label.id],
        affectedNets: [],
        suggestedFix: 'Rename the label to a valid name.',
      });
      continue;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(label.name)) {
      diagnostics.push({
        id: `LABEL-ILLEGAL-CHARS-${label.id}`,
        severity: 'Error',
        category: 'Connectivity',
        title: 'Illegal Label Characters',
        description: `Net label '${label.name}' contains illegal characters. Only alphanumeric and underscores are allowed.`,
        affectedObjects: [label.id],
        affectedNets: [],
        suggestedFix: 'Use only alphanumeric characters and underscores.',
      });
    }

    const comp = getComponentByPath(objectEngine, label.targetObjectId);
    if (!comp) {
      diagnostics.push({
        id: `LABEL-ORPHAN-${label.id}`,
        severity: 'Warning',
        category: 'Connectivity',
        title: 'Orphan Net Label',
        description: `Net label '${label.name}' targets a non-existent component: ${label.targetObjectId}`,
        affectedObjects: [label.id],
        affectedNets: [],
        suggestedFix: 'Attach the label to an existing component pin.',
      });
    } else {
      const pinExists = (comp.ports || []).some(p => p.id === label.targetPinId) ||
                        (comp.pins || []).some(p => p.id === label.targetPinId);
      if (!pinExists) {
        diagnostics.push({
          id: `LABEL-UNRESOLVED-REF-${label.id}`,
          severity: 'Warning',
          category: 'Connectivity',
          title: 'Unresolved Pin Reference',
          description: `Net label '${label.name}' targets a non-existent pin '${label.targetPinId}' on component '${label.targetObjectId}'.`,
          affectedObjects: [label.id],
          affectedNets: [],
          suggestedFix: 'Attach the label to a valid pin of the component.',
        });
      }
    }
  }

  const globalNames = new Map<string, Set<string>>();
  for (const label of allLabels) {
    if (!globalNames.has(label.name)) {
      globalNames.set(label.name, new Set());
    }
    globalNames.get(label.name)!.add(label.scope);
  }
  for (const [name, scopes] of globalNames.entries()) {
    if (scopes.size > 1) {
      diagnostics.push({
        id: `LABEL-SCOPE-CONFLICT-${name}`,
        severity: 'Error',
        category: 'Connectivity',
        title: 'Duplicate Global Name Type Mismatch',
        description: `Global signal '${name}' is defined with incompatible scopes: ${Array.from(scopes).join(', ')}.`,
        affectedObjects: allLabels.filter(l => l.name === name).map(l => l.id),
        affectedNets: [],
        suggestedFix: 'Use the same scope (Global, Power, or Ground) for labels sharing the same name.',
      });
    }
  }

  const graph = resolveHierarchy(objectEngine);
  const nets = graph.listNets();
  for (const net of nets) {
    const powerLabelsInNet = new Set<string>();
    const affectedLabelIds: string[] = [];

    for (const pinRef of net.pins) {
      const matchedLabels = allLabels.filter(l => l.targetObjectId === pinRef.componentId && l.targetPinId === pinRef.pinId);
      for (const l of matchedLabels) {
        if (l.scope === 'Power') {
          powerLabelsInNet.add(l.name);
          affectedLabelIds.push(l.id);
        }
      }
    }

    if (powerLabelsInNet.size > 1) {
      diagnostics.push({
        id: `LABEL-PWR-CONFLICT-${net.id}`,
        severity: 'Error',
        category: 'Power',
        title: 'Conflicting Power Labels',
        description: `Net '${net.name}' contains conflicting power labels: ${Array.from(powerLabelsInNet).join(', ')}.`,
        affectedObjects: affectedLabelIds,
        affectedNets: [net.id],
        suggestedFix: 'Remove conflicting power labels from the same net.',
      });
    }
  }

  return diagnostics.sort((a, b) => a.id.localeCompare(b.id));
}
