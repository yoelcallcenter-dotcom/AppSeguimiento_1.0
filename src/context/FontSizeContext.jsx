import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { typographyManager } from "../core/typography/typographyManager";

const FontSizeContext = createContext({
  fontSize: "medium",
  setFontSize: () => {},
});

/**
 * Provider de tamaño de fuente.
 *
 * Desde 1.4.5 delega en el typographyManager (fuente de verdad única) que
 * mantiene la misma clave de persistencia (`app-font-size`) y el mismo
 * comportamiento previo, de modo que las preferencias existentes se conservan.
 * La API de `useFontSize` no cambia para no romper a sus consumidores.
 *
 * Desde 1.4.8 se suscribe a los cambios del typographyManager para mantenerse
 * sincronizado cuando otro flujo (p. ej. `resetToDefaults` de
 * `TypographyContext`) modifica el tamaño de forma externa.
 */
export function FontSizeProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(() =>
    typographyManager.getFontSize()
  );
  const applying = useRef(false);

  useEffect(() => {
    const unsubscribe = typographyManager.subscribe(({ fontSize: next }) => {
      setFontSizeState(next);
      applying.current = true;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (applying.current) {
      applying.current = false;
      return;
    }
    typographyManager.setFontSize(fontSize);
  }, [fontSize]);

  const setFontSize = (newSize) => {
    if (["small", "medium", "large"].includes(newSize)) {
      setFontSizeState(newSize);
    }
  };

  const value = { fontSize, setFontSize };

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error("useFontSize must be used within a FontSizeProvider");
  }
  return context;
}
