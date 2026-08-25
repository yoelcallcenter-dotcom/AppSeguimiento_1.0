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

export const importRawData = (rawData) => {
  try {
    if (typeof rawData !== "string") return rawData;
    return JSON.parse(rawData);
  } catch {
    return null;
  }
};

export const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// Funciones deprecadas - usar storageManager directamente
export const isEncryptedData = () => false;
