export interface InventoryCategory {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
}

export interface StorageLocation {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  locationId?: string;
  quantity: number;
  unit: string;
  description?: string;
  notes?: string;
  properties: Record<string, any>;
  
  // Future extensibility hooks (do not implement logic yet, but prepare types)
  mpn?: string; // Manufacturer Part Number
  supplier?: string;
  supplierPartNumber?: string;
  purchaseUrl?: string;
  stockAlertThreshold?: number;
}

export interface WorkshopState {
  categories: InventoryCategory[];
  locations: StorageLocation[];
  items: InventoryItem[];
}
