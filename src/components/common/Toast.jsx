import React, { useEffect } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

export function Toast({ message, type = "success", onClose, duration = 1200 }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    success: {
      bg: "var(--color-success)22",
      border: "var(--color-success)",
      icon: CheckCircle,
      text: "var(--color-success)",
    },
    error: {
      bg: "var(--color-danger)22",
      border: "var(--color-danger)",
      icon: XCircle,
      text: "var(--color-danger)",
    },
    info: {
      bg: "var(--color-primary)22",
      border: "var(--color-primary)",
      icon: Info,
      text: "var(--color-primary)",
    },
    warning: {
      bg: "var(--color-warning)22",
      border: "var(--color-warning)",
      icon: AlertTriangle,
      text: "var(--color-warning)",
    },
  };

  const style = colors[type] || colors.success;
  const Icon = style.icon;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] animate-slide-up"
      role="alert"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg max-w-sm"
        style={{
          backgroundColor: "var(--color-surface)",
          border: `1px solid ${style.border}`,
        }}
      >
        <Icon size={16} color={style.text} />
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-text)" }}
        >
          {message}
        </span>
        <button
          onClick={onClose}
          className="ml-2 transition-colors hover:opacity-70"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Cerrar notificacion"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
