import React, { useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useDialogA11y } from "../../hooks/useDialogA11y";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  confirmColor = "var(--color-accent)",
  onConfirm,
  onCancel,
  showToast,
}) {
  const dialogRef = useRef(null);
  useDialogA11y(dialogRef, open);

  if (!open) return null;

  const handleConfirm = () => {
    if (showToast) {
      showToast("Acción confirmada", "success");
    }
    onConfirm();
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl p-5"
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
            className="px-3.5 py-2 rounded-md text-xs font-semibold transition-colors hover:opacity-70"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Cancelar"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors hover:opacity-80"
            style={{ backgroundColor: confirmColor, color: "#14181F" }}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
