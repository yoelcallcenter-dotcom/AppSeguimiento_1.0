import { useState, useCallback, useRef } from "react";
import { copyToClipboard } from "../utils/copyToClipboard";

export function useClipboard(timeout = 1500) {
  const [copiado, setCopiado] = useState(false);
  const timerRef = useRef(null);

  const flash = useCallback(() => {
    setCopiado(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopiado(false), timeout);
  }, [timeout]);

  const copiar = useCallback(
    async (texto) => {
      const ok = await copyToClipboard(texto);
      if (ok) flash();
      return ok;
    },
    [flash]
  );

  return { copiar, copiado };
}
