type EventHandler = (...args: any[]) => void;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]): void {
    this.handlers.get(event)?.forEach((handler) => handler(...args));
  }
}

export const eventBus = new EventBus();

export const EVENTS = {
  UNREAD_COUNT_UPDATED: 'unread-count-updated',
  MESSAGES_READ: 'messages-read',
} as const;
