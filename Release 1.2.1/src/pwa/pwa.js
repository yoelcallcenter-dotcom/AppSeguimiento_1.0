/**
 * Cliente PWA de AppSeguimiento.
 *
 * Registra el service worker (solo en producción), detecta nuevas
 * versiones desplegadas y expone `applyPWAUpdate()` para recargar
 * la app con el código nuevo (refresco controlado, sin interrumpir
 * al usuario en plena tarea).
 *
 * Uso (singleton, se puede llamar varias veces):
 *   import { initPWA, applyPWAUpdate } from "../pwa/pwa";
 *   initPWA({ onNeedRefresh: () => {}, onOfflineReady: () => {} });
 */

const SW_PATH = `${process.env.PUBLIC_URL || ""}/sw.js`;

let registrationPromise = null;
const listeners = { needRefresh: [], offlineReady: [] };

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function notify(kind, ...args) {
  listeners[kind].forEach((fn) => {
    try {
      fn(...args);
    } catch (error) {
      console.error("[PWA] Error en listener:", error);
    }
  });
}

/**
 * Registra el service worker una única vez y comienza a vigilar
 * "updatefound" para detectar despliegues nuevos.
 */
export function initPWA({ onNeedRefresh, onOfflineReady } = {}) {
  if (onNeedRefresh) listeners.needRefresh.push(onNeedRefresh);
  if (onOfflineReady) listeners.offlineReady.push(onOfflineReady);

  if (!isProduction() || !("serviceWorker" in navigator)) return null;

  if (!registrationPromise) {
    registrationPromise = new Promise((resolve) => {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register(SW_PATH)
          .then((registration) => {
            const isUpdate = Boolean(navigator.serviceWorker.controller);
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (!newWorker) return;
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state !== "installed") return;
                if (isUpdate) {
                  notify("needRefresh");
                } else {
                  notify("offlineReady");
                }
              });
            });
            resolve(registration);
          })
          .catch((error) => {
            console.error("[PWA] Error al registrar el service worker:", error);
            resolve(null);
          });
      });
    });
  } else {
    // Si la app ya se actualizó mientras tanto, avisar de inmediato.
    registrationPromise.then((registration) => {
      if (registration && registration.waiting) {
        notify("needRefresh");
      }
    });
  }

  return registrationPromise;
}

/**
 * Aplica la actualización pendiente: fuerza el salto de la cola de
 * espera del nuevo SW (si estuviera esperando) y recarga la app.
 */
export async function applyPWAUpdate() {
  try {
    const registration =
      (await registrationPromise) ||
      (navigator.serviceWorker && (await navigator.serviceWorker.getRegistration()));
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else if (registration && registration.installing) {
      registration.installing.addEventListener("statechange", () => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      });
    }
  } catch (error) {
    console.error("[PWA] Error al aplicar la actualización:", error);
  }
  window.location.reload();
}

/**
 * Registra el SW sin UI (para hacerlo lo antes posible desde
 * index.js). Los listeners se suman luego desde App.jsx vía initPWA.
 */
export function registerPWA() {
  return initPWA();
}
