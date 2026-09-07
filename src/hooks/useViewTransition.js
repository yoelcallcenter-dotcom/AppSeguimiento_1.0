/**
 * useViewTransition.js
 * Transición crossfade entre vistas: mantiene la vista anterior montada
 * durante la transición (opacity/pointer-events) para evitar la "pantalla
 * negra" y el salto visual, y luego la desmonta. También preserva la
 * posición de scroll de cada vista.
 */

import { useEffect, useRef, useState } from "react";

const TRANSITION_MS = 250;

export function useViewTransition(selectedView) {
  const [active, setActive] = useState(selectedView);
  const [previous, setPrevious] = useState(null);

  const scrollPositions = useRef({});
  const timerRef = useRef(null);

  // Sincronizar con selectedView; mantener la anterior montada mientras dura
  // la animación.
  useEffect(() => {
    if (selectedView === active) return undefined;

    // Guardar scroll de la vista saliente
    scrollPositions.current[active] = window.scrollY || 0;

    setPrevious(active);
    setActive(selectedView);

    // Restaurar scroll de la vista entrante (si alguna vez la visitamos)
    const target = scrollPositions.current[selectedView] || 0;
    requestAnimationFrame(() => {
      window.scrollTo(0, target);
    });

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
    showView: (view) => isVisible(view) || isLeavingView(view),
    classNameFor: (view) => {
      if (view === previous) {
        return "view-transition-exit";
      }
      return "view-transition-enter";
    },
  };
}
