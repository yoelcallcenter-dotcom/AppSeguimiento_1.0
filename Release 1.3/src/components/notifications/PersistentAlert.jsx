import React, { useState, useEffect } from "react";
import { AlertTriangle, X, Info, AlertCircle } from "lucide-react";
import useNotificationStore from "../../core/notifications/notificationStore";
import { soundSystem } from "../../core/notifications/soundSystem";

const ALERT_STYLES = {
  warning: {
    icon: AlertTriangle,
    bg: "var(--color-warning)11",
    border: "var(--color-warning)",
    text: "var(--color-warning)",
  },
  error: {
    icon: AlertCircle,
    bg: "var(--color-danger)11",
    border: "var(--color-danger)",
    text: "var(--color-danger)",
  },
  info: {
    icon: Info,
    bg: "var(--color-primary)11",
    border: "var(--color-primary)",
    text: "var(--color-primary)",
  },
};

const EXIT_MS = 300;

export function PersistentAlert({ type = "info", title, message, alertId, onDismiss }) {
  const removePersistentAlert = useNotificationStore((s) => s.removePersistentAlert);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    soundSystem.playAction("slide");
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => {
      if (alertId) removePersistentAlert(alertId);
      if (onDismiss) onDismiss();
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, alertId, onDismiss, removePersistentAlert]);

  const style = ALERT_STYLES[type] || ALERT_STYLES.info;
  const Icon = style.icon;

  const handleDismiss = () => {
    setLeaving(true);
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
        leaving ? "animate-toast-out" : "animate-toast-in"
      }`}
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
      }}
      role="alert"
    >
      <Icon size={16} color={style.text} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {title && (
          <div
            className="text-xs font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            {title}
          </div>
        )}
        <div
          className="text-xs mt-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          {message}
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 transition-colors hover:opacity-70"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Descartar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function PersistentAlertContainer() {
  const alerts = useNotificationStore((s) => s.persistentAlerts);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 w-full max-w-md px-4">
      {alerts.map((a) => (
        <PersistentAlert
          key={a.id}
          alertId={a.id}
          type={a.type}
          title={a.title}
          message={a.message}
          onDismiss={a.onDismiss}
        />
      ))}
    </div>
  );
}
