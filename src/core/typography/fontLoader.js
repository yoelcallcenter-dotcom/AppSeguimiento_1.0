/**
 * fontLoader.js
 * Carga progresiva de las familias tipográficas del preset activo desde
 * Google Fonts CDN (primer uso) con `font-display: swap` para evitar textos
 * invisibles. Solo se inyectan los <link> de las familias del preset actual.
 *
 * Estrategia:
 *  - Preconnect a los orígenes de Google Fonts.
 *  - Un único stylesheet con las familias del preset activo.
 *  - Si ya se cargó el mismo preset, no se vuelve a inyectar.
 *  - Los presets inactivos no se cargan (no bloquear render ni bundle).
 */

import { getPresetById, buildGoogleFontsURL } from "./presets";

const PREFS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];
const STYLESHEET_ID = "appseguimiento-typography-stylesheet";

function addPreconnect() {
  for (const href of PREFS) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
      continue;
    }
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    link.crossOrigin = href.includes("fonts.gstatic.com") ? "anonymous" : "";
    document.head.appendChild(link);
  }
}

let lastLoadedFamiliesKey = "";

/**
 * Carga (o mantiene) las familias del preset dado en la página.
 * @param {string} presetId id del preset.
 */
export function loadFamilies(presetId) {
  const preset = getPresetById(presetId);
  if (!preset) return;

  const key = (preset.families || []).join("|");
  if (key === lastLoadedFamiliesKey) return;
  lastLoadedFamiliesKey = key;

  const existing = document.getElementById(STYLESHEET_ID);
  if (existing) existing.remove();

  addPreconnect();

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.id = STYLESHEET_ID;
  link.href = buildGoogleFontsURL(preset);
  document.head.appendChild(link);
}
