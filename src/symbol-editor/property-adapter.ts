import { SymbolEditorWorkspace } from './workspace';
import { PhysicalPropertyGroup } from '../physical-design/integration';

export class SymbolPropertyAdapter {
  constructor(private editor: SymbolEditorWorkspace) {}

  getProperties(selectedIds: string[]): PhysicalPropertyGroup[] {
    const doc = this.editor.symbolManager.getActiveDocument();
    if (!doc) return [];

    if (selectedIds.length === 0 || (selectedIds.length === 1 && selectedIds[0] === doc.id)) {
      return [
        {
          name: 'Symbol Definition',
          properties: [
            { key: 'name', label: 'Name', value: doc.name, type: 'string', editable: true },
            { key: 'description', label: 'Description', value: doc.description ?? '', type: 'string', editable: true },
          ],
        },
      ];
    }

    if (selectedIds.length === 1) {
      const item = doc.items.find((o) => o.id === selectedIds[0]);
      if (item) {
        if (item.kind === 'pin') {
          return [
            {
              name: 'Pin Properties',
              properties: [
                { key: 'name', label: 'Name', value: item.name, type: 'string', editable: true },
                { key: 'number', label: 'Number', value: item.number, type: 'string', editable: true },
                { key: 'direction', label: 'Direction', value: item.direction, type: 'string', editable: true },
                { key: 'electricalType', label: 'Electrical Type', value: item.electricalType, type: 'string', editable: true },
                { key: 'length', label: 'Length', value: item.length, type: 'number', editable: true },
                { key: 'x', label: 'Position X', value: item.transform.x, type: 'number', editable: true },
                { key: 'y', label: 'Position Y', value: item.transform.y, type: 'number', editable: true },
                { key: 'rotation', label: 'Rotation', value: item.transform.rotation, type: 'number', editable: true },
              ],
            },
          ];
        } else if (item.kind === 'text') {
          return [
            {
              name: 'Text Properties',
              properties: [
                { key: 'text', label: 'Text', value: item.text, type: 'string', editable: true },
                { key: 'type', label: 'Type', value: item.textType, type: 'string', editable: true },
                { key: 'fontSize', label: 'Font Size', value: item.fontSize, type: 'number', editable: true },
              ],
            },
          ];
        } else {
          return [
            {
              name: 'Graphic Properties',
              properties: [
                { key: 'kind', label: 'Type', value: item.kind, type: 'string', editable: false },
                { key: 'x', label: 'X', value: item.transform.x, type: 'number', editable: true },
                { key: 'y', label: 'Y', value: item.transform.y, type: 'number', editable: true },
              ],
            },
          ];
        }
      }
    }

    return [];
  }
}
