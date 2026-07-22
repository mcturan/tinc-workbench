/**
 * Physical Design Platform — Selection Framework
 * PART 7: Single, multi, box, lasso-ready selection with filters and groups
 */

import { generateUUID } from '../utils';
import {
  PhysicalSelectionMode,
  PhysicalSelectionFilter,
  PhysicalSelectionGroup,
  PhysicalObjectKind,
  PhysicalObject,
  PhysicalBBox,
} from './types';
import { SpatialIndex } from './spatial-index';
import { hitTestObject } from './geometry';
import { PhysicalCoord } from './types';

// ── Selection State ───────────────────────────────────────────────────────────

export interface PhysicalSelectionState {
  mode: PhysicalSelectionMode;
  selectedIds: Set<string>;
  primaryId: string | null;
  hoveredId: string | null;
  boxSelectStart: PhysicalCoord | null;
  boxSelectEnd: PhysicalCoord | null;
}

// ── Default Filter ────────────────────────────────────────────────────────────

export function defaultSelectionFilter(): PhysicalSelectionFilter {
  return {
    includeLocked: false,
    includeHidden: false,
  };
}

// ── Selection Engine ──────────────────────────────────────────────────────────

export class PhysicalSelectionEngine {
  private state: PhysicalSelectionState = {
    mode: 'single',
    selectedIds: new Set(),
    primaryId: null,
    hoveredId: null,
    boxSelectStart: null,
    boxSelectEnd: null,
  };
  private groups: Map<string, PhysicalSelectionGroup> = new Map();
  private filter: PhysicalSelectionFilter = defaultSelectionFilter();

  constructor(
    private objectGetter: (id: string) => PhysicalObject | undefined,
    private spatialIndex: SpatialIndex
  ) {}

  // ── Filter Management ────────────────────────────────────────────────────────

  setFilter(filter: Partial<PhysicalSelectionFilter>): void {
    this.filter = { ...this.filter, ...filter };
  }

  getFilter(): PhysicalSelectionFilter {
    return { ...this.filter };
  }

  // ── Mode ─────────────────────────────────────────────────────────────────────

  setMode(mode: PhysicalSelectionMode): void {
    this.state.mode = mode;
  }

  getMode(): PhysicalSelectionMode {
    return this.state.mode;
  }

  // ── Selection Operations ──────────────────────────────────────────────────────

  selectSingle(id: string, additive: boolean = false): boolean {
    const obj = this.objectGetter(id);
    if (!obj) return false;
    if (!this.passesFilter(obj)) return false;

    if (!additive) {
      this.clearSelection();
    }
    this.state.selectedIds.add(id);
    this.state.primaryId = id;
    return true;
  }

  selectMultiple(ids: string[], additive: boolean = false): string[] {
    if (!additive) this.clearSelection();
    const added: string[] = [];
    for (const id of ids) {
      const obj = this.objectGetter(id);
      if (obj && this.passesFilter(obj)) {
        this.state.selectedIds.add(id);
        added.push(id);
      }
    }
    this.state.primaryId = added[0] ?? this.state.primaryId;
    return added;
  }

  deselect(id: string): void {
    this.state.selectedIds.delete(id);
    if (this.state.primaryId === id) {
      const remaining = Array.from(this.state.selectedIds);
      this.state.primaryId = remaining.length > 0 ? remaining[0] : null;
    }
  }

  clearSelection(): void {
    this.state.selectedIds.clear();
    this.state.primaryId = null;
    this.state.boxSelectStart = null;
    this.state.boxSelectEnd = null;
  }

  toggleSelection(id: string): boolean {
    if (this.state.selectedIds.has(id)) {
      this.deselect(id);
      return false;
    } else {
      return this.selectSingle(id, true);
    }
  }

  // ── Box Selection ─────────────────────────────────────────────────────────────

  beginBoxSelect(startPt: PhysicalCoord): void {
    this.state.mode = 'box';
    this.state.boxSelectStart = { ...startPt };
    this.state.boxSelectEnd = { ...startPt };
  }

  updateBoxSelect(pt: PhysicalCoord): void {
    this.state.boxSelectEnd = { ...pt };
  }

  commitBoxSelect(additive: boolean = false): string[] {
    const start = this.state.boxSelectStart;
    const end = this.state.boxSelectEnd;
    if (!start || !end) return [];

    const bbox: PhysicalBBox = {
      minX: Math.min(start.x, end.x),
      minY: Math.min(start.y, end.y),
      maxX: Math.max(start.x, end.x),
      maxY: Math.max(start.y, end.y),
    };

    const candidates = this.spatialIndex.queryBox(bbox);
    const ids = candidates
      .map((c) => c.id)
      .filter((id) => {
        const obj = this.objectGetter(id);
        return obj ? this.passesFilter(obj) : false;
      });

    this.selectMultiple(ids, additive);

    this.state.mode = 'single';
    this.state.boxSelectStart = null;
    this.state.boxSelectEnd = null;

    return ids;
  }

  cancelBoxSelect(): void {
    this.state.mode = 'single';
    this.state.boxSelectStart = null;
    this.state.boxSelectEnd = null;
  }

  // ── Lasso-ready ───────────────────────────────────────────────────────────────

  /**
   * Lasso selection foundation: accepts a polygon boundary and returns IDs
   * of objects whose bounding boxes intersect the lasso. Full lasso with
   * polygon-level containment is built on top of this.
   */
  lassoSelectBBox(polygonBBox: PhysicalBBox, additive: boolean = false): string[] {
    return this.commitBoxSelectWithBBox(polygonBBox, additive);
  }

  private commitBoxSelectWithBBox(bbox: PhysicalBBox, additive: boolean): string[] {
    const candidates = this.spatialIndex.queryBox(bbox);
    const ids = candidates
      .map((c) => c.id)
      .filter((id) => {
        const obj = this.objectGetter(id);
        return obj ? this.passesFilter(obj) : false;
      });
    this.selectMultiple(ids, additive);
    return ids;
  }

  // ── Point-click Hit Test ──────────────────────────────────────────────────────

  hitTest(pt: PhysicalCoord, toleranceNm: number): string | null {
    const candidates = this.spatialIndex.queryPoint(pt);
    for (const c of candidates) {
      const obj = this.objectGetter(c.id);
      if (obj && this.passesFilter(obj) && hitTestObject(obj, pt, toleranceNm)) {
        return c.id;
      }
    }
    return null;
  }

  hitTestAll(pt: PhysicalCoord, toleranceNm: number): string[] {
    const candidates = this.spatialIndex.queryNearest(pt, 20, toleranceNm * 2);
    return candidates
      .map((c) => c.id)
      .filter((id) => {
        const obj = this.objectGetter(id);
        return obj && this.passesFilter(obj) && hitTestObject(obj, pt, toleranceNm);
      });
  }

  // ── Hover ─────────────────────────────────────────────────────────────────────

  setHovered(id: string | null): void {
    this.state.hoveredId = id;
  }

  getHoveredId(): string | null {
    return this.state.hoveredId;
  }

  // ── Groups ────────────────────────────────────────────────────────────────────

  createGroup(name: string, ids?: string[]): PhysicalSelectionGroup {
    const group: PhysicalSelectionGroup = {
      id: generateUUID(),
      name,
      objectIds: ids ? [...ids] : Array.from(this.state.selectedIds),
    };
    this.groups.set(group.id, group);
    return group;
  }

  selectGroup(groupId: string, additive: boolean = false): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;
    this.selectMultiple(group.objectIds, additive);
    return true;
  }

  addToGroup(groupId: string, ids: string[]): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;
    for (const id of ids) {
      if (!group.objectIds.includes(id)) group.objectIds.push(id);
    }
    return true;
  }

  removeGroup(groupId: string): boolean {
    return this.groups.delete(groupId);
  }

  getGroup(groupId: string): PhysicalSelectionGroup | undefined {
    return this.groups.get(groupId);
  }

  getAllGroups(): PhysicalSelectionGroup[] {
    return Array.from(this.groups.values());
  }

  // ── Queries ───────────────────────────────────────────────────────────────────

  getSelectedIds(): string[] {
    return Array.from(this.state.selectedIds);
  }

  getPrimaryId(): string | null {
    return this.state.primaryId;
  }

  isSelected(id: string): boolean {
    return this.state.selectedIds.has(id);
  }

  getSelectionCount(): number {
    return this.state.selectedIds.size;
  }

  isEmpty(): boolean {
    return this.state.selectedIds.size === 0;
  }

  getBoxSelectRect(): PhysicalBBox | null {
    const start = this.state.boxSelectStart;
    const end = this.state.boxSelectEnd;
    if (!start || !end) return null;
    return {
      minX: Math.min(start.x, end.x),
      minY: Math.min(start.y, end.y),
      maxX: Math.max(start.x, end.x),
      maxY: Math.max(start.y, end.y),
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────────

  private passesFilter(obj: PhysicalObject): boolean {
    if (!this.filter.includeLocked && obj.locked) return false;
    if (!this.filter.includeHidden && !obj.visible) return false;
    if (this.filter.layerIds && !this.filter.layerIds.includes(obj.layerId)) return false;
    if (this.filter.kinds && !this.filter.kinds.includes(obj.kind)) return false;
    return true;
  }
}
