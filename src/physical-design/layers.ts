/**
 * Physical Design Platform — Layer System
 * PART 2: Complete layer infrastructure
 */

import { generateUUID } from '../utils';
import {
  PhysicalLayer,
  LayerKind,
  LayerSide,
  LayerPreset,
  LayerPresetName,
  LayerGroup,
} from './types';

// ── Standard Layer Definitions ────────────────────────────────────────────────

interface LayerDef {
  name: string;
  kind: LayerKind;
  side: LayerSide;
  color: string;
  order: number;
}

const STANDARD_LAYER_DEFS: LayerDef[] = [
  // Copper layers
  { name: 'F.Cu',       kind: 'copper',       side: 'front', color: '#B5121B', order: 0 },
  { name: 'In1.Cu',     kind: 'copper',       side: 'inner', color: '#CF7836', order: 1 },
  { name: 'In2.Cu',     kind: 'copper',       side: 'inner', color: '#CF7836', order: 2 },
  { name: 'In3.Cu',     kind: 'copper',       side: 'inner', color: '#CF7836', order: 3 },
  { name: 'In4.Cu',     kind: 'copper',       side: 'inner', color: '#CF7836', order: 4 },
  { name: 'B.Cu',       kind: 'copper',       side: 'back',  color: '#4040C2', order: 31 },
  // Silkscreen
  { name: 'F.SilkS',   kind: 'silkscreen',   side: 'front', color: '#E8E800', order: 37 },
  { name: 'B.SilkS',   kind: 'silkscreen',   side: 'back',  color: '#14FAFA', order: 38 },
  // Solder mask
  { name: 'F.Mask',    kind: 'solder-mask',  side: 'front', color: '#BC0000CC', order: 35 },
  { name: 'B.Mask',    kind: 'solder-mask',  side: 'back',  color: '#BC0000CC', order: 36 },
  // Paste
  { name: 'F.Paste',   kind: 'solder-paste', side: 'front', color: '#9D9D9DAA', order: 33 },
  { name: 'B.Paste',   kind: 'solder-paste', side: 'back',  color: '#9D9D9DAA', order: 34 },
  // Courtyard
  { name: 'F.CrtYd',  kind: 'courtyard',    side: 'front', color: '#FF26E2', order: 49 },
  { name: 'B.CrtYd',  kind: 'courtyard',    side: 'back',  color: '#FF26E2', order: 50 },
  // Assembly
  { name: 'F.Fab',    kind: 'assembly',     side: 'front', color: '#808080', order: 51 },
  { name: 'B.Fab',    kind: 'assembly',     side: 'back',  color: '#808080', order: 52 },
  // Mechanical
  { name: 'Edge.Cuts', kind: 'mechanical',  side: 'both',  color: '#FFFF00', order: 44 },
  { name: 'Margin',    kind: 'mechanical',  side: 'both',  color: '#D357D3', order: 45 },
  // Documentation
  { name: 'Cmts.User', kind: 'documentation', side: 'both', color: '#7AC0FF', order: 47 },
  { name: 'Eco1.User', kind: 'user',          side: 'both', color: '#72786C', order: 39 },
  { name: 'Eco2.User', kind: 'user',          side: 'both', color: '#389B38', order: 40 },
  { name: 'Dwgs.User', kind: 'documentation', side: 'both', color: '#0364D3', order: 48 },
  // Keepout is virtual (per-object flag), but provide a reference layer
  { name: 'B.Courtyard', kind: 'courtyard', side: 'back', color: '#FF26E2', order: 50 },
];

export function createDefaultLayers(): PhysicalLayer[] {
  // De-duplicate names
  const seen = new Set<string>();
  return STANDARD_LAYER_DEFS
    .filter((def) => {
      if (seen.has(def.name)) return false;
      seen.add(def.name);
      return true;
    })
    .map((def) => ({
      id: generateUUID(),
      name: def.name,
      kind: def.kind,
      side: def.side,
      color: def.color,
      opacity: 1.0,
      visible: true,
      locked: false,
      order: def.order,
    }));
}

// ── Layer Manager ─────────────────────────────────────────────────────────────

export class LayerManager {
  private layers: Map<string, PhysicalLayer> = new Map();
  private groups: Map<string, LayerGroup> = new Map();
  private presets: Map<LayerPresetName, LayerPreset> = new Map();

  constructor(layers: PhysicalLayer[] = [], groups: LayerGroup[] = [], presets: LayerPreset[] = []) {
    for (const layer of layers) this.layers.set(layer.id, layer);
    for (const group of groups) this.groups.set(group.id, group);
    for (const preset of presets) this.presets.set(preset.name, preset);
  }

  // ── Layer CRUD ──────────────────────────────────────────────────────────────

  addLayer(layer: PhysicalLayer): void {
    if (this.layers.has(layer.id)) {
      throw new Error(`Layer ID collision: ${layer.id}`);
    }
    this.layers.set(layer.id, layer);
  }

  createLayer(params: Partial<PhysicalLayer> & { name: string; kind: LayerKind; side: LayerSide }): PhysicalLayer {
    const layer: PhysicalLayer = {
      id: generateUUID(),
      color: '#808080',
      opacity: 1.0,
      visible: true,
      locked: false,
      order: this.layers.size,
      ...params,
    };
    this.layers.set(layer.id, layer);
    return layer;
  }

  getLayer(id: string): PhysicalLayer | undefined {
    return this.layers.get(id);
  }

  getLayerByName(name: string): PhysicalLayer | undefined {
    for (const layer of this.layers.values()) {
      if (layer.name === name) return layer;
    }
    return undefined;
  }

  updateLayer(id: string, updates: Partial<Omit<PhysicalLayer, 'id'>>): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;
    Object.assign(layer, updates);
    return true;
  }

  removeLayer(id: string): boolean {
    // Remove from groups
    for (const group of this.groups.values()) {
      const idx = group.layerIds.indexOf(id);
      if (idx !== -1) group.layerIds.splice(idx, 1);
    }
    // Remove from presets
    for (const preset of this.presets.values()) {
      const idx = preset.visibleLayerIds.indexOf(id);
      if (idx !== -1) preset.visibleLayerIds.splice(idx, 1);
    }
    return this.layers.delete(id);
  }

  getAllLayers(): PhysicalLayer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.order - b.order);
  }

  getLayersByKind(kind: LayerKind): PhysicalLayer[] {
    return this.getAllLayers().filter((l) => l.kind === kind);
  }

  getVisibleLayers(): PhysicalLayer[] {
    return this.getAllLayers().filter((l) => l.visible);
  }

  // ── Visibility & Locking ────────────────────────────────────────────────────

  setVisible(id: string, visible: boolean): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;
    layer.visible = visible;
    return true;
  }

  setLocked(id: string, locked: boolean): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;
    layer.locked = locked;
    return true;
  }

  setColor(id: string, color: string): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;
    layer.color = color;
    return true;
  }

  setOpacity(id: string, opacity: number): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;
    layer.opacity = Math.max(0, Math.min(1, opacity));
    return true;
  }

  // ── Ordering ────────────────────────────────────────────────────────────────

  reorder(layerIds: string[]): void {
    layerIds.forEach((id, index) => {
      const layer = this.layers.get(id);
      if (layer) layer.order = index;
    });
  }

  moveLayerUp(id: string): boolean {
    const sorted = this.getAllLayers();
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx <= 0) return false;
    const prev = sorted[idx - 1];
    const curr = sorted[idx];
    const tmp = curr.order;
    curr.order = prev.order;
    prev.order = tmp;
    return true;
  }

  moveLayerDown(id: string): boolean {
    const sorted = this.getAllLayers();
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx < 0 || idx >= sorted.length - 1) return false;
    const next = sorted[idx + 1];
    const curr = sorted[idx];
    const tmp = curr.order;
    curr.order = next.order;
    next.order = tmp;
    return true;
  }

  // ── Groups ──────────────────────────────────────────────────────────────────

  createGroup(name: string, layerIds: string[]): LayerGroup {
    const group: LayerGroup = {
      id: generateUUID(),
      name,
      visible: true,
      collapsed: false,
      layerIds: [...layerIds],
    };
    this.groups.set(group.id, group);
    return group;
  }

  getGroup(id: string): LayerGroup | undefined {
    return this.groups.get(id);
  }

  updateGroup(id: string, updates: Partial<Omit<LayerGroup, 'id'>>): boolean {
    const group = this.groups.get(id);
    if (!group) return false;
    Object.assign(group, updates);
    return true;
  }

  removeGroup(id: string): boolean {
    return this.groups.delete(id);
  }

  setGroupVisible(id: string, visible: boolean): void {
    const group = this.groups.get(id);
    if (!group) return;
    group.visible = visible;
    for (const layerId of group.layerIds) {
      this.setVisible(layerId, visible);
    }
  }

  getAllGroups(): LayerGroup[] {
    return Array.from(this.groups.values());
  }

  // ── Presets ─────────────────────────────────────────────────────────────────

  addPreset(preset: LayerPreset): void {
    this.presets.set(preset.name, preset);
  }

  applyPreset(name: LayerPresetName): boolean {
    const preset = this.presets.get(name);
    if (!preset) return false;
    const visibleSet = new Set(preset.visibleLayerIds);
    for (const layer of this.layers.values()) {
      layer.visible = visibleSet.has(layer.id);
    }
    return true;
  }

  capturePreset(name: LayerPresetName, description?: string): LayerPreset {
    const visibleLayerIds = Array.from(this.layers.values())
      .filter((l) => l.visible)
      .map((l) => l.id);
    const preset: LayerPreset = { name, visibleLayerIds, description };
    this.presets.set(name, preset);
    return preset;
  }

  getPreset(name: LayerPresetName): LayerPreset | undefined {
    return this.presets.get(name);
  }

  getAllPresets(): LayerPreset[] {
    return Array.from(this.presets.values());
  }

  removePreset(name: LayerPresetName): boolean {
    return this.presets.delete(name);
  }

  // ── Serialization ────────────────────────────────────────────────────────────

  serialize(): { layers: PhysicalLayer[]; groups: LayerGroup[]; presets: LayerPreset[] } {
    return {
      layers: this.getAllLayers(),
      groups: this.getAllGroups(),
      presets: this.getAllPresets(),
    };
  }

  static deserialize(data: { layers: PhysicalLayer[]; groups: LayerGroup[]; presets: LayerPreset[] }): LayerManager {
    return new LayerManager(data.layers, data.groups, data.presets);
  }
}
