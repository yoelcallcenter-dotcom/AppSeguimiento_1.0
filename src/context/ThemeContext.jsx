import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { themeManager } from "../core/theme/themeManager";
import { PALETTES, defaultEstadoColors } from "../core/theme/themeTokens";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark");
  const [palette, setPaletteState] = useState("default");
  const [estadoColors, setEstadoColorsState] = useState({
    ...defaultEstadoColors,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    themeManager.init();
    setThemeState(themeManager.getCurrentTheme());
    setPaletteState(themeManager.getCurrentPalette());
    setEstadoColorsState(themeManager.getAllEstadoColors());
    setIsLoaded(true);
  }, []);

  const changeTheme = useCallback((newTheme) => {
    themeManager.setTheme(newTheme);
    setThemeState(newTheme);
  }, []);

  const changePalette = useCallback((paletteId) => {
    themeManager.setPalette(paletteId);
    setPaletteState(paletteId);
  }, []);

  const updateEstadoColor = useCallback((estado, color) => {
    themeManager.setEstadoColor(estado, color);
    setEstadoColorsState((prev) => ({ ...prev, [estado]: color }));
  }, []);

  const updateEstadoColors = useCallback((colors) => {
    themeManager.setEstadoColors(colors);
    setEstadoColorsState(colors);
  }, []);

  const resetToDefaults = useCallback(() => {
    themeManager.resetToDefaults();
    setThemeState("dark");
    setPaletteState("default");
    setEstadoColorsState({ ...defaultEstadoColors });
  }, []);

  const getEstadoColor = useCallback((estado) => {
    return themeManager.getEstadoColor(estado);
  }, []);

  const getThemeConfig = useCallback(() => {
    return themeManager.getThemeConfig();
  }, []);

  const value = useMemo(
    () => ({
      theme,
      palette,
      estadoColors,
      isLoaded,
      palettes: PALETTES,
      defaultColors: defaultEstadoColors,
      changeTheme,
      changePalette,
      updateEstadoColor,
      updateEstadoColors,
      resetToDefaults,
      getEstadoColor,
      getThemeConfig,
      isDark: theme === "dark",
      isLight: theme === "light",
    }),
    [
      theme,
      palette,
      estadoColors,
      isLoaded,
      changeTheme,
      changePalette,
      updateEstadoColor,
      updateEstadoColors,
      resetToDefaults,
      getEstadoColor,
      getThemeConfig,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
