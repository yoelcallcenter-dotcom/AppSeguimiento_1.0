const GROUP_WINDOW_MS = 5000;
const DEDUP_WINDOW_MS = 2000;

const TYPE_FILTER_MAP = {
  success: 'notifCambioEstado',
  info: 'notifCambioEstado',
  warning: 'notifReporte',
  error: 'notifError',
};

const PRIORITY_LEVEL_MAP = {
  low: 'baja',
  medium: 'media',
  high: 'grave',
  critical: 'grave',
};

const MIN_TOAST_PRIORITY = {
  none: -1,
  media: 1,
  grave: 2,
};

export const ruleEngine = {
  mapPriorityToLevel(priority) {
    return PRIORITY_LEVEL_MAP[priority] || 'baja';
  },

  shouldNotify(event, config = {}) {
    if (config.modoNoMolestar) return false;

    if (event.priority === 'critical') return true;

    const sourceType = event.source || event.type || '';
    let filterKey = TYPE_FILTER_MAP[event.type] || null;

    if (sourceType === 'backup' || event.title?.toLowerCase().includes('backup')) {
      filterKey = 'notifBackup';
    }
    if (sourceType === 'calendar' || sourceType === 'events' || event.title?.toLowerCase().includes('evento')) {
      filterKey = 'notifEvento';
    }

    if (filterKey && config[filterKey] === false) return false;

    const level = this.mapPriorityToLevel(event.priority);
    const minLevel = config.notifMinToastPriority || 'none';

    if (config.ignorarLowPriority && level === 'baja') return false;

    return true;
  },

  shouldShowToast(event, config = {}) {
    if (config.notifInApp === false) return false;
    const level = this.mapPriorityToLevel(event.priority);
    const minLevel = config.notifMinToastPriority || 'none';
    if (minLevel === 'none') return true;
    const levelRank = { baja: 0, media: 1, grave: 2 };
    return (levelRank[level] || 0) >= (levelRank[minLevel] || 0);
  },

  shouldPlaySound(event, config = {}) {
    if (config.notifSonido !== true) return false;
    const level = this.mapPriorityToLevel(event.priority);
    if (level === 'grave') return config.notifGraveSound !== false;
    if (level === 'media') return config.notifMediaSound === true;
    return config.notifBajaSound === true;
  },

  isDuplicate(event, recentNotifications) {
    return recentNotifications.some(
      (n) =>
        n.title === event.title &&
        n.message === event.message &&
        Date.now() - n.timestamp < DEDUP_WINDOW_MS
    );
  },

  getGroupKey(event) {
    return event.source || event.title || event.type;
  },

  findGrouped(notifications, groupKey) {
    return notifications.filter(
      (n) => this.getGroupKey(n) === groupKey && !n.read
    );
  },

  shouldAggregate(event, notifications) {
    const groupKey = this.getGroupKey(event);
    const recent = notifications.filter(
      (n) =>
        this.getGroupKey(n) === groupKey &&
        Date.now() - n.timestamp < GROUP_WINDOW_MS
    );
    return recent.length > 2;
  },

  resolvePriority(event) {
    if (event.priority) return event.priority;
    const map = {
      critical: 'critical',
      error: 'high',
      warning: 'medium',
      info: 'low',
      success: 'low',
    };
    return map[event.type] || 'low';
  },
};
