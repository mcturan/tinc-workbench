import { PhysicalPropertyGroup as PropertyGroup } from '../physical-design/integration';
import { WorkshopManager } from './engine';
import { InventoryItem } from './types';

export class WorkshopPropertyAdapter {
  constructor(private manager: WorkshopManager) {}

  public getProperties(selectedIds: string[]): PropertyGroup[] {
    if (selectedIds.length !== 1) return []; // Only support single selection for now

    const item = this.manager.getItem(selectedIds[0]);
    if (!item) return [];

    const category = this.manager.getCategory(item.categoryId);
    const location = item.locationId ? this.manager.getLocation(item.locationId) : undefined;

    const group: PropertyGroup = {
      name: 'Inventory Item',
      properties: [
        {
          key: 'name',
          label: 'Name',
          type: 'string',
          value: item.name,
          editable: true
        },
        {
          key: 'category',
          label: 'Category',
          type: 'string',
          value: category ? category.name : 'Unknown',
          editable: false // Would be a dropdown in full implementation
        },
        {
          key: 'quantity',
          label: 'Quantity',
          type: 'number',
          value: item.quantity,
          editable: true
        },
        {
          key: 'unit',
          label: 'Unit',
          type: 'string',
          value: item.unit,
          editable: true
        },
        {
          key: 'location',
          label: 'Location',
          type: 'string',
          value: location ? location.name : 'Unassigned',
          editable: false
        }
      ]
    };

    if (item.description) {
      group.properties.push({
        key: 'description',
        label: 'Description',
        type: 'string',
        value: item.description,
        editable: true
      });
    }

    if (item.mpn) {
      group.properties.push({
        key: 'mpn',
        label: 'MPN',
        type: 'string',
        value: item.mpn,
        editable: true
      });
    }

    return [group];
  }

  public updateProperty(id: string, propertyId: string, value: any): void {
    const updates: Partial<InventoryItem> = {};
    if (propertyId === 'name') updates.name = value;
    else if (propertyId === 'quantity') updates.quantity = Number(value);
    else if (propertyId === 'unit') updates.unit = value;
    else if (propertyId === 'description') updates.description = value;
    else if (propertyId === 'mpn') updates.mpn = value;
    
    if (Object.keys(updates).length > 0) {
      this.manager.updateItem(id, updates);
    }
  }
}
