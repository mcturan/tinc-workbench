import { ObjectEngine } from '../object-engine';
import { EventBus } from '../event-bus';
import { ElectricalGraphInstance } from './graph';
import { ElectricalGraphBuilder } from './builder';

export class NetResolver {
  private builder = new ElectricalGraphBuilder();
  private cachedGraph: ElectricalGraphInstance | null = null;
  private isDirty = true;
  private subscriptionId: string | null = null;

  constructor(
    private objectEngine: ObjectEngine,
    private eventBus?: EventBus
  ) {
    if (eventBus) {
      this.subscriptionId = eventBus.subscribe('command:*', () => {
        this.isDirty = true;
      }, { sync: true });
    }
  }

  getGraph(): ElectricalGraphInstance {
    if (this.isDirty || !this.cachedGraph) {
      this.cachedGraph = this.builder.build(this.objectEngine);
      this.isDirty = false;
    }
    return this.cachedGraph;
  }

  forceRebuild(): void {
    this.isDirty = true;
  }

  destroy(): void {
    if (this.eventBus && this.subscriptionId) {
      this.eventBus.unsubscribe(this.subscriptionId);
      this.subscriptionId = null;
    }
  }
}
