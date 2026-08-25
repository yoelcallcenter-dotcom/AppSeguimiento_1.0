/**
 * useTheme.js
 * Hook personalizado para consumir el sistema de temas
 * Wrapper sobre useTheme() del contexto para mayor claridad
 */

import { useTheme as useThemeContext } from "../context/ThemeContext";

export function useTheme() {
  const theme = useThemeContext();

  return {
    themeId: theme.theme,
    isDark: theme.theme === "dark",
    isLight: theme.theme === "light",
    customColors: theme.customColors,
    estadoColors: theme.estadoColors,
    isLoaded: theme.isLoaded,
    themes: theme.themes,
    defaultColors: theme.defaultColors,

    // Métodos principales
    setTheme: theme.changeTheme,
    updateCustomColors: theme.updateCustomColors,
    updateEstadoColor: theme.updateEstadoColor,
    updateEstadoColors: theme.updateEstadoColors,
    resetTheme: theme.resetToDefaults,
    getEstadoColor: theme.getEstadoColor,
    getThemeConfig: theme.getThemeConfig,

    // Métodos de utilidad
    getCssVar: (key) => {
      const map = {
        bg: "--color-bg",
        surface: "--color-surface",
        surface2: "--color-surface2",
        surface3: "--color-surface3",
        text: "--color-text",
        textSecondary: "--color-text-secondary",
        textMuted: "--color-text-muted",
        accent: "--color-accent",
        border: "--color-border",
        borderLight: "--color-border-light",
        danger: "--color-danger",
        success: "--color-success",
        warning: "--color-warning",
        primary: "--color-primary",
        secondary: "--color-secondary",
      };
      return map[key] || null;
    },

    getEstadoColorCss: (estado) => {
      const color = theme.getEstadoColor(estado);
      return color || "#6B7280";
    },

    getEstadoCssVar: (estado) => {
      const key = estado.replace(/\s+/g, "-");
      return `var(--color-estado-${key})`;
    },
  };
}
