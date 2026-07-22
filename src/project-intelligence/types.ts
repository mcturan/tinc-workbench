export interface ProjectStatistics {
  symbolCount: number;
  footprintCount: number;
  physicalModuleCount: number;
  boardCount: number;
  wireCount: number;
  inventoryReferenceCount: number;
}

export interface InventoryRequirement {
  itemId: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  status: 'sufficient' | 'insufficient' | 'missing';
}

export interface HealthIssue {
  id: string;
  severity: 'info' | 'warning' | 'error';
  category: 'orphan' | 'unused-reference' | 'duplicate-label' | 'disconnected-module' | 'empty-container';
  message: string;
  targetObjectId?: string;
}

export interface IntelligenceSummary {
  statistics: ProjectStatistics;
  inventoryRequirements: InventoryRequirement[];
  healthIssues: HealthIssue[];
}

export interface IntelligenceProvider {
  name: string;
  analyze(context: any): Partial<IntelligenceSummary>;
}
