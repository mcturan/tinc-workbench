import { SymbolDocument, SymbolItem } from './types';

export class SymbolManager {
  private docs: Map<string, SymbolDocument> = new Map();
  private activeDoc: SymbolDocument | null = null;

  createDocument(id: string, name: string): SymbolDocument {
    const doc: SymbolDocument = { id, name, description: '', items: [] };
    this.docs.set(id, doc);
    if (!this.activeDoc) this.activeDoc = doc;
    return doc;
  }

  getActiveDocument(): SymbolDocument | null {
    return this.activeDoc;
  }

  setActiveDocument(id: string): boolean {
    const doc = this.docs.get(id);
    if (!doc) return false;
    this.activeDoc = doc;
    return true;
  }

  getDocument(id: string): SymbolDocument | undefined {
    return this.docs.get(id);
  }

  clear(): void {
    this.docs.clear();
    this.activeDoc = null;
  }

  addItem(docId: string, item: SymbolItem): void {
    const doc = this.docs.get(docId);
    if (!doc) throw new Error(`Document ${docId} not found`);
    doc.items.push(item);
  }

  removeItem(docId: string, itemId: string): boolean {
    const doc = this.docs.get(docId);
    if (!doc) return false;
    const idx = doc.items.findIndex(i => i.id === itemId);
    if (idx === -1) return false;
    doc.items.splice(idx, 1);
    return true;
  }

  updateItem(docId: string, itemId: string, updates: Partial<SymbolItem>): boolean {
    const doc = this.docs.get(docId);
    if (!doc) return false;
    const item = doc.items.find(i => i.id === itemId);
    if (!item) return false;
    Object.assign(item, updates);
    return true;
  }
}
