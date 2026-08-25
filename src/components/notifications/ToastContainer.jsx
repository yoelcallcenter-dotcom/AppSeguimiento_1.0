import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import useNotificationStore from "../../core/notifications/notificationStore";
import useCelebrationStore from "../../core/celebrations/celebrationStore";
import { CelebrationBanner } from "../common/Celebration";
import { soundSystem } from "../../core/notifications/soundSystem";

const TYPE_STYLES = {
  success: { icon: CheckCircle, color: "var(--color-success)" },
  error: { icon: XCircle, color: "var(--color-danger)" },
  warning: { icon: AlertTriangle, color: "var(--color-warning)" },
  info: { icon: Info, color: "var(--color-primary)" },
  critical: { icon: AlertTriangle, color: "var(--color-danger)" },
};

const EXIT_MS = 300;

function ToastItem({ toast, onRemove }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.duration]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(onRemove, EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, onRemove]);

  useEffect(() => {
    soundSystem.playAction("slide");
  }, []);

  const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
  const Icon = toast.icon || style.icon;
  const iconColor = toast.icon ? "var(--color-accent)" : style.color;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg max-w-sm ${
        leaving ? "animate-toast-out" : "animate-toast-in"
      }`}
      role="alert"
      aria-live="polite"
      style={{
        backgroundColor: "var(--color-surface)",
        border: `1px solid ${style.color}`,
      }}
    >
      <Icon size={16} color={iconColor} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div
            className="text-xs font-semibold truncate"
            style={{ color: "var(--color-text)" }}
          >
            {toast.title}
          </div>
        )}
        <div
          className="text-xs truncate"
          style={{ color: "var(--color-text-muted)" }}
        >
          {toast.message}
        </div>
      </div>
      <button
        onClick={() => setLeaving(true)}
        className="flex-shrink-0 transition-colors hover:opacity-70"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toastQueue = useNotificationStore((s) => s.toastQueue);
  const removeToast = useNotificationStore((s) => s.removeToast);
  const celebrationActive = useCelebrationStore((s) => s.active);

  return (
    <div
      data-toast-container
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end"
    >
      {celebrationActive && <CelebrationBanner />}
      {toastQueue.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onRemove={() => removeToast(t.id)}
        />
      ))}
    </div>
  );
}
