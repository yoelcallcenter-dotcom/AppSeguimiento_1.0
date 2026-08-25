/**
 * useFontSize.js
 * Hook para gestionar el tamaño de fuente en la aplicación
 */

import { useState, useEffect, useCallback } from "react";
import { storageManager } from "../core/storage/storageManager";

const STORAGE_KEY = "app_font_size";
const DEFAULT_SIZE = "medium";

export const useFontSize = () => {
  const [fontSize, setFontSizeState] = useState(DEFAULT_SIZE);
  const [loading, setLoading] = useState(true);

  // Cargar tamaño de fuente guardado
  useEffect(() => {
    const loadFontSize = async () => {
      try {
        const saved = await storageManager.get(STORAGE_KEY, DEFAULT_SIZE);
        // Validar que sea un valor válido
        const validSize = ["small", "medium", "large"].includes(saved)
          ? saved
          : DEFAULT_SIZE;
        setFontSizeState(validSize);
        applyFontSize(validSize);
      } catch (error) {
        console.error("Error loading font size:", error);
        setFontSizeState(DEFAULT_SIZE);
        applyFontSize(DEFAULT_SIZE);
      } finally {
        setLoading(false);
      }
    };
    loadFontSize();
  }, []);

  // Aplicar tamaño de fuente al DOM
  const applyFontSize = useCallback((size) => {
    const sizes = {
      small: "14px",
      medium: "16px",
      large: "18px",
    };
    const fontSize = sizes[size] || sizes.medium;
    document.documentElement.style.fontSize = fontSize;
    document.documentElement.style.setProperty("--font-size-base", fontSize);

    // También aplicar a elementos específicos si es necesario
    const root = document.documentElement;
    root.style.setProperty("--font-size-base", fontSize);
  }, []);

  // Cambiar tamaño de fuente
  const setFontSize = useCallback(
    async (newSize) => {
      if (!["small", "medium", "large"].includes(newSize)) {
        console.warn("Tamaño de fuente no válido:", newSize);
        return;
      }
      setFontSizeState(newSize);
      applyFontSize(newSize);
      try {
        await storageManager.set(STORAGE_KEY, newSize);
        // Disparar evento para actualizar otros componentes
        window.dispatchEvent(new Event("fontsize-change"));
      } catch (error) {
        console.error("Error saving font size:", error);
      }
    },
    [applyFontSize]
  );

  // Resetear a tamaño por defecto
  const resetFontSize = useCallback(async () => {
    await setFontSize(DEFAULT_SIZE);
  }, [setFontSize]);

  // Obtener el tamaño actual en píxeles
  const getCurrentSizeInPixels = useCallback(() => {
    const sizes = {
      small: "14px",
      medium: "16px",
      large: "18px",
    };
    return sizes[fontSize] || sizes.medium;
  }, [fontSize]);

  return {
    fontSize,
    setFontSize,
    resetFontSize,
    loading,
    sizes: ["small", "medium", "large"],
    labels: {
      small: "Pequeño",
      medium: "Mediano",
      large: "Grande",
    },
    getCurrentSizeInPixels,
  };
};

export default useFontSize;
