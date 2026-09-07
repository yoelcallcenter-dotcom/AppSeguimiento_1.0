import React, { useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { lockBodyScroll, unlockBodyScroll } from "../../utils/bodyScrollLock";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  confirmColor = "var(--color-accent)",
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  useDialogA11y(dialogRef, open, { onEscape: () => onCancel && onCancel() });

  React.useEffect(() => {
    if (!open) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-submodal flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl p-5 animate-scale-in"
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} color="var(--color-warning)" />
          <div
            id="confirm-dialog-title"
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            {title || "Confirmar accion"}
          </div>
        </div>
        {message && (
          <div className="text-xs mb-4" style={{ color: "var(--color-text)" }}>
            {message}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-base btn-ghost btn-sm"
            aria-label="Cancelar"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-base btn-sm"
            style={{ backgroundColor: confirmColor, color: "var(--color-text-on-accent)" }}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
