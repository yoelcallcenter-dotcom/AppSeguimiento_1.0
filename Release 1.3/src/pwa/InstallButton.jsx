import React, { useState } from "react";
import { Download, X } from "lucide-react";
import { useInstallPrompt } from "./useInstallPrompt";

/**
 * Botón "Instalar app".
 *
 * - Chrome/Edge/Android: abre el diálogo nativo de instalación.
 * - iOS (Safari): no existe "beforeinstallprompt", así que muestra
 *   instrucciones para "Agregar a pantalla de inicio".
 * - Se oculta automáticamente cuando la app ya está instalada o no
 *   hay oportunidad de instalación.
 */
export function InstallButton() {
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPrompt();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (isStandalone || (!canInstall && !isIOS)) return null;

  const handleClick = async () => {
    if (canInstall) {
      await promptInstall();
      return;
    }
    if (isIOS) {
      setShowIosHelp(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 h-9 rounded-md transition-colors hover:bg-white/5 text-xs font-semibold whitespace-nowrap"
        style={{ color: "var(--color-accent)", border: "1px solid var(--color-border)" }}
        aria-label="Instalar aplicación"
        title="Instalar la app en este dispositivo"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Instalar</span>
      </button>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowIosHelp(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="w-full max-w-sm rounded-xl animate-fade-in"
            style={{
              backgroundColor: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-4 py-3 rounded-t-xl"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "#ffffff",
              }}
            >
              <h3 id="ios-install-title" className="text-sm font-semibold">
                Instalar en iPhone/iPad
              </h3>
              <button
                onClick={() => setShowIosHelp(false)}
                className="p-1 rounded-md hover:bg-white/10"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <ol className="p-4 space-y-3 text-sm" style={{ color: "var(--color-text)" }}>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold" style={{ width: "22px", height: "22px", backgroundColor: "var(--color-primary)", color: "#ffffff" }}>
                  1
                </span>
                <span>
                  Tocá el botón <strong>Compartir</strong> (cuadrado con flecha
                  hacia arriba) en la barra del navegador.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold" style={{ width: "22px", height: "22px", backgroundColor: "var(--color-primary)", color: "#ffffff" }}>
                  2
                </span>
                <span>
                  Elegí <strong>“Agregar a pantalla de inicio”</strong>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold" style={{ width: "22px", height: "22px", backgroundColor: "var(--color-primary)", color: "#ffffff" }}>
                  3
                </span>
                <span>
                  Confirmá y la app quedará en tu pantalla de inicio, como una
                  app nativa.
                </span>
              </li>
            </ol>
            <div className="px-4 pb-4 flex justify-end">
              <button
                onClick={() => setShowIosHelp(false)}
                className="btn-base btn-primary btn-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallButton;
