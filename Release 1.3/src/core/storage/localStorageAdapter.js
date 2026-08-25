/**
 * localStorageAdapter.js
 * Adaptador para localStorage
 * Responsabilidad: Operaciones CRUD en localStorage
 */

import useSystemStatus from "../status/systemStatusStore";

class LocalStorageAdapter {
  constructor() {
    this.prefix = "app_";
    // Claves que se guardan SIN prefijo app_ pero son datos de usuario y deben
    // incluirse en los backups completos.
    this.unprefixedInclude = (key) =>
      key.startsWith("conversaciones_") ||
      key === "calendario-eventos" ||
      key === "userOperatorProfile" ||
      key === "userOperatorAvailability" ||
      key === "userOperatorGoals" ||
      key === "userOperatorSettings" ||
      key === "userProductivitySettings" ||
      key === "userGoals" ||
      key === "userContextMemory" ||
      key === "backup-frecuencia" ||
      key === "backup-last-jornada-run";
    // Claves internas/transitorias que NO se respaldan ni restauran.
    this.backupExclude = (key) =>
      key === "app-filters" ||
      key.startsWith("tour_") ||
      key === "backup-last-run" ||
      key === "userOperatorCredentials" ||
      key === "app_userOperatorCredentials";
  }

  getKey(key) {
    return `${this.prefix}${key}`;
  }

  set(key, value) {
    try {
      const data = JSON.stringify(value);
      localStorage.setItem(this.getKey(key), data);
      return { success: true };
    } catch (error) {
      console.error("[LocalStorage] Error al guardar:", error);
      useSystemStatus.getState().setQuotaError();
      return { success: false, error: error.message };
    }
  }

  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(this.getKey(key));
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (error) {
      console.error("[LocalStorage] Error al leer:", error);
      return defaultValue;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this.getKey(key));
      return { success: true };
    } catch (error) {
      console.error("[LocalStorage] Error al eliminar:", error);
      return { success: false, error: error.message };
    }
  }

  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return { success: true };
    } catch (error) {
      console.error("[LocalStorage] Error al limpiar:", error);
      return { success: false, error: error.message };
    }
  }

  // ---------- Acceso "crudo" (sin aplicar el prefijo) ----------
  setRaw(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return { success: true };
    } catch (error) {
      console.error("[LocalStorage] Error al guardar (raw):", error);
      useSystemStatus.getState().setQuotaError();
      return { success: false, error: error.message };
    }
  }

  removeRaw(key) {
    try {
      localStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      console.error("[LocalStorage] Error al eliminar (raw):", error);
      return { success: false, error: error.message };
    }
  }

  getAll() {
    try {
      const result = {};
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          if (this.backupExclude(key)) return;
          const realKey = key.replace(this.prefix, "");
          try {
            result[realKey] = JSON.parse(localStorage.getItem(key));
          } catch {
            result[realKey] = localStorage.getItem(key);
          }
        } else if (this.unprefixedInclude(key) && !this.backupExclude(key)) {
          try {
            result[key] = JSON.parse(localStorage.getItem(key));
          } catch {
            result[key] = localStorage.getItem(key);
          }
        }
      });
      return result;
    } catch (error) {
      console.error("[LocalStorage] Error al obtener todos:", error);
      return {};
    }
  }

  /** Devuelve las claves crudas actuales (prefijadas y sin prefijo). */
  getAllKeys() {
    try {
      const keys = Object.keys(localStorage);
      return keys.filter(
        (key) => key.startsWith(this.prefix) || this.unprefixedInclude(key)
      );
    } catch {
      return [];
    }
  }

  exists(key) {
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  size() {
    try {
      let count = 0;
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) count++;
      });
      return count;
    } catch {
      return 0;
    }
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
