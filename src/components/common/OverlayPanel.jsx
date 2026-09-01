import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { lockBodyScroll, unlockBodyScroll } from "../../utils/bodyScrollLock";

export function OverlayPanel({
  isOpen,
  onClose,
  title,
  children,
  icon: Icon,
  fullscreen = true,
  closeOnOverlayClick = true,
}) {
  const panelRef = useRef(null);
  useDialogA11y(panelRef, isOpen);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      lockBodyScroll();
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      unlockBodyScroll();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="rounded-xl shadow-2xl animate-scale-in flex flex-col"
        style={{
          width: fullscreen ? "90vw" : "720px",
          maxWidth: "95vw",
          maxHeight: "90vh",
          height: fullscreen ? "90vh" : "520px",
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          className="modal-header flex-shrink-0"
          style={{ backgroundColor: "var(--color-bg)" }}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon size={20} color="var(--color-accent)" />}
            <h2
              id="overlay-title"
              className="text-base font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:bg-white/5"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrolleable */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
