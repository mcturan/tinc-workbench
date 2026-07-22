/**
 * Project System — Cross Reference Engine
 *
 * Builds and queries cross-references between schematic objects, sheets,
 * documents, and nets. Future-ready for PCB synchronization.
 */

import { CrossReference } from './types';
import { ObjectEngine } from '../object-engine';
import { DocumentRegistry } from './document-registry';

export class CrossReferenceEngine {
  private cache = new Map<string, CrossReference>();

  /**
   * Rebuild the cross-reference cache from the current ObjectEngine state.
   * Call after any significant project change.
   */
  build(objectEngine: ObjectEngine, docRegistry: DocumentRegistry): void {
    this.cache.clear();
    const project = objectEngine.getProject();

    for (let pageIdx = 0; pageIdx < project.pages.length; pageIdx++) {
      const page = project.pages[pageIdx];
      const docMeta = docRegistry.getByPageId(page.id);
      const sheetNumber = String(pageIdx + 1);

      for (const layer of page.layers) {
        for (const obj of layer.objects) {
          const reference =
            (obj.properties?.['reference'] as string | undefined) ??
            obj.name ??
            obj.id;

          const xref: CrossReference = {
            objectId: obj.id,
            reference,
            sheetNumber,
            pageId: page.id,
            documentId: docMeta?.id,
            netIds: [],
          };
          this.cache.set(obj.id, xref);
        }
      }
    }
  }

  getByObjectId(objectId: string): CrossReference | undefined {
    const ref = this.cache.get(objectId);
    return ref ? { ...ref, netIds: [...ref.netIds] } : undefined;
  }

  getByReference(reference: string): CrossReference[] {
    return Array.from(this.cache.values())
      .filter(r => r.reference === reference)
      .map(r => ({ ...r, netIds: [...r.netIds] }));
  }

  getBySheet(pageId: string): CrossReference[] {
    return Array.from(this.cache.values())
      .filter(r => r.pageId === pageId)
      .map(r => ({ ...r, netIds: [...r.netIds] }));
  }

  getByDocument(documentId: string): CrossReference[] {
    return Array.from(this.cache.values())
      .filter(r => r.documentId === documentId)
      .map(r => ({ ...r, netIds: [...r.netIds] }));
  }

  /** Link a net ID to an object's cross reference entry. */
  addNetLink(objectId: string, netId: string): void {
    const ref = this.cache.get(objectId);
    if (ref && !ref.netIds.includes(netId)) {
      ref.netIds = [...ref.netIds, netId];
    }
  }

  list(): CrossReference[] {
    return Array.from(this.cache.values()).map(r => ({ ...r, netIds: [...r.netIds] }));
  }

  clear(): void {
    this.cache.clear();
  }

  count(): number {
    return this.cache.size;
  }
}
