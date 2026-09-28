/**
 * useViewTransition.js
 * Transición con movimiento horizontal entre vistas: cada vista visitada
 * permanece montada (oculta con display:none) para conservar su estado y
 * evitar remontajes/cargas al cambiar de pestaña. La entrante se desliza
 * opaca POR ENCIMA de la saliente, que deriva en parallax (der↔izq según
 * el orden de pestañas) y queda recortada a la altura de la entrante. Al
 * terminar la transición, la activa queda sin clases de animación (sin
 * transform ni will-change residual, para no afectar a hijos fixed). El
 * scroll nunca se manipula: el navegador conserva la posición actual.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const TRANSITION_MS = 250;

export function useViewTransition(selectedView, order = []) {
  const [active, setActive] = useState(selectedView);
  const [previous, setPrevious] = useState(null);
  const directionRef = useRef("fade");
  const timerRef = useRef(null);
  const visitedRef = useRef(null);
  if (visitedRef.current === null) {
    visitedRef.current = new Set([selectedView]);
  }

  // Sincronizar con selectedView; mantener la anterior visible mientras dura
  // la animación y calcular la dirección según el orden de pestañas.
  useLayoutEffect(() => {
    visitedRef.current.add(selectedView);
    if (selectedView === active) return undefined;

    const from = order.indexOf(active);
    const to = order.indexOf(selectedView);
    directionRef.current =
      from === -1 || to === -1 || from === to
        ? "fade"
        : to > from
        ? "right"
        : "left";

    setPrevious(active);
    setActive(selectedView);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPrevious(null);
    }, TRANSITION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedView]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isVisible = (view) => view === active;
  const isLeavingView = (view) => view === previous;

  return {
    active,
    previous,
    showView: (view) => visitedRef.current.has(view),
    isHiddenView: (view) => !isVisible(view) && !isLeavingView(view),
    classNameFor: (view) => {
      const dir = directionRef.current;
      if (previous !== null && view === previous) {
        if (dir === "fade") return "view-transition-exit view-exit-fade";
        return `view-transition-exit view-exit-${dir === "right" ? "left" : "right"}`;
      }
      if (!isVisible(view)) return "view-transition-hidden";
      if (previous === null) return "";
      if (dir === "fade") return "view-transition-enter view-enter-fade";
      return `view-transition-enter view-enter-${dir}`;
    },
  };
}
