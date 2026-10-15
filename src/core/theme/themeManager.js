import { PALETTES, defaultEstadoColors } from './themeTokens';
import useAppStore from '../store/useAppStore';

const STORAGE_THEME_KEY = 'app-theme';
const STORAGE_PALETTE_KEY = 'app-palette';
const STORAGE_ESTADO_COLORS_KEY = 'app-estado-colors';

let estadoColors = { ...defaultEstadoColors };
let currentTheme = 'dark';
let currentPalette = 'default';

function setDataAttribute(name, value) {
  document.documentElement.setAttribute(name, value);
}

function getDataAttribute(name) {
  return document.documentElement.getAttribute(name);
}

function cssVarName(estado) {
  return `--color-estado-${estado.replace(/\s+/g, '-')}`;
}

function applyEstadoColors() {
  Object.entries(estadoColors).forEach(([estado, color]) => {
    document.documentElement.style.setProperty(cssVarName(estado), color);
  });
}

const themeManager = {
  init() {
    try {
      const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
      const savedPalette = localStorage.getItem(STORAGE_PALETTE_KEY);
      const savedEstado = localStorage.getItem(STORAGE_ESTADO_COLORS_KEY);

      currentTheme = savedTheme || 'dark';
      currentPalette = savedPalette || 'default';

      if (savedEstado) {
        try { estadoColors = { ...defaultEstadoColors, ...JSON.parse(savedEstado) }; } catch {}
      }

      setDataAttribute('data-theme', currentTheme);
      setDataAttribute('data-palette', currentPalette);
      applyEstadoColors();
    } catch {}
  },

  getCurrentTheme() {
    return currentTheme;
  },

  getCurrentPalette() {
    return currentPalette;
  },

  getPalettes() {
    return PALETTES;
  },

  setTheme(themeName) {
    currentTheme = themeName;
    try { localStorage.setItem(STORAGE_THEME_KEY, themeName); } catch {}
    setDataAttribute('data-theme', themeName);
    const store = useAppStore.getState();
    if (store.theme !== themeName) store.setTheme(themeName);
  },

  setPalette(paletteId) {
    currentPalette = paletteId;
    try { localStorage.setItem(STORAGE_PALETTE_KEY, paletteId); } catch {}
    setDataAttribute('data-palette', paletteId);
    const store = useAppStore.getState();
    if (store.palette !== paletteId) store.setPalette(paletteId);
  },

  setEstadoColor(estado, color) {
    estadoColors[estado] = color;
    document.documentElement.style.setProperty(cssVarName(estado), color);
    try { localStorage.setItem(STORAGE_ESTADO_COLORS_KEY, JSON.stringify(estadoColors)); } catch {}
  },

  setEstadoColors(colors) {
    estadoColors = { ...defaultEstadoColors, ...colors };
    applyEstadoColors();
    try { localStorage.setItem(STORAGE_ESTADO_COLORS_KEY, JSON.stringify(estadoColors)); } catch {}
  },

  getAllEstadoColors() {
    return { ...estadoColors };
  },

  getEstadoColor(estado) {
    // F2.1 / C03 (1.10.1): antes terminaba en `|| '#6B7280'`, que como el
    // mapa SIEMPRE tiene el color (defaults incluidos) hacía que la función
    // nunca devolviera falsy — los fallbacks `theme.getEstadoColor(x) ||
    // e.accent` de CasoCard/PipelineBar/PersonalizacionColores eran código
    // muerto y un estado nuevo/renombrado salía gris pese a tener accent en
    // config. Ahora devuelve undefined cuando no hay color guardado ni
    // default y cada caller cae en su `accent` del catálogo.
    return estadoColors[estado] || defaultEstadoColors[estado] || undefined;
  },

  /**
   * C03 (1.10.1): renombra la clave de un estado en el mapa persistido de
   * colores (`app-estado-colors`) y en las variables CSS inline. Sin esto,
   * renombrar un estado dejaba el color viejo huérfano (var sin uso) y el
   * nombre nuevo caía a gris hasta que el usuario lo pintara a mano.
   */
  renameEstadoColor(prev, next) {
    if (!prev || !next || prev === next) return;
    const color = estadoColors[prev];
    delete estadoColors[prev];
    if (color) estadoColors[next] = color;
    document.documentElement.style.removeProperty(cssVarName(prev));
    applyEstadoColors();
    try {
      localStorage.setItem(STORAGE_ESTADO_COLORS_KEY, JSON.stringify(estadoColors));
    } catch {}
  },

  resetToDefaults() {
    estadoColors = { ...defaultEstadoColors };
    currentTheme = 'dark';
    currentPalette = 'default';
    try {
      localStorage.removeItem(STORAGE_ESTADO_COLORS_KEY);
      localStorage.setItem(STORAGE_THEME_KEY, 'dark');
      localStorage.setItem(STORAGE_PALETTE_KEY, 'default');
    } catch {}
    setDataAttribute('data-theme', 'dark');
    setDataAttribute('data-palette', 'default');
    applyEstadoColors();
    const store = useAppStore.getState();
    if (store.theme !== 'dark') store.setTheme('dark');
    if (store.palette !== 'default') store.setPalette('default');
  },

  getThemeConfig() {
    return {
      theme: currentTheme,
      palette: currentPalette,
      estadoColors: { ...estadoColors },
    };
  },

  getEstadoColors() {
    return { ...estadoColors };
  },
};

const initTheme = () => {
  themeManager.init();
  return currentTheme;
};

// 1.10.1 — Higiene P3 (código muerto; AUDITORIA_RELEASE_1.10.1 §8, cluster
// themeManager wrappers ×5): se eliminaron applyTheme, loadTheme, saveTheme,
// setTheme y toggleTheme. Verificación: grep de cada nombre en src/ incl.
// *.test.* = 0 importadores reales (el `setTheme` de core/store/useAppStore.js:305
// es la acción del store de Zustand, no este wrapper; themeManager.setTheme es
// el método de la clase, que sigue vivo). El wrapper setTheme de este módulo solo
// redirigía a themeManager.setTheme y nadie lo importaba.
export {
  themeManager, initTheme,
};
