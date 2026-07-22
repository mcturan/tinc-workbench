/**
 * Project System — Asset Manager
 *
 * Reference management only. No binary editing.
 * Tracks images, logos, PDFs, datasheet references, custom symbols, and resources.
 */

import { ProjectAsset, AssetKind } from './types';
import { generateUUID } from '../utils';

const DEFAULT_MIME_TYPES: Record<AssetKind, string> = {
  image: 'image/png',
  logo: 'image/svg+xml',
  pdf: 'application/pdf',
  'datasheet-ref': 'application/pdf',
  'custom-symbol': 'application/json',
  resource: 'application/octet-stream',
};

export class AssetManager {
  private assets = new Map<string, ProjectAsset>();

  addAsset(
    kind: AssetKind,
    name: string,
    path: string,
    opts: Partial<Omit<ProjectAsset, 'id' | 'kind' | 'name' | 'path' | 'createdAt'>> = {}
  ): ProjectAsset {
    const id = generateUUID();
    const asset: ProjectAsset = {
      id,
      kind,
      name,
      description: opts.description ?? '',
      path,
      mimeType: opts.mimeType ?? DEFAULT_MIME_TYPES[kind],
      fileSize: opts.fileSize,
      hash: opts.hash,
      linkedDocumentIds: opts.linkedDocumentIds ?? [],
      createdAt: new Date().toISOString(),
      tags: opts.tags ?? [],
    };
    this.assets.set(id, asset);
    return { ...asset };
  }

  register(asset: ProjectAsset): void {
    this.assets.set(asset.id, { ...asset });
  }

  get(id: string): ProjectAsset | undefined {
    const a = this.assets.get(id);
    return a ? { ...a } : undefined;
  }

  list(filter?: { kind?: AssetKind }): ProjectAsset[] {
    let items = Array.from(this.assets.values());
    if (filter?.kind) items = items.filter(a => a.kind === filter.kind);
    return items.map(a => ({ ...a }));
  }

  findByPath(path: string): ProjectAsset | undefined {
    const a = Array.from(this.assets.values()).find(asset => asset.path === path);
    return a ? { ...a } : undefined;
  }

  findByName(name: string): ProjectAsset[] {
    return Array.from(this.assets.values())
      .filter(a => a.name === name)
      .map(a => ({ ...a }));
  }

  updateAsset(
    id: string,
    patch: Partial<Pick<ProjectAsset, 'name' | 'description' | 'path' | 'mimeType' | 'fileSize' | 'hash' | 'tags'>>
  ): boolean {
    const asset = this.assets.get(id);
    if (!asset) return false;
    Object.assign(asset, patch);
    return true;
  }

  linkDocument(assetId: string, documentId: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    if (!asset.linkedDocumentIds.includes(documentId)) {
      asset.linkedDocumentIds = [...asset.linkedDocumentIds, documentId];
    }
    return true;
  }

  unlinkDocument(assetId: string, documentId: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    asset.linkedDocumentIds = asset.linkedDocumentIds.filter(id => id !== documentId);
    return true;
  }

  remove(id: string): boolean {
    return this.assets.delete(id);
  }

  clear(): void {
    this.assets.clear();
  }

  count(): number {
    return this.assets.size;
  }

  getOrphanedAssets(linkedDocumentIds: Set<string>): ProjectAsset[] {
    return Array.from(this.assets.values())
      .filter(a =>
        a.linkedDocumentIds.length === 0 ||
        a.linkedDocumentIds.every(id => !linkedDocumentIds.has(id))
      )
      .map(a => ({ ...a }));
  }

  restore(assets: ProjectAsset[]): void {
    this.assets.clear();
    for (const a of assets) this.assets.set(a.id, { ...a });
  }
}
