import { FootprintEditorWorkspace } from './footprint-editor';
import { PhysicalPropertyGroup, getObjectProperties } from './integration';

export class FootprintPropertyAdapter {
  constructor(private editor: FootprintEditorWorkspace) {}

  getProperties(selectedIds: string[]): PhysicalPropertyGroup[] {
    const board = this.editor.boardManager.getActiveBoard();
    if (!board) return [];

    if (selectedIds.length === 0 || (selectedIds.length === 1 && selectedIds[0] === board.id)) {
      return [
        {
          name: 'Footprint Definition',
          properties: [
            { key: 'name', label: 'Name', value: board.name, type: 'string', editable: true },
            { key: 'description', label: 'Description', value: board.description ?? '', type: 'string', editable: true },
            { key: 'originX', label: 'Anchor X', value: board.origin.x, type: 'number', editable: true },
            { key: 'originY', label: 'Anchor Y', value: board.origin.y, type: 'number', editable: true },
          ],
        },
      ];
    }

    if (selectedIds.length === 1) {
      const obj = board.objects.find((o) => o.id === selectedIds[0]);
      if (obj) {
        return getObjectProperties(obj);
      }
    }

    return [];
  }
}
