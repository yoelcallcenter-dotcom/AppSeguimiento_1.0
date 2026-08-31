/**
 * typographyManager.js
 * Singleton que centraliza el sistema tipográfico de AppSeguimiento.
 *
 * Responsabilidad:
 *  - Leer/aplicar/persistir el preset tipográfico activo.
 *  - Aplicar las variables CSS globales --font-ui, --font-heading, --font-metric
 *    y --font-family sobre el elemento raíz del documento (sin tocar colores).
 *  - Mantener el tamaño de fuente global (misma clave y comportamiento que el
 *    FontSizeContext histórico, para no perder preferencias existentes).
 *
 * Sigue el mismo patrón de `themeManager`: persiste en localStorage con claves
 * raw (coherente con las preferencias de apariencia actuales).
 */

import {
  TYPOGRAPHY_PRESETS,
  DEFAULT_TYPOGRAPHY_PRESET,
  isValidPreset,
  getPresetById,
} from "./presets";
import { loadFamilies } from "./fontLoader";

const STORAGE_PRESET_KEY = "app-typography-preset";
const STORAGE_FONT_SIZE_KEY = "app-font-size";

const FONT_SIZE_MAP = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

let currentPreset = DEFAULT_TYPOGRAPHY_PRESET;
let currentFontSize = "medium";

// Suscriptores notificados cuando cambia el preset o el tamaño de fuente.
// Permite mantener sincronizados los contexts (Typography/FontSize) y
// cualquier componente que deba re-renderizar ante un cambio de tipografía.
const subscribers = new Set();

function notify() {
  for (const cb of subscribers) {
    try {
      cb({ preset: currentPreset, fontSize: currentFontSize });
    } catch {
      // Un suscriptor que falle no debe romper la notificación al resto.
    }
  }
}

function applyPresetVars(preset) {
  document.documentElement.style.setProperty("--font-ui", preset.ui);
  document.documentElement.style.setProperty("--font-heading", preset.heading);
  document.documentElement.style.setProperty("--font-metric", preset.metric);
  document.documentElement.style.setProperty("--font-family", preset.ui);
}

function applyFontSize(size) {
  const px = FONT_SIZE_MAP[size] || FONT_SIZE_MAP.medium;
  document.documentElement.style.fontSize = px;
  document.documentElement.style.setProperty("--font-size-base", px);
}

const typographyManager = {
  init() {
    try {
      const savedPreset = localStorage.getItem(STORAGE_PRESET_KEY);
      if (savedPreset && isValidPreset(savedPreset)) {
        currentPreset = savedPreset;
      } else {
        currentPreset = DEFAULT_TYPOGRAPHY_PRESET;
      }

      const savedSize = localStorage.getItem(STORAGE_FONT_SIZE_KEY);
      currentFontSize =
        savedSize && FONT_SIZE_MAP[savedSize]
          ? savedSize
          : "medium";

      applyPresetVars(getPresetById(currentPreset));
      applyFontSize(currentFontSize);
      loadFamilies(currentPreset);
    } catch (err) {
      // Fallback seguro: nunca bloquear el arranque por un error de tipografía.
      console.warn("typographyManager: error al inicializar tipografía", err);
      applyPresetVars(getPresetById(DEFAULT_TYPOGRAPHY_PRESET));
      applyFontSize("medium");
    }
  },

  /** Suscribirse a cambios de preset/tamaño. Devuelve una función para anular. */
  subscribe(cb) {
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  },

  getCurrentPreset() {
    return currentPreset;
  },

  getPresets() {
    return TYPOGRAPHY_PRESETS;
  },

  getFontSizes() {
    return { ...FONT_SIZE_MAP };
  },

  setPreset(presetId) {
    if (!isValidPreset(presetId)) return false;
    currentPreset = presetId;
    try { localStorage.setItem(STORAGE_PRESET_KEY, presetId); } catch {}
    applyPresetVars(getPresetById(presetId));
    loadFamilies(presetId);
    notify();
    return true;
  },

  getFontSize() {
    return currentFontSize;
  },

  setFontSize(size) {
    if (!FONT_SIZE_MAP[size]) return false;
    currentFontSize = size;
    try { localStorage.setItem(STORAGE_FONT_SIZE_KEY, size); } catch {}
    applyFontSize(size);
    notify();
    return true;
  },

  getFontSizeInPx() {
    return FONT_SIZE_MAP[currentFontSize] || FONT_SIZE_MAP.medium;
  },

  resetToDefaults() {
    currentPreset = DEFAULT_TYPOGRAPHY_PRESET;
    currentFontSize = "medium";
    try {
      localStorage.removeItem(STORAGE_PRESET_KEY);
      localStorage.removeItem(STORAGE_FONT_SIZE_KEY);
    } catch {}
    applyPresetVars(getPresetById(DEFAULT_TYPOGRAPHY_PRESET));
    applyFontSize("medium");
    loadFamilies(DEFAULT_TYPOGRAPHY_PRESET);
    notify();
  },

  getTypographyConfig() {
    return {
      preset: currentPreset,
      fontSize: currentFontSize,
    };
  },
};

export {
  typographyManager,
  DEFAULT_TYPOGRAPHY_PRESET,
  FONT_SIZE_MAP as FONT_SIZES,
};
export default typographyManager;
