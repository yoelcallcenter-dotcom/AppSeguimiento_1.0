import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

export function Toast({ message, type = "success", onClose, duration = 1800 }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onClose(), 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    success: {
      bg: "var(--color-success)18",
      border: "var(--color-success)",
      icon: CheckCircle,
      text: "var(--color-success)",
    },
    error: {
      bg: "var(--color-danger)18",
      border: "var(--color-danger)",
      icon: XCircle,
      text: "var(--color-danger)",
    },
    info: {
      bg: "var(--color-primary)18",
      border: "var(--color-primary)",
      icon: Info,
      text: "var(--color-primary)",
    },
    warning: {
      bg: "var(--color-warning)18",
      border: "var(--color-warning)",
      icon: AlertTriangle,
      text: "var(--color-warning)",
    },
  };

  const style = colors[type] || colors.success;
  const Icon = style.icon;

  return (
    <div
      className={`fixed bottom-4 right-4 z-[100] ${exiting ? "animate-toast-out" : "animate-toast-in"}`}
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
        <Icon size={16} color={style.text} className="flex-shrink-0" />
        <span
          className="text-sm font-medium flex-1"
          style={{ color: "var(--color-text)" }}
        >
          {message}
        </span>
        <button
          onClick={() => {
            setExiting(true);
            setTimeout(() => onClose(), 200);
          }}
          className="ml-1 p-0.5 rounded transition-colors hover:bg-white/5 flex-shrink-0"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Cerrar notificacion"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
