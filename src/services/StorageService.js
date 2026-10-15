/**
 * StorageService.js
 * DEPRECADO - Este archivo es un wrapper para mantener compatibilidad
 * con código existente. Toda la lógica nueva debe usar core/storage/storageManager.js
 */

import { storageManager } from "../core/storage/storageManager";

// Re-exportar funciones del storageManager para mantener compatibilidad
export const saveKey = async (key, value) => {
  const result = await storageManager.set(key, value);
  return result.success;
};

export const loadKey = async (key, fallback) => {
  return await storageManager.get(key, fallback);
};

export const setupAutoSave = (data, keys, intervalMs = 30000) => {
  return setInterval(() => {
    keys.forEach((key) => {
      if (data[key] !== undefined) {
        storageManager.set(key, data[key]);
      }
    });
  }, intervalMs);
};

// 1.10.1 — Higiene P3 (código muerto): se eliminaron importRawData, isValidJSON e
// isEncryptedData (cluster StorageService ×3, AUDITORIA_RELEASE_1.10.1 §8).
// Verificación: grep de cada nombre en src/ incl. *.test.* = 0 usos (ni internos ni
// externos). Se conservan saveKey (App.jsx:193, useStorage.js), loadKey (useStorage.js)
// y setupAutoSave (App.jsx:193/832), que sí tienen importadores.
