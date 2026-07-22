/**
 * Physical Design Platform — Board Stackup
 * PART 3: Layer Stack, copper thickness, dielectric, material, board thickness
 */

import { generateUUID } from '../utils';
import { BoardStackup, PhysicalLayer, StackupLayer, StackupMaterialType } from './types';

// ── Default Stackup Factory ───────────────────────────────────────────────────

export function createDefaultStackup(layers: PhysicalLayer[]): BoardStackup {
  const frontCopper = layers.find((l) => l.name === 'F.Cu');
  const backCopper = layers.find((l) => l.name === 'B.Cu');
  const innerCopperLayers = layers.filter(
    (l) => l.kind === 'copper' && l.side === 'inner'
  );

  const stackupLayers: StackupLayer[] = [];

  // Surface finish (front)
  stackupLayers.push({
    id: generateUUID(),
    name: 'F.SoldMask',
    materialType: 'soldermask',
    thicknessUm: 25,
    material: 'Solder Mask',
  });

  // Front copper
  if (frontCopper) {
    stackupLayers.push({
      id: generateUUID(),
      name: 'F.Cu',
      materialType: 'copper',
      thicknessUm: 35,
      material: 'Copper',
      copperWeight: 1,
      layerId: frontCopper.id,
    });
  }

  // Core + inner layers
  if (innerCopperLayers.length === 0) {
    // Simple 2-layer board: single core
    stackupLayers.push({
      id: generateUUID(),
      name: 'Core',
      materialType: 'core',
      thicknessUm: 1600,
      material: 'FR4',
      dielectricConstant: 4.5,
      lossTangent: 0.02,
    });
  } else {
    // Multi-layer: alternate prepreg/core
    for (let i = 0; i < innerCopperLayers.length; i++) {
      stackupLayers.push({
        id: generateUUID(),
        name: i === 0 ? 'Prepreg' : 'Core',
        materialType: i === 0 ? 'prepreg' : 'core',
        thicknessUm: 200,
        material: 'FR4',
        dielectricConstant: 4.5,
        lossTangent: 0.02,
      });
      stackupLayers.push({
        id: generateUUID(),
        name: innerCopperLayers[i].name,
        materialType: 'copper',
        thicknessUm: 35,
        material: 'Copper',
        copperWeight: 0.5,
        layerId: innerCopperLayers[i].id,
      });
    }
    stackupLayers.push({
      id: generateUUID(),
      name: 'Prepreg',
      materialType: 'prepreg',
      thicknessUm: 200,
      material: 'FR4',
      dielectricConstant: 4.5,
      lossTangent: 0.02,
    });
  }

  // Back copper
  if (backCopper) {
    stackupLayers.push({
      id: generateUUID(),
      name: 'B.Cu',
      materialType: 'copper',
      thicknessUm: 35,
      material: 'Copper',
      copperWeight: 1,
      layerId: backCopper.id,
    });
  }

  // Surface finish (back)
  stackupLayers.push({
    id: generateUUID(),
    name: 'B.SoldMask',
    materialType: 'soldermask',
    thicknessUm: 25,
    material: 'Solder Mask',
  });

  const copperCount =
    (frontCopper ? 1 : 0) + innerCopperLayers.length + (backCopper ? 1 : 0);
  const totalThickness = stackupLayers.reduce((sum, l) => sum + l.thicknessUm, 0);

  return {
    id: generateUUID(),
    copperLayers: copperCount,
    layers: stackupLayers,
    totalThicknessUm: totalThickness,
    finishType: 'HASL',
    surfaceFinish: 'HASL (lead-free)',
    ipcClass: '2',
    metadata: {},
  };
}

// ── Stackup Manager ───────────────────────────────────────────────────────────

export class StackupManager {
  constructor(private stackup: BoardStackup) {}

  getStackup(): BoardStackup {
    return this.stackup;
  }

  getTotalThicknessUm(): number {
    return this.stackup.layers.reduce((sum, l) => sum + l.thicknessUm, 0);
  }

  getTotalThicknessMm(): number {
    return this.getTotalThicknessUm() / 1000;
  }

  getCopperLayerCount(): number {
    return this.stackup.copperLayers;
  }

  getLayerByName(name: string): StackupLayer | undefined {
    return this.stackup.layers.find((l) => l.name === name);
  }

  addLayer(layer: StackupLayer): void {
    this.stackup.layers.push(layer);
    this.updateTotals();
  }

  removeLayer(id: string): boolean {
    const idx = this.stackup.layers.findIndex((l) => l.id === id);
    if (idx === -1) return false;
    this.stackup.layers.splice(idx, 1);
    this.updateTotals();
    return true;
  }

  updateLayerThickness(id: string, thicknessUm: number): boolean {
    const layer = this.stackup.layers.find((l) => l.id === id);
    if (!layer) return false;
    layer.thicknessUm = thicknessUm;
    this.updateTotals();
    return true;
  }

  updateLayerMaterial(id: string, material: string, dielectricConstant?: number, lossTangent?: number): boolean {
    const layer = this.stackup.layers.find((l) => l.id === id);
    if (!layer) return false;
    layer.material = material;
    if (dielectricConstant !== undefined) layer.dielectricConstant = dielectricConstant;
    if (lossTangent !== undefined) layer.lossTangent = lossTangent;
    return true;
  }

  setCopperWeight(layerId: string, ozPerSqFt: number): boolean {
    const layer = this.stackup.layers.find((l) => l.id === layerId);
    if (!layer || layer.materialType !== 'copper') return false;
    layer.copperWeight = ozPerSqFt;
    // 1 oz/ft² ≈ 35 µm
    layer.thicknessUm = Math.round(ozPerSqFt * 35);
    this.updateTotals();
    return true;
  }

  setIpcClass(cls: '1' | '2' | '3'): void {
    this.stackup.ipcClass = cls;
  }

  setSurfaceFinish(finish: string): void {
    this.stackup.surfaceFinish = finish;
    this.stackup.finishType = finish.split(' ')[0];
  }

  /** Future impedance metadata: store computed target impedance per copper layer */
  setImpedanceMetadata(layerId: string, impedanceOhm: number): void {
    if (!this.stackup.metadata) this.stackup.metadata = {};
    this.stackup.metadata[`impedance_${layerId}`] = impedanceOhm;
  }

  getImpedanceMetadata(layerId: string): number | undefined {
    return this.stackup.metadata?.[`impedance_${layerId}`] as number | undefined;
  }

  private updateTotals(): void {
    this.stackup.totalThicknessUm = this.stackup.layers.reduce((s, l) => s + l.thicknessUm, 0);
    this.stackup.copperLayers = this.stackup.layers.filter((l) => l.materialType === 'copper').length;
  }

  serialize(): BoardStackup {
    return JSON.parse(JSON.stringify(this.stackup));
  }

  static deserialize(data: BoardStackup): StackupManager {
    return new StackupManager(data);
  }
}
