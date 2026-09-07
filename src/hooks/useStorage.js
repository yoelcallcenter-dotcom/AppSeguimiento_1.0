import { useState, useEffect, useRef } from "react";
import { loadKey, saveKey } from "../services/StorageService";

/**
 * useStorage (Optimizado 1.6.6)
 * Hook que persiste un estado en localStorage de forma asincrónica.
 *
 * Optimización de rendimiento: el guardado está DELAYED (debounced) 500ms para
 * evitar escrituras síncronas en cada keystroke. El debounce se limpia al
 * desmontar, y deja un último intento de persistir el valor final.
 */
const SAVE_DEBOUNCE_MS = 500;

export function useStorage(key, defaultValue) {
  const [state, setState] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);
  const stateRef = useRef(defaultValue);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    loadKey(key, defaultValue).then((value) => {
      if (mounted) {
        stateRef.current = value;
        loadedRef.current = true;
        setState(value);
        setLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [key]);

  // Debounce del guardado: acumula cambios durante SAVE_DEBOUNCE_MS.
  useEffect(() => {
    if (!loaded) return;
    stateRef.current = state;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveKey(key, stateRef.current);
    }, SAVE_DEBOUNCE_MS);
  }, [key, state, loaded]);

  // Al desmontar, persiste el último valor conocido (limpia el timer).
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (loadedRef.current) saveKey(key, stateRef.current);
    };
  }, [key]);

  return [state, setState, loaded];
}
