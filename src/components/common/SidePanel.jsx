/**
 * SidePanel.jsx
 * Panel lateral derecho reutilizable (patrón Centro de Notificaciones):
 * backdrop oscuro con blur + panel que se desliza desde la derecha, header con
 * icono/título/cierre, cuerpo scrolleable y cierre animado (Escape, backdrop,
 * botón X) con bloqueo de scroll de fondo vía useModal.
 */

import React, { useEffect, useId, useState, useImperativeHandle } from "react";
import { X } from "lucide-react";
import { useModal } from "../../hooks/useModal";

export const SidePanel = React.forwardRef(function SidePanel(
  {
    isOpen,
    onClose,
    title,
    icon: Icon,
    actions,
    subheader,
    footer,
    children,
    width = "w-1/4 max-w-[560px] min-w-[320px]",
    closeOnOverlayClick = true,
  },
  ref
) {
  const [isLeaving, setIsLeaving] = useState(false);
  const titleId = useId();

  const startClose = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    setTimeout(() => {
      setIsLeaving(false);
      onClose?.();
    }, 250);
  };

  useImperativeHandle(ref, () => ({ startClose }), [isLeaving, onClose]);

  const { dialogRef, handleBackdropClick } = useModal({
    isOpen,
    onClose,
    closeOnOverlayClick,
    onRequestClose: startClose,
  });

  useEffect(() => {
    if (isOpen) setIsLeaving(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-notification ${
        isLeaving ? "animate-fade-out" : "animate-fade-in"
      }`}
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        className={`absolute right-0 top-0 bottom-0 ${width} rounded-l-xl shadow-2xl flex flex-col ${
          isLeaving ? "animate-slide-out-right" : "animate-slide-up"
        }`}
        style={{
          backgroundColor: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon size={18} color="var(--color-accent)" />}
            <h2
              id={titleId}
              className="text-base font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {actions}
            <button
              onClick={startClose}
              className="p-1.5 rounded transition-colors hover:bg-white/5"
              style={{ color: "var(--color-text-muted)" }}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {subheader && <div className="flex-shrink-0">{subheader}</div>}

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && <div className="flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
});

export default SidePanel;
