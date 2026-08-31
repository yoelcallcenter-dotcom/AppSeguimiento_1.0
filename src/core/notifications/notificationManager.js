import { eventBus, AppEvents } from "../events/eventBus";
import useNotificationStore from "./notificationStore";
import { ruleEngine } from "./ruleEngine";
import { soundSystem } from "./soundSystem";

class NotificationManager {
  constructor() {
    this._unsubscribers = [];
    this._initialized = false;
    this._config = {};
    this._queue = [];
    this._timer = null;
  }

  init(config = {}) {
    if (this._initialized) return;
    this._config = config;
    this._initialized = true;
    soundSystem.configure(config);

    const subscriptions = [
      AppEvents.CASE_CREATED,
      AppEvents.CASE_UPDATED,
      AppEvents.CASE_DELETED,
      AppEvents.CASE_STATUS_CHANGED,
      AppEvents.NOTE_CREATED,
      AppEvents.NOTE_UPDATED,
      AppEvents.EVENT_CREATED,
      AppEvents.EVENT_UPDATED,
      AppEvents.BACKUP_COMPLETED,
      AppEvents.BACKUP_IMPORTED,
      AppEvents.GOAL_ACHIEVED,
      AppEvents.ERROR_OCCURRED,
      AppEvents.SYNC_COMPLETED,
      AppEvents.DATA_CLEARED,
    ];

    subscriptions.forEach((evt) => {
      const unsub = eventBus.on(evt, (data) => this.handleEvent(data));
      this._unsubscribers.push(unsub);
    });
  }

  configure(config) {
    this._config = { ...this._config, ...config };
    soundSystem.configure(this._config);
    this._rescheduleFlush();
  }

  _frequencyMs() {
    const f = this._config.notifFrecuencia || "tiempo-real";
    const map = { "5min": 5 * 60 * 1000, "15min": 15 * 60 * 1000, "30min": 30 * 60 * 1000, "1h": 60 * 60 * 1000 };
    return map[f] || 0;
  }

  _rescheduleFlush() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    const ms = this._frequencyMs();
    if (ms > 0 && this._queue.length > 0) {
      this._timer = setTimeout(() => this._flushQueue(), ms);
    }
  }

  _enqueue(normalized) {
    this._queue.push(normalized);
    this._rescheduleFlush();
  }

  _flushQueue() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    if (this._queue.length === 0) return;
    const store = useNotificationStore.getState();
    const groupKey = "batch-notifications";
    const grouped = ruleEngine.findGrouped(store.notifications, groupKey);

    const first = this._queue[0];
    const count = this._queue.length;
    const event = {
      ...first,
      title: count > 1 ? `${count} notificaciones` : first.title,
      message: count > 1
        ? this._queue.map((n) => n.title || n.message).slice(0, 3).join(" · ") + (count > 3 ? ` +${count - 3} más` : "")
        : first.message,
      source: "batch",
      timestamp: Date.now(),
      count,
    };

    if (grouped.length > 0) {
      const latest = grouped[0];
      store.removeNotification(latest.id);
      event.count = (latest.count || 1) + count;
      event.title = `${event.count} notificaciones`;
    }

    const id = store.addNotification(event);
    if (ruleEngine.shouldPlaySound(event, this._config)) {
      soundSystem.play(event.type);
    }
    if (ruleEngine.shouldShowToast(event, this._config)) {
      store.addToast({ ...event, id: `toast-${id}`, duration: 6000 });
    }
    this._queue = [];
  }

  notify(event) {
    return this.handleEvent(event);
  }

  handleEvent(event) {
    if (!this._initialized) return null;

    const config = { ...this._config };
    const normalized = {
      ...event,
      priority: ruleEngine.resolvePriority(event),
      timestamp: event.timestamp || Date.now(),
    };

    if (!ruleEngine.shouldNotify(normalized, config)) return null;

    const store = useNotificationStore.getState();

    if (ruleEngine.isDuplicate(normalized, store.notifications)) return null;

    if (this._frequencyMs() > 0 && normalized.priority !== "critical") {
      this._enqueue(normalized);
      return "queued";
    }

    if (ruleEngine.shouldAggregate(normalized, store.notifications)) {
      return this._aggregateNotification(normalized);
    }

    const id = store.addNotification(normalized);

    if (ruleEngine.shouldPlaySound(normalized, this._config)) {
      soundSystem.play(normalized.type);
    }

    if (ruleEngine.shouldShowToast(normalized, this._config)) {
      const duration = normalized.priority === "critical" || normalized.priority === "high" ? 8000 : 4000;
      store.addToast({
        ...normalized,
        id: `toast-${id}`,
        duration,
      });
    }

    return id;
  }

  _aggregateNotification(event) {
    const store = useNotificationStore.getState();
    const groupKey = ruleEngine.getGroupKey(event);
    const grouped = ruleEngine.findGrouped(store.notifications, groupKey);

    if (grouped.length > 0) {
      const latest = grouped[0];
      store.removeNotification(latest.id);
      const aggregated = {
        ...latest,
        title: `${event.title} (${grouped.length + 1})`,
        message: `${event.message} +${grouped.length} más`,
        timestamp: Date.now(),
        count: (latest.count || 1) + 1,
      };
      return store.addNotification(aggregated);
    }
    return store.addNotification(event);
  }

  destroy() {
    this._unsubscribers.forEach((unsub) => unsub());
    this._unsubscribers = [];
    this._initialized = false;
  }
}

export const notificationManager = new NotificationManager();
