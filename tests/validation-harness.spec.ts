import { EventBus } from '../src/event-bus';
import { ValidationHarness } from '../src/ui/validation-harness';


describe('First 60 Seconds Validation Harness Tests', () => {
  it('should start timer on first action and log milestones correctly', () => {
    const eventBus = new EventBus();
    const harness = new ValidationHarness(eventBus);

    // 1. Initial State is unstarted
    expect((harness as any).startTime).toBeNull();

    // 2. First trigger starts timer
    harness.triggerFirstAction();
    const t0 = (harness as any).startTime;
    expect(t0).not.toBeNull();

    // 3. Simulating a CreateComponent command:executed event
    eventBus.publish({
      namespace: 'command',
      name: 'executed',
      payload: {
        commandId: 'cmd-1',
        delta: {
          forward: [
            {
              type: 'CREATE_COMPONENT',
              layerId: 'layer-1',
              component: {
                id: 'comp-1',
                type: 'ESP32',
                name: 'ESP32',
                ports: [],
                pins: [],
                properties: { x: 0, y: 0 }
              }
            }
          ],
          reverse: []
        }
      }
    });

    expect((harness as any).placementCount).toBe(1);
    expect((harness as any).firstPlacementTime).not.toBeNull();

    // 4. Reset returns everything to blank state
    harness.reset();
    expect((harness as any).startTime).toBeNull();
    expect((harness as any).placementCount).toBe(0);
  });
});
