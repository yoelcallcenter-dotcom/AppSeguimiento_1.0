/**
 * useDialogA11y.js
 * Accesibilidad de diálogos modales: trampa de foco (Tab/Shift+Tab), foco
 * inicial al abrir y restauración del foco anterior al cerrar.
 */

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function useDialogA11y(ref, enabled = true) {
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!enabled || !ref || !ref.current) return undefined;

    previousFocus.current = document.activeElement;

    const getFocusable = () => {
      const root = ref.current;
      if (!root) return [];
      return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
    };

    // Foco inicial: primer elemento enfocable o el contenedor como último recurso.
    const first = getFocusable()[0];
    if (first) {
      first.focus();
    } else {
      ref.current.setAttribute("tabindex", "-1");
      ref.current.focus();
    }

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus.current && document.contains(previousFocus.current)) {
        previousFocus.current.focus();
      }
    };
  }, [ref, enabled]);
}
