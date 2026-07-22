/**
 * Physical Design Platform — Board Document Manager
 * PART 1: Physical Document Model
 */

import { generateUUID } from '../utils';
import {
  BoardDocument,
  BoardOrigin,
  BoardStackup,
  FootprintInstance,
  LayerGroup,
  LayerPreset,
  NetClassRule,
  PhysicalGrid,
  PhysicalLayer,
  PhysicalObject,
  PhysicalRule,
  UnitSystem,
  PhysicalBBox,
  GraphicObject,
  bboxUnion,
} from './types';
import { createDefaultLayers } from './layers';
import { createDefaultStackup } from './stackup';

// ── Default Unit System ───────────────────────────────────────────────────────

export function createDefaultUnitSystem(): UnitSystem {
  return {
    primary: 'mm',
    display: 'mm',
    precision: 4,
    internalUnit: 'nm',
  };
}

// ── Default Board Origin ──────────────────────────────────────────────────────

export function createDefaultOrigin(): BoardOrigin {
  return { x: 0, y: 0 };
}

// ── Board Document Factory ────────────────────────────────────────────────────

export interface CreateBoardOptions {
  name?: string;
  description?: string;
  uuid?: string;
}

export function createBoardDocument(options: CreateBoardOptions = {}): BoardDocument {
  const now = new Date().toISOString();
  const layers = createDefaultLayers();
  const frontCopper = layers.find((l) => l.name === 'F.Cu');

  return {
    id: generateUUID(),
    uuid: options.uuid ?? generateUUID(),
    name: options.name ?? 'Untitled Board',
    description: options.description,
    origin: createDefaultOrigin(),
    unitSystem: createDefaultUnitSystem(),
    stackup: createDefaultStackup(layers),
    layers,
    layerGroups: createDefaultLayerGroups(layers),
    layerPresets: createDefaultLayerPresets(layers),
    activeLayerId: frontCopper?.id ?? (layers[0]?.id ?? ''),
    rules: [],
    netClasses: [],
    objects: [],
    footprints: [],
    boardOutline: [],
    createdAt: now,
    modifiedAt: now,
    metadata: {},
  };
}

// ── Default Layer Groups ──────────────────────────────────────────────────────

function createDefaultLayerGroups(layers: PhysicalLayer[]): LayerGroup[] {
  const copperIds = layers.filter((l) => l.kind === 'copper').map((l) => l.id);
  const silkIds = layers.filter((l) => l.kind === 'silkscreen').map((l) => l.id);
  const maskIds = layers.filter((l) => l.kind === 'solder-mask').map((l) => l.id);
  const mechIds = layers.filter((l) => l.kind === 'mechanical' || l.kind === 'courtyard' || l.kind === 'assembly').map((l) => l.id);
  const userIds = layers.filter((l) => l.kind === 'user').map((l) => l.id);

  const groups: LayerGroup[] = [];

  if (copperIds.length > 0) {
    groups.push({ id: generateUUID(), name: 'Copper', visible: true, collapsed: false, layerIds: copperIds });
  }
  if (silkIds.length > 0) {
    groups.push({ id: generateUUID(), name: 'Silkscreen', visible: true, collapsed: false, layerIds: silkIds });
  }
  if (maskIds.length > 0) {
    groups.push({ id: generateUUID(), name: 'Solder Mask', visible: true, collapsed: false, layerIds: maskIds });
  }
  if (mechIds.length > 0) {
    groups.push({ id: generateUUID(), name: 'Mechanical', visible: true, collapsed: false, layerIds: mechIds });
  }
  if (userIds.length > 0) {
    groups.push({ id: generateUUID(), name: 'User Layers', visible: true, collapsed: true, layerIds: userIds });
  }

  return groups;
}

// ── Default Layer Presets ─────────────────────────────────────────────────────

function createDefaultLayerPresets(layers: PhysicalLayer[]): LayerPreset[] {
  const allIds = layers.map((l) => l.id);
  const copperAndSilk = layers.filter((l) => l.kind === 'copper' || l.kind === 'silkscreen').map((l) => l.id);
  const fabLayers = layers.filter((l) =>
    l.kind === 'copper' || l.kind === 'silkscreen' || l.kind === 'solder-mask' || l.kind === 'solder-paste' || l.kind === 'courtyard'
  ).map((l) => l.id);

  return [
    { name: 'default', visibleLayerIds: allIds, description: 'All layers visible' },
    { name: 'minimal', visibleLayerIds: copperAndSilk, description: 'Copper and silk only' },
    { name: 'fabrication', visibleLayerIds: fabLayers, description: 'Fab layers' },
    { name: 'assembly', visibleLayerIds: layers.filter((l) => l.kind === 'assembly').map((l) => l.id), description: 'Assembly layers only' },
  ];
}

// ── Board Document Manager ────────────────────────────────────────────────────

export class BoardManager {
  private boards: Map<string, BoardDocument> = new Map();
  private activeBoard: BoardDocument | null = null;
  private footprintDefs: Map<string, any> = new Map();

  registerDefinition(def: any): void {
    this.footprintDefs.set(def.id, def);
  }

  getDefinition(id: string): any {
    return this.footprintDefs.get(id);
  }



  createBoard(options: CreateBoardOptions = {}): BoardDocument {
    const board = createBoardDocument(options);
    this.boards.set(board.id, board);
    if (!this.activeBoard) {
      this.activeBoard = board;
    }
    return board;
  }

  getBoard(id: string): BoardDocument | undefined {
    return this.boards.get(id);
  }

  getActiveBoard(): BoardDocument | null {
    return this.activeBoard;
  }

  setActiveBoard(id: string): boolean {
    const board = this.boards.get(id);
    if (!board) return false;
    this.activeBoard = board;
    return true;
  }

  deleteBoard(id: string): boolean {
    const existed = this.boards.delete(id);
    if (this.activeBoard?.id === id) {
      const remaining = Array.from(this.boards.values());
      this.activeBoard = remaining.length > 0 ? remaining[0] : null;
    }
    return existed;
  }

  listBoards(): BoardDocument[] {
    return Array.from(this.boards.values());
  }

  updateBoardMetadata(
    id: string,
    updates: Partial<Pick<BoardDocument, 'name' | 'description' | 'metadata'>>
  ): boolean {
    const board = this.boards.get(id);
    if (!board) return false;
    if (updates.name !== undefined) board.name = updates.name;
    if (updates.description !== undefined) board.description = updates.description;
    if (updates.metadata !== undefined) board.metadata = { ...board.metadata, ...updates.metadata };
    board.modifiedAt = new Date().toISOString();
    return true;
  }

  setOrigin(id: string, x: number, y: number): boolean {
    const board = this.boards.get(id);
    if (!board) return false;
    board.origin = { x, y };
    board.modifiedAt = new Date().toISOString();
    return true;
  }

  setUnitSystem(id: string, unit: UnitSystem): boolean {
    const board = this.boards.get(id);
    if (!board) return false;
    board.unitSystem = { ...unit };
    board.modifiedAt = new Date().toISOString();
    return true;
  }

  computeBoardBBox(id: string): PhysicalBBox | null {
    const board = this.boards.get(id);
    if (!board) return null;

    let result: PhysicalBBox | null = null;

    const expand = (bbox: PhysicalBBox) => {
      result = result ? bboxUnion(result, bbox) : { ...bbox };
    };

    for (const obj of board.objects) {
      if (obj.bbox) expand(obj.bbox);
    }
    for (const fp of board.footprints) {
      if (fp.bbox) expand(fp.bbox);
    }

    board.boardBBox = result ?? undefined;
    return result;
  }

  addObject(boardId: string, obj: PhysicalObject): void {
    const board = this.boards.get(boardId);
    if (!board) throw new Error(`Board ${boardId} not found`);
    board.objects.push(obj);
    board.modifiedAt = new Date().toISOString();
  }

  removeObject(boardId: string, objectId: string): boolean {
    const board = this.boards.get(boardId);
    if (!board) return false;
    const idx = board.objects.findIndex((o) => o.id === objectId);
    if (idx === -1) return false;
    board.objects.splice(idx, 1);
    board.modifiedAt = new Date().toISOString();
    return true;
  }

  addFootprint(boardId: string, fp: FootprintInstance): void {
    const board = this.boards.get(boardId);
    if (!board) throw new Error(`Board ${boardId} not found`);
    board.footprints.push(fp);
    board.modifiedAt = new Date().toISOString();
  }

  removeFootprint(boardId: string, footprintId: string): boolean {
    const board = this.boards.get(boardId);
    if (!board) return false;
    const idx = board.footprints.findIndex((f) => f.id === footprintId);
    if (idx === -1) return false;
    board.footprints.splice(idx, 1);
    board.modifiedAt = new Date().toISOString();
    return true;
  }

  setBoardOutline(boardId: string, outline: GraphicObject[]): void {
    const board = this.boards.get(boardId);
    if (!board) throw new Error(`Board ${boardId} not found`);
    board.boardOutline = outline;
    board.modifiedAt = new Date().toISOString();
  }

  serializeBoard(id: string): string {
    const board = this.boards.get(id);
    if (!board) throw new Error(`Board ${id} not found`);
    return JSON.stringify({ version: '1.0', boardDocument: board }, null, 2);
  }

  deserializeBoard(content: string): BoardDocument {
    const parsed = JSON.parse(content);
    if (!parsed.boardDocument) throw new Error('Invalid board snapshot: missing boardDocument');
    const board = parsed.boardDocument as BoardDocument;
    this.boards.set(board.id, board);
    return board;
  }

  clear(): void {
    this.boards.clear();
    this.activeBoard = null;
    this.footprintDefs.clear();
  }
}
