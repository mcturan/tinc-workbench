import { EventBus } from '../src/event-bus';
import { Event } from '../src/types';

describe('Event Bus Unit Tests', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.clearSubscribers();
  });

  it('should execute subscribers in priority order', () => {
    const executionOrder: number[] = [];

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push(0);
    }, { priority: 0, sync: true });

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push(100);
    }, { priority: 100, sync: true });

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push(50);
    }, { priority: 50, sync: true });

    const event: Event = {
      namespace: 'core',
      name: 'test.event',
      payload: {},
    };

    eventBus.publish(event);

    expect(executionOrder).toEqual([100, 50, 0]);
  });

  it('should reject invalid priorities', () => {
    const callback = (_e: Event) => {};

    expect(() => {
      eventBus.subscribe('topic', callback, { priority: -1 });
    }).toThrow('Priority must be an integer between 0 and 100 inclusive');

    expect(() => {
      eventBus.subscribe('topic', callback, { priority: 101 });
    }).toThrow('Priority must be an integer between 0 and 100 inclusive');

    expect(() => {
      eventBus.subscribe('topic', callback, { priority: 5.5 });
    }).toThrow('Priority must be an integer between 0 and 100 inclusive');
  });

  it('should maintain deterministic FIFO order for equal-priority subscribers', () => {
    const executionOrder: string[] = [];

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push('first');
    }, { priority: 50, sync: true });

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push('second');
    }, { priority: 50, sync: true });

    const event: Event = {
      namespace: 'core',
      name: 'test.event',
      payload: {},
    };

    eventBus.publish(event);

    expect(executionOrder).toEqual(['first', 'second']);
  });

  it('should isolate failures and continue propagation for synchronous subscribers', () => {
    const executionOrder: string[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push('first');
    }, { priority: 100, sync: true });

    eventBus.subscribe('core:test.event', () => {
      throw new Error('Sync subscriber error');
    }, { priority: 50, sync: true });

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push('last');
    }, { priority: 0, sync: true });

    const event: Event = {
      namespace: 'core',
      name: 'test.event',
      payload: {},
    };

    eventBus.publish(event);

    expect(executionOrder).toEqual(['first', 'last']);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should isolate failures for asynchronous subscribers', async () => {
    const executionOrder: string[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push('first');
    }, { priority: 100, sync: false });

    eventBus.subscribe('core:test.event', () => {
      throw new Error('Async subscriber error');
    }, { priority: 50, sync: false });

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push('last');
    }, { priority: 0, sync: false });

    const event: Event = {
      namespace: 'core',
      name: 'test.event',
      payload: {},
    };

    eventBus.publish(event);

    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

    expect(executionOrder).toEqual(['first', 'last']);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should isolate failures for asynchronous subscribers returning rejected Promises', async () => {
    const executionOrder: string[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push('first');
    }, { priority: 100, sync: false });

    eventBus.subscribe('core:test.event', () => {
      return Promise.reject(new Error('Rejected Promise error'));
    }, { priority: 50, sync: false });

    eventBus.subscribe('core:test.event', () => {
      executionOrder.push('last');
    }, { priority: 0, sync: false });

    const event: Event = {
      namespace: 'core',
      name: 'test.event',
      payload: {},
    };

    eventBus.publish(event);

    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(executionOrder).toEqual(['first', 'last']);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should support event storm recursive loop protection', () => {
    eventBus.subscribe('core:loop.event', () => {
      eventBus.publish({
        namespace: 'core',
        name: 'loop.event',
        payload: {},
      });
    }, { priority: 50, sync: true });

    expect(() => {
      eventBus.publish({
        namespace: 'core',
        name: 'loop.event',
        payload: {},
      });
    }).toThrow('Event storm detected: maximum recursive publish depth exceeded');
  });

  it('should match wildcards correctly', () => {
    const received: string[] = [];

    eventBus.subscribe('core:object.*', (e) => {
      received.push(e.name);
    }, { priority: 50, sync: true });

    eventBus.publish({ namespace: 'core', name: 'object.created', payload: {} });
    eventBus.publish({ namespace: 'core', name: 'object.updated', payload: {} });
    eventBus.publish({ namespace: 'ui', name: 'object.created', payload: {} });

    expect(received).toEqual(['object.created', 'object.updated']);
  });
});
