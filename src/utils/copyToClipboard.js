/**
 * copyToClipboard.js
 * Copia texto al portapapeles con fallback seguro para entornos donde
 * navigator.clipboard no está disponible (HTTP, escritorios remotos, etc.).
 * Nunca lanza errores; devuelve true en éxito, false en fallo.
 */

function fallbackCopy(texto) {
  const ta = document.createElement("textarea");
  ta.value = texto;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  return ok;
}

export async function copyToClipboard(texto) {
  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
    return fallbackCopy(texto);
  } catch {
    return fallbackCopy(texto);
  }
}
