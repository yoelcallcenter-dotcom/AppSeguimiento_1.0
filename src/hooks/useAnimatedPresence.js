/**
 * useAnimatedPresence.js
 * Utilidades de salida animada para modales/paneles:
 * - useAnimatedPresence(isOpen): el componente permanece montado durante
 *   `exitMs` ms tras cerrar para poder animar la salida (padre mantiene
 *   el nodo renderizado con isOpen=false).
 * - useDelayedClose(onClose): startClose() anima la salida y recién
 *   entonces llama a onClose (padre con render condicional que desmonta).
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const DEFAULT_EXIT_MS = 180;

export function useAnimatedPresence(isOpen, exitMs = DEFAULT_EXIT_MS) {
  const [isRendered, setIsRendered] = useState(!!isOpen);
  const [isLeaving, setIsLeaving] = useState(false);

  useLayoutEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsLeaving(false);
      return undefined;
    }
    if (!isRendered) return undefined;
    setIsLeaving(true);
    const t = setTimeout(() => {
      setIsRendered(false);
      setIsLeaving(false);
    }, exitMs);
    return () => clearTimeout(t);
  }, [isOpen]);

  return { isRendered, isLeaving };
}

export function useDelayedClose(onClose, exitMs = DEFAULT_EXIT_MS) {
  const [isClosing, setIsClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const startClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  useEffect(() => {
    if (!isClosing) return undefined;
    const t = setTimeout(() => {
      if (onCloseRef.current) onCloseRef.current();
    }, exitMs);
    return () => clearTimeout(t);
  }, [isClosing, exitMs]);

  return { isClosing, startClose };
}
