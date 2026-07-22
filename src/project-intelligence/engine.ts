import { IntelligenceProvider, IntelligenceSummary, ProjectStatistics, InventoryRequirement, HealthIssue } from './types';
import { ObjectEngine } from '../object-engine';
import { DeviceWorkspaceManager } from '../device-workspace/manager';
import { globalWorkshopManager } from '../workshop-manager';
import { listLabels } from '../net-labels';

export class ProjectIntelligenceEngine {
  private providers: IntelligenceProvider[] = [];

  constructor(
    private objectEngine: ObjectEngine,
    private deviceWorkspaceManager: DeviceWorkspaceManager
  ) {}

  public registerProvider(provider: IntelligenceProvider): void {
    this.providers.push(provider);
  }

  public analyze(): IntelligenceSummary {
    const summary: IntelligenceSummary = {
      statistics: this.gatherStatistics(),
      inventoryRequirements: this.analyzeInventory(),
      healthIssues: this.analyzeHealth()
    };

    // Extension point for future providers
    for (const provider of this.providers) {
      const partial = provider.analyze({
        objectEngine: this.objectEngine,
        deviceWorkspaceManager: this.deviceWorkspaceManager,
        workshopManager: globalWorkshopManager
      });

      if (partial.statistics) {
        summary.statistics = { ...summary.statistics, ...partial.statistics };
      }
      if (partial.inventoryRequirements) {
        summary.inventoryRequirements.push(...partial.inventoryRequirements);
      }
      if (partial.healthIssues) {
        summary.healthIssues.push(...partial.healthIssues);
      }
    }

    return summary;
  }

  private gatherStatistics(): ProjectStatistics {
    let symbolCount = 0;
    
    // Check schematic symbols
    const project = this.objectEngine.getProject();
    if (project) {
      for (const page of project.pages) {
        for (const layer of page.layers) {
          symbolCount += layer.objects.length;
        }
      }
    }

    // Footprints & Boards (assuming handled in another workspace, simplified for now)
    const footprintCount = 0; 
    const boardCount = 0;

    // Physical Modules
    const physicalObjects = this.deviceWorkspaceManager.getWorkspace().layers.flatMap(l => l.objects);
    const physicalModuleCount = physicalObjects.filter(o => o.kind === 'module').length;

    // Wires
    const wireCount = this.objectEngine.getWires().length;

    // Inventory References
    let inventoryReferenceCount = 0;
    if (project) {
      for (const page of project.pages) {
        for (const layer of page.layers) {
          for (const obj of layer.objects) {
            if (obj.inventoryItemId) {
              inventoryReferenceCount++;
            }
          }
        }
      }
    }

    for (const obj of physicalObjects) {
      if (obj.inventoryItemId) {
        inventoryReferenceCount++;
      }
    }

    return {
      symbolCount,
      footprintCount,
      physicalModuleCount,
      boardCount,
      wireCount,
      inventoryReferenceCount
    };
  }

  private analyzeInventory(): InventoryRequirement[] {
    const requirements = new Map<string, number>();

    // Collect requirements from Schematic
    const project = this.objectEngine.getProject();
    if (project) {
      for (const page of project.pages) {
        for (const layer of page.layers) {
          for (const obj of layer.objects) {
            if (obj.inventoryItemId) {
              requirements.set(obj.inventoryItemId, (requirements.get(obj.inventoryItemId) || 0) + 1);
            }
          }
        }
      }
    }

    // Collect requirements from Physical Workspace
    const physicalObjects = this.deviceWorkspaceManager.getWorkspace().layers.flatMap(l => l.objects);
    for (const obj of physicalObjects) {
      if (obj.inventoryItemId) {
        requirements.set(obj.inventoryItemId, (requirements.get(obj.inventoryItemId) || 0) + 1);
      }
    }

    const results: InventoryRequirement[] = [];

    for (const [itemId, requiredQty] of requirements.entries()) {
      const item = globalWorkshopManager.getItem(itemId);
      if (!item) {
        results.push({
          itemId,
          itemName: 'Unknown Item',
          requiredQuantity: requiredQty,
          availableQuantity: 0,
          status: 'missing'
        });
      } else {
        results.push({
          itemId,
          itemName: item.name,
          requiredQuantity: requiredQty,
          availableQuantity: item.quantity,
          status: item.quantity >= requiredQty ? 'sufficient' : 'insufficient'
        });
      }
    }

    return results;
  }

  private analyzeHealth(): HealthIssue[] {
    const issues: HealthIssue[] = [];

    // Duplicate Labels
    const labels = listLabels();
    const labelCounts = new Map<string, number>();
    for (const lbl of labels) {
      labelCounts.set(lbl.name, (labelCounts.get(lbl.name) || 0) + 1);
    }
    for (const [name, count] of labelCounts.entries()) {
      if (count > 2) {
        // Having exactly 2 is normal (source and destination), more might be a warning or issue
        issues.push({
          id: `dup-label-${name}`,
          severity: 'warning',
          category: 'duplicate-label',
          message: `Label '${name}' is used ${count} times.`
        });
      }
    }

    // Disconnected Physical Modules & Orphaned references
    const physicalObjects = this.deviceWorkspaceManager.getWorkspace().layers.flatMap(l => l.objects);
    for (const obj of physicalObjects) {
      if (obj.kind === 'module') {
        // Basic check: is it wired up in the device workspace? 
        // For simplicity, we flag everything missing an inventory assignment
        // In real use, we'd query the net graph
        if (!obj.inventoryItemId) {
          issues.push({
            id: `disc-mod-${obj.id}`,
            severity: 'info',
            category: 'disconnected-module',
            message: `Module lacks connections and inventory assignment.`,
            targetObjectId: obj.id
          });
        }
      }
    }

    // Unused Inventory References
    // (If a component references an item that doesn't exist in the workshop anymore)
    const project = this.objectEngine.getProject();
    if (project) {
      for (const page of project.pages) {
        for (const layer of page.layers) {
          for (const obj of layer.objects) {
            if (obj.inventoryItemId && !globalWorkshopManager.getItem(obj.inventoryItemId)) {
              issues.push({
                id: `orphan-ref-${obj.id}`,
                severity: 'warning',
                category: 'unused-reference',
                message: `Component '${obj.name}' references a missing inventory item.`,
                targetObjectId: obj.id
              });
            }
          }
        }
      }
    }

    return issues;
  }
}
