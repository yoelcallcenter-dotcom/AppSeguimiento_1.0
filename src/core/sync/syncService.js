/**
 * syncService.js
 * Sincronización multi-pestaña mediante BroadcastChannel.
 *
 * Responsabilidad: notificar cambios entre pestañas para mantener la UI
 * consistente y disparar recargas reactivas (sin polling).
 *
 * - notifyChange: publica un cambio a todas las pestañas (y local vía eventBus).
 * - subscribeToChanges: suscribe un callback a cambios provenientes de otras
 *   pestañas; devuelve una función para cancelar la suscripción.
 * - createDebouncedNotifier: variante con debounce para escrituras de alta
 *   frecuencia.
 */

import { eventBus } from "../events/eventBus";

export const SYNC_CHANNEL_NAME = "app-sync";

export const SYNC_EVENTS = {
  CASES_UPDATED: "cases-updated",
  NOTES_UPDATED: "notes-updated",
  EVENTS_UPDATED: "events-updated",
  CONFIG_UPDATED: "config-updated",
  DATA_IMPORTED: "data-imported",
  DATA_CLEARED: "data-cleared",
  ALL_DATA_UPDATED: "all-data-updated",
};

const channel = (() => {
  try {
    return typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(SYNC_CHANNEL_NAME)
      : null;
  } catch {
    return null;
  }
})();

/** Callbacks locales suscritos a cambios de otras pestañas. */
const listeners = new Set();

if (channel) {
  channel.onmessage = (event) => {
    if (!event || !event.data) return;
    const { type, payload } = event.data;
    listeners.forEach((cb) => {
      try {
        cb({ type, payload, source: "sync" });
      } catch (error) {
        console.error("[SyncService] Error en listener:", error);
      }
    });
    eventBus.emit(type, payload);
  };
}

/**
 * Notifica un cambio a todas las pestañas.
 * También lo emite localmente vía eventBus para consumidores del mismo tab.
 * @param {string} type nombre del evento (SYNC_EVENTS.*).
 * @param {object} payload información del cambio.
 * @returns {object} mensaje emitido.
 */
export function notifyChange(type, payload = {}) {
  const message = { type, payload, timestamp: Date.now() };
  if (channel) {
    try {
      channel.postMessage(message);
    } catch (error) {
      console.error("[SyncService] Error en postMessage:", error);
    }
  }
  eventBus.emit(type, payload);
  return message;
}

/**
 * Crea un notificador con debounce para operaciones de alta frecuencia.
 * @param {string} type nombre del evento.
 * @param {number} delay milisegundos de espera (default 300).
 * @returns {(payload?: object) => void}
 */
export function createDebouncedNotifier(type, delay = 300) {
  let timer = null;
  let lastPayload = null;

  const notify = () => {
    notifyChange(type, lastPayload || {});
    lastPayload = null;
    timer = null;
  };

  return (payload = {}) => {
    lastPayload = payload;
    if (timer) clearTimeout(timer);
    timer = setTimeout(notify, delay);
  };
}

/**
 * Suscribe un callback a los cambios provenientes de otras pestañas.
 * @param {(event: {type: string, payload: object}) => void} callback
 * @returns {() => void} función para cancelar la suscripción.
 */
export function subscribeToChanges(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
