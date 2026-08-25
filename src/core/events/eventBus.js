class EventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, []);
    }
    this._handlers.get(event).push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this._handlers.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  }

  emit(event, data) {
    const handlers = this._handlers.get(event);
    if (!handlers) return;
    handlers.forEach((h) => {
      try {
        h(data);
      } catch (e) {
        console.error("[EventBus] handler error:", e);
      }
    });
  }

  once(event, handler) {
    const wrapper = (data) => {
      handler(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  clear() {
    this._handlers.clear();
  }
}

export const eventBus = new EventBus();

export const AppEvents = {
  CASE_CREATED: "case:created",
  CASE_UPDATED: "case:updated",
  CASE_DELETED: "case:deleted",
  CASE_STATUS_CHANGED: "case:status-changed",
  NOTE_CREATED: "note:created",
  NOTE_UPDATED: "note:updated",
  EVENT_CREATED: "event:created",
  EVENT_UPDATED: "event:updated",
  BACKUP_COMPLETED: "backup:completed",
  BACKUP_IMPORTED: "backup:imported",
  GOAL_ACHIEVED: "goal:achieved",
  ERROR_OCCURRED: "error:occurred",
  SYNC_COMPLETED: "sync:completed",
  DATA_CLEARED: "data:cleared",
};
