import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { typographyManager } from "../core/typography/typographyManager";
import { TYPOGRAPHY_PRESETS } from "../core/typography/presets";

const TypographyContext = createContext(null);

export function TypographyProvider({ children }) {
  const [preset, setPresetState] = useState(() =>
    typographyManager.getCurrentPreset()
  );
  const [fontSize, setFontSizeState] = useState(() =>
    typographyManager.getFontSize()
  );

  useEffect(() => {
    typographyManager.init();
    setPresetState(typographyManager.getCurrentPreset());
    setFontSizeState(typographyManager.getFontSize());
  }, []);

  const changePreset = useCallback((presetId) => {
    const ok = typographyManager.setPreset(presetId);
    if (ok) setPresetState(presetId);
    return ok;
  }, []);

  const changeFontSize = useCallback((size) => {
    const ok = typographyManager.setFontSize(size);
    if (ok) setFontSizeState(size);
    return ok;
  }, []);

  const resetToDefaults = useCallback(() => {
    typographyManager.resetToDefaults();
    setPresetState(typographyManager.getCurrentPreset());
    setFontSizeState(typographyManager.getFontSize());
  }, []);

  const value = useMemo(
    () => ({
      preset,
      setPreset: changePreset,
      fontSize,
      setFontSize: changeFontSize,
      presets: TYPOGRAPHY_PRESETS,
      resetToDefaults,
    }),
    [preset, fontSize, changePreset, changeFontSize, resetToDefaults]
  );

  return (
    <TypographyContext.Provider value={value}>
      {children}
    </TypographyContext.Provider>
  );
}

export function useTypography() {
  const context = useContext(TypographyContext);
  if (!context) {
    throw new Error("useTypography must be used within a TypographyProvider");
  }
  return context;
}
