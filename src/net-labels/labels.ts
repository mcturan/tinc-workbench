import { NetLabel, GlobalSignal, LabelScope } from './types';

const labels = new Map<string, NetLabel>();

export function createLabel(
  id: string,
  name: string,
  scope: LabelScope,
  position: { x: number; y: number },
  targetObjectId: string,
  targetPinId: string,
  metadata?: Record<string, any>
): NetLabel {
  if (labels.has(id)) {
    throw new Error(`Label ${id} already exists`);
  }
  const label: NetLabel = {
    id,
    name,
    scope,
    position,
    targetObjectId,
    targetPinId,
    metadata,
  };
  labels.set(id, label);
  return label;
}

export function deleteLabel(id: string): void {
  labels.delete(id);
}

export function renameLabel(id: string, newName: string): void {
  const label = labels.get(id);
  if (label) {
    label.name = newName;
  }
}

export function listLabels(): NetLabel[] {
  return Array.from(labels.values());
}

export function getLabel(id: string): NetLabel | undefined {
  return labels.get(id);
}

export function clearLabels(): void {
  labels.clear();
}

export function listSignals(): GlobalSignal[] {
  const signalsMap = new Map<string, GlobalSignal>();
  const allLabels = listLabels();

  for (const label of allLabels) {
    const key = `${label.scope}:${label.name}`;
    if (!signalsMap.has(key)) {
      signalsMap.set(key, {
        name: label.name,
        scope: label.scope,
        labels: [],
        metadata: {},
      });
    }
    signalsMap.get(key)!.labels.push(label.id);
  }

  return Array.from(signalsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getSignal(name: string): GlobalSignal | undefined {
  return listSignals().find(s => s.name === name);
}
