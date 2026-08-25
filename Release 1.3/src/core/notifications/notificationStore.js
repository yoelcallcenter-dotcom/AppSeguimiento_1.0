import { create } from "zustand";

const STORAGE_KEY = "app_notification_center";

const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persist = (notifications) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {}
};

const useNotificationStore = create((set, get) => ({
  notifications: loadPersisted(),
  showCenter: false,
  showBellDropdown: false,
  toastQueue: [],
  persistentAlerts: [],

  getUnreadCount: () =>
    get().notifications.filter((n) => !n.read && !n.dismissed).length,

  addNotification: (notification) => {
    const id =
      notification.id ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const notif = {
      ...notification,
      id,
      timestamp: notification.timestamp || Date.now(),
      read: false,
      dismissed: false,
    };
    set((s) => {
      const updated = [notif, ...s.notifications].slice(0, 200);
      persist(updated);
      return { notifications: updated };
    });
    return id;
  },

  markAsRead: (id) => {
    set((s) => {
      const updated = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      persist(updated);
      return { notifications: updated };
    });
  },

  markAllAsRead: () => {
    set((s) => {
      const updated = s.notifications.map((n) => ({ ...n, read: true }));
      persist(updated);
      return { notifications: updated };
    });
  },

  dismissNotification: (id) => {
    set((s) => {
      const updated = s.notifications.map((n) =>
        n.id === id ? { ...n, dismissed: true } : n
      );
      persist(updated);
      return { notifications: updated };
    });
  },

  removeNotification: (id) => {
    set((s) => {
      const updated = s.notifications.filter((n) => n.id !== id);
      persist(updated);
      return { notifications: updated };
    });
  },

  clearAll: () => {
    set({ notifications: [] });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },

  setShowCenter: (show) => set({ showCenter: show }),
  setShowBellDropdown: (show) => set({ showBellDropdown: show }),

  addToast: (toast) => {
    const id =
      toast.id ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toastQueue: [...s.toastQueue, { ...toast, id }] }));
    return id;
  },

  removeToast: (id) => {
    set((s) => ({ toastQueue: s.toastQueue.filter((t) => t.id !== id) }));
  },

  addPersistentAlert: (alert) => {
    const id =
      alert.id ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({
      persistentAlerts: [...s.persistentAlerts, { ...alert, id }],
    }));
    return id;
  },

  removePersistentAlert: (id) => {
    set((s) => ({
      persistentAlerts: s.persistentAlerts.filter((a) => a.id !== id),
    }));
  },
}));

export default useNotificationStore;
