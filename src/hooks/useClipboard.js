import { useState, useCallback, useRef } from "react";

function fallbackCopy(texto) {
  const ta = document.createElement("textarea");
  ta.value = texto;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  return ok;
}

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
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(texto);
        } else {
          if (!fallbackCopy(texto)) throw new Error("fallback failed");
        }
        flash();
        return true;
      } catch {
        if (fallbackCopy(texto)) {
          flash();
          return true;
        }
        return false;
      }
    },
    [flash]
  );

  return { copiar, copiado };
}
