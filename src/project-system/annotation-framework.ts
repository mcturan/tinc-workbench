/**
 * Project System — Annotation Framework
 *
 * Implements project-wide automatic reference annotation (R1, U2, C3...).
 * Supports hierarchical numbering, renumbering, conflict detection, and prefix rules.
 */

import { AnnotationEntry, AnnotationRules } from './types';
import { generateUUID } from '../utils';

export class AnnotationFramework {
  private entries = new Map<string, AnnotationEntry>();

  /**
   * Assign the next available reference for a given prefix to an objectId.
   * Auto-picks the next free number starting from rules.startNumber.
   */
  assign(
    prefix: string,
    objectId: string,
    opts: {
      pageId?: string;
      documentId?: string;
      rules?: Partial<AnnotationRules>;
    } = {}
  ): AnnotationEntry {
    const startNumber = opts.rules?.startNumber ?? 1;
    const number = this.nextNumber(prefix, startNumber);
    const reference = `${prefix}${number}`;
    const entry: AnnotationEntry = {
      id: generateUUID(),
      reference,
      prefix,
      number,
      pageId: opts.pageId,
      documentId: opts.documentId,
      objectId,
    };
    this.entries.set(entry.id, entry);
    return { ...entry };
  }

  /** Assign a specific number (useful for restore/import). */
  assignFixed(
    prefix: string,
    number: number,
    objectId: string,
    opts: { pageId?: string; documentId?: string } = {}
  ): AnnotationEntry {
    const reference = `${prefix}${number}`;
    const entry: AnnotationEntry = {
      id: generateUUID(),
      reference,
      prefix,
      number,
      pageId: opts.pageId,
      documentId: opts.documentId,
      objectId,
    };
    this.entries.set(entry.id, entry);
    return { ...entry };
  }

  getById(id: string): AnnotationEntry | undefined {
    const e = this.entries.get(id);
    return e ? { ...e } : undefined;
  }

  getByObjectId(objectId: string): AnnotationEntry | undefined {
    const e = Array.from(this.entries.values()).find(a => a.objectId === objectId);
    return e ? { ...e } : undefined;
  }

  getByReference(reference: string): AnnotationEntry | undefined {
    const e = Array.from(this.entries.values()).find(a => a.reference === reference);
    return e ? { ...e } : undefined;
  }

  list(filter?: {
    prefix?: string;
    pageId?: string;
    documentId?: string;
  }): AnnotationEntry[] {
    let items = Array.from(this.entries.values());
    if (filter?.prefix) items = items.filter(e => e.prefix === filter.prefix);
    if (filter?.pageId) items = items.filter(e => e.pageId === filter.pageId);
    if (filter?.documentId) items = items.filter(e => e.documentId === filter.documentId);
    return items.map(e => ({ ...e }));
  }

  removeByObjectId(objectId: string): void {
    for (const [id, entry] of this.entries.entries()) {
      if (entry.objectId === objectId) this.entries.delete(id);
    }
  }

  remove(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Renumber all annotations with the given prefix (optionally filtered by pageId).
   * Numbers are reassigned starting from startNumber in ascending order.
   */
  renumber(prefix: string, startNumber: number, pageId?: string): AnnotationEntry[] {
    let items = Array.from(this.entries.values()).filter(e => e.prefix === prefix);
    if (pageId !== undefined) items = items.filter(e => e.pageId === pageId);
    items.sort((a, b) => a.number - b.number);

    let n = startNumber;
    const updated: AnnotationEntry[] = [];
    for (const item of items) {
      const stored = this.entries.get(item.id)!;
      stored.number = n;
      stored.reference = `${prefix}${n}`;
      n++;
      updated.push({ ...stored });
    }
    return updated;
  }

  /** Remove all annotations on a specific page (e.g. when resetting page numbering). */
  resetPage(pageId: string): void {
    for (const [id, entry] of this.entries.entries()) {
      if (entry.pageId === pageId) this.entries.delete(id);
    }
  }

  /** Returns all reference conflicts (same reference string used by multiple entries). */
  detectConflicts(): Array<{ reference: string; ids: string[] }> {
    const refMap = new Map<string, string[]>();
    for (const entry of this.entries.values()) {
      const existing = refMap.get(entry.reference) ?? [];
      existing.push(entry.id);
      refMap.set(entry.reference, existing);
    }
    const conflicts: Array<{ reference: string; ids: string[] }> = [];
    for (const [ref, ids] of refMap.entries()) {
      if (ids.length > 1) conflicts.push({ reference: ref, ids });
    }
    return conflicts;
  }

  clear(): void {
    this.entries.clear();
  }

  count(): number {
    return this.entries.size;
  }

  restore(entries: AnnotationEntry[]): void {
    this.entries.clear();
    for (const e of entries) this.entries.set(e.id, { ...e });
  }

  private nextNumber(prefix: string, startFrom: number): number {
    const used = new Set(
      Array.from(this.entries.values())
        .filter(e => e.prefix === prefix)
        .map(e => e.number)
    );
    let n = startFrom;
    while (used.has(n)) n++;
    return n;
  }
}
