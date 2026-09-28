/**
 * Modal.jsx
 * Wrapper reutilizable de modales que unifica: portal al body, backdrop,
 * trampa de foco + restore, cierre con Escape, bloqueo de scroll de fondo,
 * click en backdrop configurable, ARIA y animaciones de entrada/salida.
 * Centraliza el comportamiento de todos los modales de la app.
 */

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useModal } from "../../hooks/useModal";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "sm:max-w-full",
};

export function Modal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  zIndex = "z-modal",
  footer,
  subheader,
  initialFocusRef,
}) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isRendered, setIsRendered] = useState(isOpen);
  const generatedTitleId = useId();

  const frozenRef = useRef({ title, icon: Icon, children, footer, subheader });
  if (isOpen) {
    frozenRef.current = { title, icon: Icon, children, footer, subheader };
  }

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const { dialogRef, handleBackdropClick } = useModal({
    isOpen,
    onClose,
    closeOnOverlayClick,
    onRequestClose: () => startClose(),
  });

  const startClose = () => {
    if (isLeaving) return;
    setIsLeaving(true);
  };

  // Animar salida antes de llamar a onClose
  useEffect(() => {
    if (isLeaving && isOpen) {
      const t = setTimeout(() => {
        if (onCloseRef.current) onCloseRef.current();
      }, 180);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isLeaving, isOpen]);

  // Manejar desmontaje tras animación de salida
  useLayoutEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsLeaving(false);
    } else if (isRendered) {
      setIsLeaving(true);
      const t = setTimeout(() => {
        setIsRendered(false);
        setIsLeaving(false);
      }, 180);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOpen]);

  if (!isRendered && !isOpen) return null;
  if (!isRendered) return null;

  const visible = isOpen
    ? { title, icon: Icon, children, footer, subheader }
    : frozenRef.current;
  const headerId = visible.title ? generatedTitleId : undefined;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 ${
        isLeaving ? "animate-fade-out" : "animate-fade-in"
      }`}
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headerId}
    >
      <div
        ref={dialogRef}
        className={`w-full ${SIZE_CLASSES[size] || SIZE_CLASSES.md} rounded-xl shadow-2xl flex flex-col max-h-[90vh] ${
          isLeaving ? "animate-modal-rise-out" : "animate-modal-rise-in"
        }`}
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
        }}
      >
        {visible.title && (
          <div
            className="modal-header flex-shrink-0"
            style={{ backgroundColor: "var(--color-bg)" }}
          >
            <div className="flex items-center gap-3">
              {visible.icon && <visible.icon size={20} color="var(--color-accent)" />}
              <h2
                id={headerId}
                className="text-base font-bold"
                style={{ color: "var(--color-text)" }}
              >
                {visible.title}
              </h2>
            </div>
            {showCloseButton && (
              <button
                onClick={startClose}
                className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Cerrar"
                ref={initialFocusRef}
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {visible.subheader && (
          <div
            className="flex-shrink-0 px-6 py-3 border-b"
            style={{
              backgroundColor: "var(--color-bg)",
              borderColor: "var(--color-border)",
            }}
          >
            {visible.subheader}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">{visible.children}</div>

        {visible.footer && (
          <div className="modal-footer flex-shrink-0 px-6 py-4 flex justify-end gap-2 border-t">
            {visible.footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
