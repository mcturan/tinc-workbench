/**
 * Project System — Document Registry
 *
 * Tracks all documents (schematic, hierarchical-sheet, pcb, simulation, bom, etc.)
 * associated with a project. Manages open/close state and dirty tracking.
 */

import { DocumentMetadata, DocumentKind, DocumentState } from './types';
import { generateUUID } from '../utils';

export class DocumentRegistry {
  private documents = new Map<string, DocumentMetadata>();

  createDocument(
    kind: DocumentKind,
    title: string,
    opts: Partial<Omit<DocumentMetadata, 'id' | 'kind' | 'title' | 'createdAt' | 'modifiedAt'>> = {}
  ): DocumentMetadata {
    const id = generateUUID();
    const now = new Date().toISOString();
    const doc: DocumentMetadata = {
      id,
      kind,
      title,
      description: opts.description ?? '',
      createdAt: now,
      modifiedAt: now,
      version: opts.version ?? 1,
      path: opts.path ?? '',
      pageId: opts.pageId,
      readonly: opts.readonly ?? false,
      dirty: opts.dirty ?? false,
      state: opts.state ?? 'closed',
      tags: opts.tags ?? [],
    };
    this.documents.set(id, doc);
    return { ...doc };
  }

  register(doc: DocumentMetadata): void {
    this.documents.set(doc.id, { ...doc });
  }

  get(id: string): DocumentMetadata | undefined {
    const d = this.documents.get(id);
    return d ? { ...d } : undefined;
  }

  list(filter?: { kind?: DocumentKind; state?: DocumentState }): DocumentMetadata[] {
    let items = Array.from(this.documents.values());
    if (filter?.kind) items = items.filter(d => d.kind === filter.kind);
    if (filter?.state) items = items.filter(d => d.state === filter.state);
    return items.map(d => ({ ...d }));
  }

  open(id: string): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;
    doc.state = doc.readonly ? 'readonly' : 'open';
    doc.modifiedAt = new Date().toISOString();
    return true;
  }

  close(id: string): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;
    doc.state = 'closed';
    doc.dirty = false;
    return true;
  }

  markDirty(id: string): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;
    if (doc.readonly) return false;
    doc.dirty = true;
    doc.state = 'modified';
    doc.modifiedAt = new Date().toISOString();
    return true;
  }

  markClean(id: string): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;
    doc.dirty = false;
    if (doc.state === 'modified') doc.state = 'open';
    return true;
  }

  setReadonly(id: string, readonly: boolean): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;
    doc.readonly = readonly;
    if (readonly && doc.state === 'open') doc.state = 'readonly';
    return true;
  }

  updateMetadata(
    id: string,
    patch: Partial<Pick<DocumentMetadata, 'title' | 'description' | 'tags' | 'path'>>
  ): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;
    Object.assign(doc, patch);
    doc.modifiedAt = new Date().toISOString();
    return true;
  }

  bumpVersion(id: string): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;
    doc.version += 1;
    doc.modifiedAt = new Date().toISOString();
    return true;
  }

  delete(id: string): boolean {
    return this.documents.delete(id);
  }

  clear(): void {
    this.documents.clear();
  }

  hasAnyOpen(): boolean {
    return Array.from(this.documents.values()).some(
      d => d.state === 'open' || d.state === 'modified'
    );
  }

  getDirtyDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values())
      .filter(d => d.dirty)
      .map(d => ({ ...d }));
  }

  getByPageId(pageId: string): DocumentMetadata | undefined {
    const d = Array.from(this.documents.values()).find(doc => doc.pageId === pageId);
    return d ? { ...d } : undefined;
  }

  count(): number {
    return this.documents.size;
  }

  restore(docs: DocumentMetadata[]): void {
    this.documents.clear();
    for (const d of docs) this.documents.set(d.id, { ...d });
  }
}
