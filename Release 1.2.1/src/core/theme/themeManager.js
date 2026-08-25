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
    return estadoColors[estado] || defaultEstadoColors[estado] || '#6B7280';
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

const applyTheme = (theme) => {
  themeManager.setTheme(theme);
};

const loadTheme = () => {
  try { return localStorage.getItem(STORAGE_THEME_KEY) || 'dark'; } catch { return 'dark'; }
};

const saveTheme = (theme) => {
  try { localStorage.setItem(STORAGE_THEME_KEY, theme); } catch {}
};

const setTheme = (theme) => {
  themeManager.setTheme(theme);
};

const toggleTheme = () => {
  const next = currentTheme === 'dark' ? 'light' : 'dark';
  themeManager.setTheme(next);
  return next;
};

export {
  themeManager, initTheme, applyTheme, loadTheme, saveTheme,
  setTheme, toggleTheme,
};
