/**
 * storageHealth.js
 * Salud del almacenamiento: solicita persistencia, estima el uso de cuota y
 * detecta si IndexedDB está disponible. Actualiza systemStatusStore.
 */

import useSystemStatus from "./systemStatusStore";
import appDB from "../db/appDB";
import casesDB from "../db/casesDB";

/**
 * Detecta un downgrade de schema: si los datos en IndexedDB fueron creados por
 * una versión más nueva de la app, IndexedDB lanza VersionError al abrir.
 * @returns {Promise<Error|null>} el error de downgrade o null si todo está bien.
 */
export async function checkSchemaDowngrade() {
  try {
    await Promise.all([appDB.open(), casesDB.open()]);
    useSystemStatus.getState().setSchemaDowngrade(false);
    return null;
  } catch (err) {
    const isDowngrade =
      !!err &&
      (err.name === "VersionError" ||
        /version/i.test(String(err && err.message || "")));
    if (isDowngrade) {
      useSystemStatus.getState().setSchemaDowngrade(true);
      return err;
    }
    return null;
  }
}

/** Solicita almacenamiento persistente (evita que el navegador evite los datos). */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      useSystemStatus.getState().setStoragePersisted(persisted);
      return persisted;
    }
  } catch {
    /* API no disponible */
  }
  useSystemStatus.getState().setStoragePersisted(false);
  return false;
}

/** Estima el uso de cuota y lo refleja en el store (porcentaje + bytes). */
export async function refreshStorageUsage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const pct = quota > 0 ? Math.round((usage / quota) * 100) : 0;
      useSystemStatus.getState().setStorageUsage(pct, quota);
      return pct;
    }
  } catch {
    /* API no disponible */
  }
  useSystemStatus.getState().setStorageUsage(null, null);
  return null;
}

/** Comprueba si IndexedDB está disponible (falla en modo privado/restricciones). */
export function isIndexedDBAvailable() {
  try {
    if (typeof indexedDB === "undefined") return false;
    return true;
  } catch {
    return false;
  }
}

/** Inicializa monitoreo online/offline y dispara las comprobaciones iniciales. */
export function startSystemStatusMonitor() {
  const applyOnline = () => {
    useSystemStatus.getState().setOnline(navigator.onLine);
    if (navigator.onLine) {
      refreshStorageUsage();
    }
  };

  window.addEventListener("online", applyOnline);
  window.addEventListener("offline", applyOnline);

  requestPersistentStorage().finally(refreshStorageUsage);
  checkSchemaDowngrade();

  return () => {
    window.removeEventListener("online", applyOnline);
    window.removeEventListener("offline", applyOnline);
  };
}
