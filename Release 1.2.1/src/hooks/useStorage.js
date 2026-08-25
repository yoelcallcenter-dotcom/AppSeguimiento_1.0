import { useState, useEffect } from "react";
import { loadKey, saveKey } from "../services/StorageService";

export function useStorage(key, defaultValue) {
  const [state, setState] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadKey(key, defaultValue).then((value) => {
      if (mounted) {
        setState(value);
        setLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [key]);

  useEffect(() => {
    if (loaded) {
      saveKey(key, state);
    }
  }, [key, state, loaded]);

  return [state, setState, loaded];
}
