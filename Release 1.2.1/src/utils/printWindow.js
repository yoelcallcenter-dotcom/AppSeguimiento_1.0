/**
 * printWindow.js
 * Abre una ventana de impresión de forma segura: sin inline handlers (CSP-safe)
 * y con el botón de impresión vinculado por addEventListener.
 *
 * IMPORTANTE: no se usa la feature "noopener" de window.open porque el spec
 * indica que en ese caso la función devuelve null y no podríamos escribir el
 * contenido. En su lugar se corta la relación con el opener manualmente.
 */

export function openPrintWindow(html) {
  const ventana = window.open("", "_blank", "width=1000,height=800");
  if (!ventana) return null;

  try { ventana.opener = null; } catch {}

  ventana.document.write(html);
  ventana.document.close();

  const attach = () => {
    ventana.document
      .querySelectorAll(".btn-print")
      .forEach((btn) => {
        btn.addEventListener("click", () => ventana.print());
      });
    ventana.focus();
  };

  if (ventana.document.readyState !== "loading") {
    attach();
  } else {
    ventana.document.addEventListener("DOMContentLoaded", attach);
  }

  setTimeout(() => ventana.focus(), 500);
  return ventana;
}
