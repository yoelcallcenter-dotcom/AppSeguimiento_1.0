import React, { useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import useNotificationStore from "../../core/notifications/notificationStore";
import { SidePanel } from "../common/SidePanel";

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

const PRIORITY_BORDER_COLORS = {
  low: "var(--color-text-muted)",
  medium: "var(--color-warning)",
  high: "var(--color-danger)",
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

// Optimización 1.6.6: notificación extraída y memorizada para no re-renderizar
// todas las filas al cambiar una única notificación o el filtro.
const NotificationItem = React.memo(function NotificationItem({ n, onMarkAsRead, onRemove }) {
  const Icon = TYPE_ICONS[n.type] || Info;
  const color = TYPE_COLORS[n.type] || "var(--color-text-muted)";
  const borderColor = PRIORITY_BORDER_COLORS[n.priority] || "var(--color-text-muted)";
  return (
    <div
      className="flex items-start gap-2.5 px-4 py-2 border-b transition-colors hover:bg-white/5"
      style={{
        borderColor: "var(--color-border)",
        borderLeft: `3px solid ${borderColor}`,
        opacity: n.read ? 0.6 : 1,
      }}
    >
      <div className="mt-0.5 flex-shrink-0">
        <Icon size={14} color={color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            {!n.read && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "var(--color-accent)" }}
              />
            )}
            <span
              className="text-xs font-semibold truncate"
              style={{ color: "var(--color-text)" }}
            >
              {n.title}
            </span>
          </span>
          <span
            className="text-[10px] flex-shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            {formatTimestamp(n.timestamp)}
          </span>
          <div className="flex gap-1.5 ml-auto flex-shrink-0">
            {!n.read && (
              <button
                onClick={() => onMarkAsRead(n.id)}
                className="text-[10px] font-medium transition-colors hover:opacity-70"
                style={{ color: "var(--color-accent)" }}
              >
                Leído
              </button>
            )}
            <button
              onClick={() => onRemove(n.id)}
              className="text-[10px] font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--color-text-muted)" }}
            >
              Eliminar
            </button>
          </div>
        </div>
        <p
          className="text-[11px] mt-0 line-clamp-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          {n.message}
        </p>
      </div>
    </div>
  );
});

export function NotificationCenter() {
  const notifications = useNotificationStore((s) => s.notifications);
  const showCenter = useNotificationStore((s) => s.showCenter);
  const setShowCenter = useNotificationStore((s) => s.setShowCenter);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = notifications.filter((n) => !n.dismissed);
    if (filter === "unread") {
      list = list.filter((n) => !n.read);
    } else if (filter !== "all") {
      list = list.filter((n) => n.type === filter);
    }
    return list.slice(0, 200);
  }, [notifications, filter]);

  return (
    <SidePanel
      isOpen={showCenter}
      onClose={() => setShowCenter(false)}
      title="Centro de Notificaciones"
      icon={Bell}
      closeOnOverlayClick={false}
      actions={
        <>
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
        </>
      }
      subheader={
        <div
          className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto"
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
                backgroundColor: filter === opt.value ? "color-mix(in srgb, var(--color-accent) 6.7%, transparent)" : "transparent",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      }
      footer={
        <div
          className="px-4 py-2 text-[10px] border-t text-center"
          style={{
            color: "var(--color-text-muted)",
            borderColor: "var(--color-border)",
          }}
        >
          {notifications.filter((n) => !n.dismissed).length} notificaciones
        </div>
      }
    >
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-full text-xs px-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Bell size={32} className="mb-2 opacity-30" />
          No hay notificaciones{filter !== "all" ? " con este filtro" : ""}
        </div>
      ) : (
        filtered.map((n) => (
          <NotificationItem
            key={n.id}
            n={n}
            onMarkAsRead={markAsRead}
            onRemove={removeNotification}
          />
        ))
      )}
    </SidePanel>
  );
}
