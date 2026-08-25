import React, { useRef, useEffect } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import useNotificationStore from "../../core/notifications/notificationStore";

export function NotificationBell() {
  const dropdownRef = useRef(null);
  const notifications = useNotificationStore((s) => s.notifications);
  const showDropdown = useNotificationStore((s) => s.showBellDropdown);
  const setShowDropdown = useNotificationStore((s) => s.setShowBellDropdown);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  const unreadCount = notifications.filter((n) => !n.read && !n.dismissed).length;
  const recent = notifications.filter((n) => !n.dismissed).slice(0, 5);

  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown, setShowDropdown]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2.5 rounded-md transition-colors hover:bg-white/5 relative"
        style={{ color: "var(--color-text-muted)" }}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} no leídas)` : ""}`}
        title="Notificaciones"
        data-tour="modo-no-molestar"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[10px] font-bold min-w-[16px] h-4 px-1"
            style={{
              backgroundColor: "var(--color-danger)",
              color: "#FFFFFF",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-lg shadow-xl border z-50 animate-fade-in"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              Notificaciones
            </span>
            <div className="flex gap-1">
              <button
                onClick={markAllAsRead}
                className="p-1 rounded transition-colors hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Marcar todo como leído"
                title="Marcar todo leído"
              >
                <CheckCheck size={14} />
              </button>
              <button
                onClick={clearAll}
                className="p-1 rounded transition-colors hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Limpiar todas"
                title="Limpiar todas"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {recent.length === 0 ? (
              <div
                className="px-4 py-6 text-center text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                Sin notificaciones
              </div>
            ) : (
              recent.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className="w-full text-left px-4 py-2.5 transition-colors hover:bg-white/5 border-b last:border-b-0"
                  style={{
                    borderColor: "var(--color-border)",
                    opacity: n.read ? 0.6 : 1,
                  }}
                >
                  <div
                    className="text-xs font-medium truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    {!n.read && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                        style={{ backgroundColor: "var(--color-accent)" }}
                      />
                    )}
                    {n.title}
                  </div>
                  <div
                    className="text-[11px] truncate mt-0.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {n.message}
                  </div>
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => {
              useNotificationStore.getState().setShowCenter(true);
              setShowDropdown(false);
            }}
            className="w-full px-4 py-2 text-xs font-semibold text-center transition-colors hover:bg-white/5 border-t"
            style={{
              color: "var(--color-accent)",
              borderColor: "var(--color-border)",
            }}
          >
            Ver todas
          </button>
        </div>
      )}
    </div>
  );
}
