import type { SubmissionRequest } from '@messaging/schemas';
import type { PreparedCard } from './dedupe';

export interface QueueItem {
  captureId: string;
  cards: PreparedCard[];
  request: SubmissionRequest;
  enqueuedAt: number;
  attempts: number;
}

type QueueEvent = 'enqueue' | 'dequeue';

type QueueEventListener = (item: QueueItem) => void;

type QueueSubscriber = (item: QueueItem) => void;

export class SubmissionQueue {
  private items: QueueItem[] = [];

  private listeners: Map<QueueEvent, Set<QueueEventListener>> = new Map();

  enqueue(item: QueueItem) {
    const queued: QueueItem = { ...item, enqueuedAt: Date.now(), attempts: item.attempts ?? 0 };
    this.items.push(queued);
    this.emit('enqueue', queued);
  }

  dequeue(): QueueItem | undefined {
    const item = this.items.shift();
    if (item) {
      this.emit('dequeue', item);
    }
    return item;
  }

  peek(): QueueItem | undefined {
    return this.items[0];
  }

  size(): number {
    return this.items.length;
  }

  on(event: QueueEvent, listener: QueueSubscriber) {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners as Set<QueueEventListener>);
    return () => listeners.delete(listener);
  }

  private emit(event: QueueEvent, item: QueueItem) {
    const listeners = this.listeners.get(event);
    listeners?.forEach((listener) => {
      try {
        listener(item);
      } catch (error) {
        console.error('Queue listener error', error);
      }
    });
  }
}

export const submissionQueue = new SubmissionQueue();
