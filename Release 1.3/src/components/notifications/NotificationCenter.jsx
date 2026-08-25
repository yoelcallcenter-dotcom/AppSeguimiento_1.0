import React, { useState, useMemo, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Filter,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import useNotificationStore from "../../core/notifications/notificationStore";
import { lockBodyScroll, unlockBodyScroll } from "../../utils/bodyScrollLock";

const TYPE_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  critical: AlertTriangle,
};

const TYPE_COLORS = {
  success: "var(--color-success)",
  error: "var(--color-danger)",
  warning: "var(--color-warning)",
  info: "var(--color-primary)",
  critical: "var(--color-danger)",
};

const FILTER_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "No leídas" },
  { value: "success", label: "Éxito" },
  { value: "info", label: "Información" },
  { value: "warning", label: "Advertencia" },
  { value: "error", label: "Error" },
  { value: "critical", label: "Críticas" },
];

function formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "Ahora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return d.toLocaleDateString();
}

export function NotificationCenter() {
  const notifications = useNotificationStore((s) => s.notifications);
  const showCenter = useNotificationStore((s) => s.showCenter);
  const setShowCenter = useNotificationStore((s) => s.setShowCenter);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (showCenter) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [showCenter]);

  const filtered = useMemo(() => {
    let list = notifications.filter((n) => !n.dismissed);
    if (filter === "unread") {
      list = list.filter((n) => !n.read);
    } else if (filter !== "all") {
      list = list.filter((n) => n.type === filter);
    }
    return list.slice(0, 200);
  }, [notifications, filter]);

  if (!showCenter) return null;

  return (
    <div
      className="fixed inset-0 z-[110] animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-title"
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-lg rounded-l-xl shadow-2xl animate-slide-up flex flex-col"
        style={{
          backgroundColor: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Bell size={18} color="var(--color-accent)" />
            <h2
              id="notification-center-title"
              className="text-base font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              Centro de Notificaciones
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={markAllAsRead}
              className="p-1.5 rounded transition-colors hover:bg-white/5"
              style={{ color: "var(--color-text-muted)" }}
              aria-label="Marcar todo leído"
              title="Marcar todo leído"
            >
              <CheckCheck size={16} />
            </button>
            <button
              onClick={clearAll}
              className="p-1.5 rounded transition-colors hover:bg-white/5"
              style={{ color: "var(--color-text-muted)" }}
              aria-label="Limpiar todas"
              title="Limpiar todas"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setShowCenter(false)}
              className="p-1.5 rounded transition-colors hover:bg-white/5"
              style={{ color: "var(--color-text-muted)" }}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-2.5 border-b flex-shrink-0 overflow-x-auto"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Filter size={12} color="var(--color-text-muted)" className="flex-shrink-0" />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className="text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap flex-shrink-0"
              style={{
                color: filter === opt.value ? "var(--color-accent)" : "var(--color-text-muted)",
                borderColor: filter === opt.value ? "var(--color-accent)" : "var(--color-border)",
                backgroundColor: filter === opt.value ? "var(--color-accent)11" : "transparent",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full text-xs px-6"
              style={{ color: "var(--color-text-muted)" }}
            >
              <Bell size={32} className="mb-2 opacity-30" />
              No hay notificaciones{filter !== "all" ? " con este filtro" : ""}
            </div>
          ) : (
            filtered.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Info;
              const color = TYPE_COLORS[n.type] || "var(--color-text-muted)";
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-5 py-3 border-b transition-colors hover:bg-white/5"
                  style={{
                    borderColor: "var(--color-border)",
                    opacity: n.read ? 0.6 : 1,
                  }}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <Icon size={16} color={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: "var(--color-accent)" }}
                        />
                      )}
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: "var(--color-text)" }}
                      >
                        {n.title}
                      </span>
                      <span
                        className="text-[10px] flex-shrink-0 ml-auto"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {formatTimestamp(n.timestamp)}
                      </span>
                    </div>
                    <p
                      className="text-[11px] mt-0.5 line-clamp-2"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {n.message}
                    </p>
                    <div className="flex gap-2 mt-1.5">
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="text-[10px] font-medium transition-colors hover:opacity-70"
                          style={{ color: "var(--color-accent)" }}
                        >
                          Marcar leído
                        </button>
                      )}
                      <button
                        onClick={() => removeNotification(n.id)}
                        className="text-[10px] font-medium transition-colors hover:opacity-70"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          className="px-5 py-2.5 text-[10px] border-t flex-shrink-0 text-center"
          style={{
            color: "var(--color-text-muted)",
            borderColor: "var(--color-border)",
          }}
        >
          {notifications.filter((n) => !n.dismissed).length} notificaciones
        </div>
      </div>
    </div>
  );
}
