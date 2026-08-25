import { useEffect, useState } from "react";

/**
 * Captura temprana del evento "beforeinstallprompt".
 *
 * Chrome/Edge pueden dispararlo apenas la página se vuelve instalable,
 * potencialmente ANTES de que React monte y registre sus listeners.
 * Por eso lo capturamos a nivel de módulo (al cargar el bundle) y el
 * hook lo siembra en su estado al montar, además de escucharlo en vivo.
 */
let lastDeferredPrompt = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    lastDeferredPrompt = event;
  });
  window.addEventListener("appinstalled", () => {
    lastDeferredPrompt = null;
  });
}

/**
 * Detecta la oportunidad de instalar la PWA (evento
 * "beforeinstallprompt" de Chrome/Edge/Android) y el entorno iOS
 * (donde no existe ese evento y la instalación se hace con
 * "Agregar a pantalla de inicio").
 *
 * Devuelve:
 *  - canInstall: hay un evento de instalación diferido disponible.
 *  - isIOS: navegador iOS (Safari/Chrome iOS).
 *  - isStandalone: la app ya se está ejecutando instalada.
 *  - promptInstall: dispara el diálogo de instalación nativo.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(lastDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    setIsStandalone(
      media.matches ||
        window.navigator.standalone === true ||
        window.matchMedia("(display-mode: minimal-ui)").matches
    );

    const handleMediaChange = (e) => setIsStandalone(e.matches);
    if (media.addEventListener) {
      media.addEventListener("change", handleMediaChange);
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      lastDeferredPrompt = event;
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      lastDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Sembrar el evento capturado a nivel de módulo (si llegó antes del mount).
    setDeferredPrompt(lastDeferredPrompt);

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", handleMediaChange);
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      lastDeferredPrompt = null;
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  const isIOS =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return {
    canInstall: Boolean(deferredPrompt),
    isIOS,
    isStandalone,
    promptInstall,
  };
}
