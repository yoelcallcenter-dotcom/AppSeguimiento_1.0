/**
 * wdyr.js — Perfilador de renders (solo desarrollo)
 *
 * Configura `@welldone-software/why-did-you-render` para detectar re-renders
 * innecesarios. Solo se activa en desarrollo (import.meta.env.DEV) y puede
 * desactivarse seteando la variable de entorno WDYR=0.
 *
 * NO se incluye en el bundle de producción.
 */
import React from "react";

const active =
  import.meta.env.DEV && process.env.WDYR !== "0";

if (active && typeof window !== "undefined") {
  // why-did-you-render necesita la hook de React DevTools.
  if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
  }
  const whyDidYouRender = require("@welldone-software/why-did-you-render");
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    logOnDifferentSignatures: true,
    onlyLogs: true,
    include: [/^TablaRow$/, /^CasoCard$/, /^KanbanColumn$/, /^NotificationItem$/],
  });
}

export default active;
