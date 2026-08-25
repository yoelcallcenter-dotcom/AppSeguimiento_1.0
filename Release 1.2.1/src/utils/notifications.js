/**
 * notifications.js
 * Sistema de notificaciones de la aplicación
 */

class NotificationService {
  constructor() {
    this.notifications = [];
    this.initialized = false;
    this.timers = [];
    this._config = null;
  }

  _loadConfig() {
    try {
      const raw = localStorage.getItem("config-art-tracker");
      this._config = raw ? JSON.parse(raw) : {};
    } catch {
      this._config = {};
    }
  }

  init() {
    if (this.initialized) return;
    this._loadConfig();
    this.load();
    this.initialized = true;
  }

  load() {
    try {
      const data = localStorage.getItem("app_notifications");
      this.notifications = data ? JSON.parse(data) : [];
    } catch {
      this.notifications = [];
    }
  }

  save() {
    try {
      localStorage.setItem(
        "app_notifications",
        JSON.stringify(this.notifications)
      );
    } catch {}
  }

  // ============ MOSTRAR NOTIFICACIÓN ============
  show(title, body, options = {}) {
    this._loadConfig();
    if (this._config.modoNoMolestar) return null;

    // Guardar en historial
    const notif = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false,
      type: options.type || "info",
      ...options,
    };
    this.notifications.push(notif);
    this.save();

    // Todas las notificaciones se muestran como toasts dentro de la app.
    // (No se usan notificaciones del navegador ni archivos de audio externos.)
    try {
      if (this._config.notifInApp !== false) {
        import("../core/notifications/notificationStore").then(({ default: store }) => {
          store.getState().addToast({
            title,
            message: body,
            type: options.type || "info",
            timestamp: Date.now(),
            duration: 5000,
          });
        });
      }
      import("../core/notifications/soundSystem").then(({ soundSystem }) => {
        soundSystem.play(options.type || "info");
      });
    } catch {}

    return notif;
  }

  // ============ GESTIÓN ============
  getNotifications(unreadOnly = false) {
    if (unreadOnly) {
      return this.notifications.filter((n) => !n.read);
    }
    return [...this.notifications];
  }

  getUnreadCount() {
    return this.notifications.filter((n) => !n.read).length;
  }

  markAsRead(id) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
      return true;
    }
    return false;
  }

  markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true));
    this.save();
  }

  deleteNotification(id) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.save();
  }

  clearAll() {
    this.notifications = [];
    this.save();
  }

  // ============ NOTIFICACIONES PROGRAMADAS ============
  scheduleReminder(eventData) {
    if (!eventData.fecha) return null;

    const eventDate = new Date(
      `${eventData.fecha}T${eventData.hora || "09:00:00"}`
    );
    const now = new Date();
    const timeDiff = eventDate.getTime() - now.getTime();

    // Si falta menos de 1 día, notificar inmediatamente
    if (timeDiff < 0) return null;

    // Programar para 1 hora antes del evento
    const reminderTime = timeDiff - 3600000; // 1 hora antes

    if (reminderTime > 0 && reminderTime < 86400000 * 3) {
      const timer = setTimeout(() => {
        this.show(
          `Recordatorio: ${eventData.titulo}`,
          `Evento programado para ${eventData.fecha} ${eventData.hora || ""}`
        );
      }, reminderTime);
      this.timers.push(timer);
      return timer;
    }
    return null;
  }

  // ============ NOTIFICACIONES DEL SISTEMA ============
  notifyCaseStatusChange(caso, oldStatus, newStatus) {
    return this.show(
      `Caso actualizado: ${caso.nombre || "Sin nombre"}`,
      `Estado: ${oldStatus} → ${newStatus}`,
      { type: "info", tag: `caso-${caso.id}` }
    );
  }

  notifyGoalAchieved(firmas, meta) {
    return this.show(
      "Objetivo alcanzado!",
      `Has alcanzado ${firmas} firmas de ${meta} (${Math.round(
        (firmas / meta) * 100
      )}%)`,
      { type: "success", tag: "objetivo" }
    );
  }

  notifyBackupComplete(type) {
    return this.show(
      "Backup completado",
      `Se exportaron los ${type} correctamente`,
      { type: "success", tag: "backup" }
    );
  }

  // ============ LIMPIEZA ============
  clearTimers() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }
}

export const notificationService = new NotificationService();
