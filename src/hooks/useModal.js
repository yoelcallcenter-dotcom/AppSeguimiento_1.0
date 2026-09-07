/**
 * useModal.js
 * Comportamiento unificado de modales: trampa de foco + restore, cierre con
 * Escape, bloqueo de scroll de fondo y cierre por click en el backdrop.
 * Centraliza useDialogA11y + bodyScrollLock para todos los modales.
 */

import { useEffect, useRef } from "react";
import { useDialogA11y } from "./useDialogA11y";
import { lockBodyScroll, unlockBodyScroll } from "../utils/bodyScrollLock";

export function useModal({
  isOpen = false,
  onClose,
  closeOnOverlayClick = true,
  onEscape,
  onRequestClose,
}) {
  const dialogRef = useRef(null);

  // onRequestClose permite animar la salida (ej. el wrapper Modal) antes de
  // llamar onClose. Sin él, Escape/backdrop llaman onClose directamente.
  const requestClose = onRequestClose || onClose;

  const handleEscape = () => {
    if (onEscape) onEscape();
    else if (requestClose) requestClose();
  };

  useDialogA11y(dialogRef, isOpen, { onEscape: handleEscape });

  useEffect(() => {
    if (!isOpen) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget && requestClose) {
      requestClose();
    }
  };

  return { dialogRef, handleBackdropClick, handleEscape };
}
