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

// T18b (1.10.1): se borró la constante MIN_TOAST_PRIORITY — estaba muerta
// (nadie la leía: shouldNotify calculaba notifMinToastPriority sin usarlo y
// shouldShowToast usa su propio levelRank). El umbral SÍ está soportado: se
// aplica en shouldShowToast, que notificationManager.notify() invoca antes de
// pintar el toast, así que notifMinToastPriority funciona de verdad.

export const ruleEngine = {
  mapPriorityToLevel(priority) {
    return PRIORITY_LEVEL_MAP[priority] || 'baja';
  },

  shouldNotify(event, config = {}) {
    if (config.modoNoMolestar) return false;

    if (event.priority === 'critical') return true;

    const sourceType = event.source || event.type || '';
    let filterKey = TYPE_FILTER_MAP[event.type] || null;

    // T18c (1.10.1): los overrides de backup/evento solo miraban `title`, pero
    // alertsSystem emite toasts con title vacío y el texto en `message`
    // ("Evento proximo: …", vía useAppStore.addToast → notificationManager).
    // Esos eventos caían en el mapeo genérico warning→notifReporte y el
    // toggle de Eventos no los frenaba. Ahora el override mira title+message.
    // (warning→notifReporte se mantiene como default: los avisos "sin reporte"
    // de operatorMetrics/exportPDF son la fuente real con esa semántica.)
    const label = `${event.title || ''} ${event.message || ''}`.toLowerCase();
    if (sourceType === 'backup' || label.includes('backup')) {
      filterKey = 'notifBackup';
    }
    if (sourceType === 'calendar' || sourceType === 'events' || label.includes('evento')) {
      filterKey = 'notifEvento';
    }

    if (filterKey && config[filterKey] === false) return false;

    // C02-fix (1.10.1): ignorarLowPriority YA NO filtra shouldNotify. Antes
    // suprimía el registro en el Centro (shouldNotify es el gate de
    // addNotification), contradiciendo el texto de Configuración
    // ("suprime toast y sonido, pero SÍ se registra en el Centro"). Ahora el
    // filtro vive en shouldShowToast y shouldPlaySound (los dos efectos que el
    // texto promete suprimir). shouldNotify solo conserva los filtros de tipo
    // (notifCambioEstado, notifReporte, notifBackup, notifEvento, notifError),
    // el modoNoMolestar y los eventos críticos.
    return true;
  },

  shouldShowToast(event, config = {}) {
    if (config.notifInApp === false) return false;
    // C02-fix (1.10.1): ignorarLowPriority suprime el toast de prioridad
    // 'baja' (mapeada a level 'baja' cuando el evento no trae priority
    // explícita o es 'low'). El Centro NO se ve afectado.
    if (config.ignorarLowPriority === true && this.mapPriorityToLevel(event.priority) === 'baja') return false;
    const level = this.mapPriorityToLevel(event.priority);
    const minLevel = config.notifMinToastPriority || 'none';
    if (minLevel === 'none') return true;
    const levelRank = { baja: 0, media: 1, grave: 2 };
    return (levelRank[level] || 0) >= (levelRank[minLevel] || 0);
  },

  shouldPlaySound(event, config = {}) {
    if (config.notifSonido !== true) return false;
    // C02-fix (1.10.1): ignorarLowPriority también suprime el sonido de
    // prioridad 'baja' (además del toast en shouldShowToast).
    if (config.ignorarLowPriority === true && this.mapPriorityToLevel(event.priority) === 'baja') return false;
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
