import { generateUUID } from '../utils';
import { Event, EventSubscription } from '../types';

export class EventBus {
  private subscribers: Map<string, EventSubscription[]> = new Map();
  private isBuffering = false;
  private eventBuffer: Event[] = [];
  private activePublishDepth = 0;
  private readonly MAX_PUBLISH_DEPTH = 15;

  subscribe(
    topic: string,
    callback: (event: Event) => void | Promise<void>,
    options?: { priority?: number; sync?: boolean; scope?: string }
  ): string {
    if (!topic || topic.trim() === '') {
      throw new Error('Topic cannot be empty');
    }

    const priority = options?.priority ?? 50;
    if (typeof priority !== 'number' || !Number.isInteger(priority) || priority < 0 || priority > 100) {
      throw new Error('Priority must be an integer between 0 and 100 inclusive');
    }

    const subscriptionId = generateUUID();
    const sync = options?.sync ?? false;

    let namespace = '*';
    let name = topic;
    if (topic.includes(':')) {
      const parts = topic.split(':');
      namespace = parts[0];
      name = parts[1];
    }

    const subscription: EventSubscription & { sync: boolean; topicPattern: string } = {
      id: subscriptionId,
      namespace,
      name,
      priority,
      callback,
      sync,
      topicPattern: topic,
    };

    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    const list = this.subscribers.get(topic)!;
    list.push(subscription);

    this.sortSubscribers(topic);

    return subscriptionId;
  }

  private sortSubscribers(topic: string) {
    const list = this.subscribers.get(topic);
    if (!list) return;

    // Stable sort: higher priority first
    list.sort((a, b) => b.priority - a.priority);
  }

  unsubscribe(subscriptionId: string): boolean {
    let found = false;
    for (const [topic, list] of this.subscribers.entries()) {
      const index = list.findIndex((sub) => sub.id === subscriptionId);
      if (index !== -1) {
        list.splice(index, 1);
        found = true;
        if (list.length === 0) {
          this.subscribers.delete(topic);
        }
        break;
      }
    }
    return found;
  }

  publish(event: Event): void {
    if (!event.namespace || !event.name || event.payload === undefined) {
      throw new Error('Invalid event structure: namespace, name, and payload are required');
    }

    this.activePublishDepth++;
    if (this.activePublishDepth > this.MAX_PUBLISH_DEPTH) {
      this.activePublishDepth--;
      throw new Error('Event storm detected: maximum recursive publish depth exceeded');
    }

    try {
      if (this.isBuffering) {
        this.eventBuffer.push(event);
        return;
      }

      const matchedSubscriptions: (EventSubscription & { sync: boolean; topicPattern: string })[] = [];
      const eventTopic = `${event.namespace}:${event.name}`;

      for (const [pattern, list] of this.subscribers.entries()) {
        if (this.matchesTopic(eventTopic, pattern)) {
          matchedSubscriptions.push(...(list as any));
        }
      }

      // Sort globally by priority desc
      matchedSubscriptions.sort((a, b) => b.priority - a.priority);

      for (const sub of matchedSubscriptions) {
        if (sub.sync) {
          try {
            const res = sub.callback(event);
            if (res instanceof Promise) {
              res.catch((err) => {
                console.error(`Error in synchronous subscriber promise for topic ${sub.topicPattern}:`, err);
              });
            }
          } catch (err: any) {
            if (err instanceof Error && err.message.includes('Event storm detected')) {
              throw err;
            }
            console.error(`Error in synchronous subscriber for topic ${sub.topicPattern}:`, err);
          }
        } else {
          // Asynchronous dispatch using microtask queue
          queueMicrotask(() => {
            try {
              const res = sub.callback(event);
              if (res instanceof Promise) {
                res.catch((err) => {
                  console.error(`Error in asynchronous subscriber promise for topic ${sub.topicPattern}:`, err);
                });
              }
            } catch (err) {
              console.error(`Error in asynchronous subscriber for topic ${sub.topicPattern}:`, err);
            }
          });
        }
      }
    } finally {
      this.activePublishDepth--;
    }
  }

  private matchesTopic(eventTopic: string, pattern: string): boolean {
    if (pattern === '*' || pattern === '*:*') {
      return true;
    }
    const escapedPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^:]*');
    const regex = new RegExp(`^${escapedPattern}$`);
    return regex.test(eventTopic);
  }

  registerPrioritySubscriber(topic: string, callback: (event: Event) => void, priority: number): string {
    return this.subscribe(topic, callback, { priority, sync: true });
  }

  bufferEvents(): void {
    this.isBuffering = true;
  }

  flushBufferedEvents(): void {
    this.isBuffering = false;
    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    const squashedEvents: Event[] = [];
    const seen = new Set<string>();

    for (let i = eventsToFlush.length - 1; i >= 0; i--) {
      const event = eventsToFlush[i];
      const key = `${event.namespace}:${event.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        squashedEvents.unshift(event);
      }
    }

    for (const event of squashedEvents) {
      this.publish(event);
    }
  }

  clearSubscribers(): void {
    this.subscribers.clear();
  }
}
