/**
 * useDialogA11y.js
 * Accesibilidad de diálogos modales: trampa de foco (Tab/Shift+Tab), foco
 * inicial al abrir y restauración del foco anterior al cerrar.
 *
 * N17 (1.10.1): Escape pasa a una ÚNICA pila global en fase capture. Antes
 * cada diálogo (y useKeyboardShortcuts en App) tenía su propio listener de
 * Escape en document: un solo Escape cerraba TODAS las capas a la vez (se
 * rompía useModalStack — p.ej. cancelar el ConfirmDialog cerraba también
 * VerCaso). Ahora solo se invoca el handler TOPE de la pila (LIFO = último
 * montado = capa superior) y el evento se cancela para el resto de listeners.
 * La fase capture garantiza que la pila corra antes que cualquier listener
 * bubble (document o elementos) sin depender del orden de registro.
 */

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Pila de handlers de Escape: solo el último registrado (capa superior) actúa.
const escapeStack = [];
let escapeListenerAttached = false;

function onGlobalEscape(e) {
  if (e.key !== "Escape") return;
  const top = escapeStack[escapeStack.length - 1];
  if (!top) return;
  // Cancela el evento para cualquier otro handler (useKeyboardShortcuts,
  // handlers internos de menús/búsquedas): una capa por Escape.
  e.preventDefault();
  e.stopImmediatePropagation();
  top();
}

function ensureEscapeListener() {
  if (escapeListenerAttached || typeof document === "undefined") return;
  document.addEventListener("keydown", onGlobalEscape, true);
  escapeListenerAttached = true;
}

// Solo para tests: limpia la pila entre casos.
export function __resetEscapeStack() {
  escapeStack.length = 0;
}

export function useDialogA11y(ref, enabled = true, options = {}) {
  const previousFocus = useRef(null);
  const { onEscape } = options;

  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

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
      first.focus({ preventScroll: true });
    } else {
      ref.current.setAttribute("tabindex", "-1");
      ref.current.focus({ preventScroll: true });
    }

    // N17 (1.10.1): Escape se atiende desde la pila global (capture), no acá.
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

    // N17 (1.10.1): si el diálogo define onEscape, se registra en la pila
    // global de Escape (capture). Solo se registra el TOPE al momento de la
    // tecla: al desmontarse (o desactivarse) se saca de la pila.
    const escapeEntry = onEscapeRef.current
      ? () => onEscapeRef.current?.()
      : null;
    if (escapeEntry) {
      ensureEscapeListener();
      escapeStack.push(escapeEntry);
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (escapeEntry) {
        const idx = escapeStack.lastIndexOf(escapeEntry);
        if (idx !== -1) escapeStack.splice(idx, 1);
      }
      if (previousFocus.current && document.contains(previousFocus.current)) {
        previousFocus.current.focus({ preventScroll: true });
      }
    };
  }, [ref, enabled]);
}
