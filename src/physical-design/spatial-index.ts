/**
 * Physical Design Platform — Spatial Index
 * PART 6: QuadTree for O(log n) spatial queries, viewport culling, incremental updates
 */

import { PhysicalBBox, PhysicalCoord, SpatialEntry, bboxIntersects, bboxContainsPoint } from './types';
import { bboxArea } from './geometry';

// ── QuadTree Node ─────────────────────────────────────────────────────────────

const QUADTREE_MAX_OBJECTS = 8;
const QUADTREE_MAX_DEPTH = 12;

interface QuadNode {
  bbox: PhysicalBBox;
  depth: number;
  entries: SpatialEntry[];
  children: QuadNode[] | null; // null = leaf
}

function createNode(bbox: PhysicalBBox, depth: number): QuadNode {
  return { bbox, depth, entries: [], children: null };
}

function subdivide(node: QuadNode): void {
  const mx = (node.bbox.minX + node.bbox.maxX) / 2;
  const my = (node.bbox.minY + node.bbox.maxY) / 2;
  const d = node.depth + 1;
  node.children = [
    createNode({ minX: node.bbox.minX, minY: node.bbox.minY, maxX: mx, maxY: my }, d), // NW
    createNode({ minX: mx, minY: node.bbox.minY, maxX: node.bbox.maxX, maxY: my }, d), // NE
    createNode({ minX: node.bbox.minX, minY: my, maxX: mx, maxY: node.bbox.maxY }, d), // SW
    createNode({ minX: mx, minY: my, maxX: node.bbox.maxX, maxY: node.bbox.maxY }, d), // SE
  ];
}

function insertEntry(node: QuadNode, entry: SpatialEntry): void {
  if (node.children !== null) {
    // Try to insert into a single child
    for (const child of node.children) {
      if (bboxContains(child.bbox, entry.bbox)) {
        insertEntry(child, entry);
        return;
      }
    }
    // Overlaps multiple children — store at this level
    node.entries.push(entry);
    return;
  }

  node.entries.push(entry);

  if (node.entries.length > QUADTREE_MAX_OBJECTS && node.depth < QUADTREE_MAX_DEPTH) {
    subdivide(node);
    const overflow = node.entries.splice(0);
    for (const e of overflow) {
      insertEntry(node, e);
    }
  }
}

function bboxContains(outer: PhysicalBBox, inner: PhysicalBBox): boolean {
  return inner.minX >= outer.minX && inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY && inner.maxY <= outer.maxY;
}

function queryNode(node: QuadNode, queryBox: PhysicalBBox, results: SpatialEntry[]): void {
  if (!bboxIntersects(node.bbox, queryBox)) return;

  for (const entry of node.entries) {
    if (bboxIntersects(entry.bbox, queryBox)) {
      results.push(entry);
    }
  }

  if (node.children) {
    for (const child of node.children) {
      queryNode(child, queryBox, results);
    }
  }
}

function removeFromNode(node: QuadNode, id: string): boolean {
  const idx = node.entries.findIndex((e) => e.id === id);
  if (idx !== -1) {
    node.entries.splice(idx, 1);
    return true;
  }
  if (node.children) {
    for (const child of node.children) {
      if (removeFromNode(child, id)) return true;
    }
  }
  return false;
}

function collectAll(node: QuadNode, results: SpatialEntry[]): void {
  results.push(...node.entries);
  if (node.children) {
    for (const child of node.children) collectAll(child, results);
  }
}

// ── QuadTree ──────────────────────────────────────────────────────────────────

export class QuadTree {
  private root: QuadNode;
  private entryMap: Map<string, SpatialEntry> = new Map();

  constructor(worldBBox: PhysicalBBox) {
    this.root = createNode(worldBBox, 0);
  }

  /** Insert or update an entry (full rebuild on update) */
  upsert(entry: SpatialEntry): void {
    if (this.entryMap.has(entry.id)) {
      this.remove(entry.id);
    }
    this.entryMap.set(entry.id, entry);
    insertEntry(this.root, entry);
  }

  remove(id: string): boolean {
    if (!this.entryMap.has(id)) return false;
    this.entryMap.delete(id);
    return removeFromNode(this.root, id);
  }

  /** Query all entries whose bounding box intersects queryBox */
  query(queryBox: PhysicalBBox): SpatialEntry[] {
    const results: SpatialEntry[] = [];
    queryNode(this.root, queryBox, results);
    return results;
  }

  /** Query entries by layer filter */
  queryByLayer(queryBox: PhysicalBBox, layerId: string): SpatialEntry[] {
    return this.query(queryBox).filter((e) => e.layerId === layerId);
  }

  /** Point query — find all entries containing a point */
  queryPoint(pt: PhysicalCoord): SpatialEntry[] {
    const ptBox: PhysicalBBox = { minX: pt.x, minY: pt.y, maxX: pt.x, maxY: pt.y };
    return this.query(ptBox).filter((e) => bboxContainsPoint(e.bbox, pt));
  }

  /** Nearest-neighbor approximation — finds k nearest by bbox center distance */
  queryNearest(pt: PhysicalCoord, k: number, searchRadius: number): SpatialEntry[] {
    const box: PhysicalBBox = {
      minX: pt.x - searchRadius,
      minY: pt.y - searchRadius,
      maxX: pt.x + searchRadius,
      maxY: pt.y + searchRadius,
    };
    const candidates = this.query(box);
    return candidates
      .map((e) => {
        const cx = (e.bbox.minX + e.bbox.maxX) / 2;
        const cy = (e.bbox.minY + e.bbox.maxY) / 2;
        const dist = Math.sqrt((cx - pt.x) ** 2 + (cy - pt.y) ** 2);
        return { entry: e, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k)
      .map((x) => x.entry);
  }

  has(id: string): boolean {
    return this.entryMap.has(id);
  }

  get(id: string): SpatialEntry | undefined {
    return this.entryMap.get(id);
  }

  size(): number {
    return this.entryMap.size;
  }

  getAllEntries(): SpatialEntry[] {
    const results: SpatialEntry[] = [];
    collectAll(this.root, results);
    return results;
  }

  /** Rebuild tree from scratch (useful after bulk mutations) */
  rebuild(entries: SpatialEntry[]): void {
    const worldBBox = this.root.bbox;
    this.root = createNode(worldBBox, 0);
    this.entryMap.clear();
    for (const entry of entries) {
      this.entryMap.set(entry.id, entry);
      insertEntry(this.root, entry);
    }
  }

  clear(): void {
    const worldBBox = this.root.bbox;
    this.root = createNode(worldBBox, 0);
    this.entryMap.clear();
  }
}

// ── Spatial Index Manager ─────────────────────────────────────────────────────

/** Production-grade spatial index with per-layer trees and global tree */
export class SpatialIndex {
  private globalTree: QuadTree;
  private layerTrees: Map<string, QuadTree> = new Map();
  private worldBBox: PhysicalBBox;

  constructor(worldBBox: PhysicalBBox = { minX: -1e12, minY: -1e12, maxX: 1e12, maxY: 1e12 }) {
    this.worldBBox = worldBBox;
    this.globalTree = new QuadTree(worldBBox);
  }

  private getOrCreateLayerTree(layerId: string): QuadTree {
    let tree = this.layerTrees.get(layerId);
    if (!tree) {
      tree = new QuadTree(this.worldBBox);
      this.layerTrees.set(layerId, tree);
    }
    return tree;
  }

  /** Insert or update a spatial entry */
  upsert(entry: SpatialEntry): void {
    this.globalTree.upsert(entry);
    this.getOrCreateLayerTree(entry.layerId).upsert(entry);
  }

  /** Remove entry from all indices */
  remove(id: string, layerId?: string): boolean {
    const removed = this.globalTree.remove(id);
    if (layerId) {
      this.layerTrees.get(layerId)?.remove(id);
    } else {
      for (const tree of this.layerTrees.values()) {
        tree.remove(id);
      }
    }
    return removed;
  }

  /** Viewport culling — returns all entries visible in the given world bbox */
  queryViewport(viewBBox: PhysicalBBox): SpatialEntry[] {
    return this.globalTree.query(viewBBox);
  }

  /** Selection box query */
  queryBox(box: PhysicalBBox): SpatialEntry[] {
    return this.globalTree.query(box);
  }

  /** Layer-filtered box query */
  queryBoxByLayer(box: PhysicalBBox, layerId: string): SpatialEntry[] {
    const tree = this.layerTrees.get(layerId);
    if (!tree) return [];
    return tree.query(box);
  }

  /** Point query */
  queryPoint(pt: PhysicalCoord): SpatialEntry[] {
    return this.globalTree.queryPoint(pt);
  }

  /** Nearest neighbors for snapping */
  queryNearest(pt: PhysicalCoord, k: number, searchRadius: number): SpatialEntry[] {
    return this.globalTree.queryNearest(pt, k, searchRadius);
  }

  /** Collision candidates — finds entries within clearance of given bbox */
  collisionCandidates(bbox: PhysicalBBox, clearance: number): SpatialEntry[] {
    const expanded: PhysicalBBox = {
      minX: bbox.minX - clearance,
      minY: bbox.minY - clearance,
      maxX: bbox.maxX + clearance,
      maxY: bbox.maxY + clearance,
    };
    return this.globalTree.query(expanded);
  }

  has(id: string): boolean {
    return this.globalTree.has(id);
  }

  size(): number {
    return this.globalTree.size();
  }

  clear(): void {
    this.globalTree.clear();
    this.layerTrees.clear();
  }

  rebuild(entries: SpatialEntry[]): void {
    this.clear();
    for (const entry of entries) {
      this.upsert(entry);
    }
  }
}
