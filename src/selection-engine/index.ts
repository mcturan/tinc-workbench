export class SelectionEngine {
  private selectedIds: Set<string> = new Set();

  select(id: string, additive: boolean = false): void {
    if (!additive) this.selectedIds.clear();
    this.selectedIds.add(id);
  }

  addSelect(ids: string[]): void {
    for (const id of ids) this.selectedIds.add(id);
  }

  toggle(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  deselect(id: string): void {
    this.selectedIds.delete(id);
  }

  clear(): void {
    this.selectedIds.clear();
  }

  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }
}
