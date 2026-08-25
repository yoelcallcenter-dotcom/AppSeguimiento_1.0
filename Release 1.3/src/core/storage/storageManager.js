/**
 * storageManager.js
 * Gestor central de almacenamiento - SOLO LOCALSTORAGE
 * Soporte para exportación/importación de casos (CSV/JSON) y configuraciones (JSON)
 */

import { localStorageAdapter } from "./localStorageAdapter";
import { parseCSV } from "../../utils/csvParse";

class StorageManager {
  constructor() {
    this.adapters = {
      local: localStorageAdapter,
    };
    this.defaultAdapter = "local";
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
  }

  getAdapter(name) {
    return this.adapters[name] || this.adapters[this.defaultAdapter];
  }

  getStatus() {
    return {
      local: {
        size: localStorageAdapter.size ? localStorageAdapter.size() : 0,
      },
    };
  }

  // ---------- Métodos básicos ----------
  async set(key, value, options = {}) {
    const { adapter = this.defaultAdapter } = options;
    try {
      const result = localStorageAdapter.set(key, value);
      return result;
    } catch (error) {
      console.error("[StorageManager] Error en set:", error);
      return { success: false, error: error.message };
    }
  }

  async get(key, defaultValue = null, options = {}) {
    try {
      const localValue = localStorageAdapter.get(key);
      if (localValue !== null) return localValue;
      return defaultValue;
    } catch (error) {
      console.error("[StorageManager] Error en get:", error);
      return defaultValue;
    }
  }

  async remove(key) {
    try {
      return localStorageAdapter.remove(key);
    } catch (error) {
      console.error("[StorageManager] Error en remove:", error);
      return { success: false, error: error.message };
    }
  }

  // ---------- Métodos de respaldo de CASOS ----------
  async getCases() {
    const cases = await this.get("cases", []);
    return cases;
  }

  async exportCases(format = "json") {
    const cases = await this.getCases();
    if (!cases || cases.length === 0) {
      throw new Error("No hay casos para exportar.");
    }

    if (format === "json") {
      return JSON.stringify(cases, null, 2);
    } else if (format === "csv") {
      return this._convertToCSV(cases);
    } else {
      throw new Error('Formato no soportado. Use "csv" o "json".');
    }
  }

  async importCases(data, format = "json") {
    let cases;
    try {
      if (format === "json") {
        cases = typeof data === "string" ? JSON.parse(data) : data;
      } else if (format === "csv") {
        cases = this._parseCSV(data);
      } else {
        throw new Error('Formato no soportado. Use "csv" o "json".');
      }

      if (!Array.isArray(cases)) {
        throw new Error("Los datos importados no son un array válido.");
      }

      if (cases.length === 0) {
        throw new Error("El archivo no contiene casos válidos.");
      }

      await this.set("cases", cases);
      return { success: true, count: cases.length };
    } catch (error) {
      console.error("[StorageManager] Error al importar casos:", error);
      return { success: false, error: error.message };
    }
  }

  // ---------- Métodos de respaldo de CONFIGURACIONES ----------
  async getConfig() {
    const config = await this.get("config", {});
    return config;
  }

  async exportConfig() {
    const config = await this.getConfig();
    if (!config || Object.keys(config).length === 0) {
      throw new Error("No hay configuración para exportar.");
    }
    return JSON.stringify(config, null, 2);
  }

  async importConfig(data) {
    try {
      const config = typeof data === "string" ? JSON.parse(data) : data;
      if (typeof config !== "object" || Array.isArray(config)) {
        throw new Error("La configuración debe ser un objeto válido.");
      }
      await this.set("config", config);
      return { success: true };
    } catch (error) {
      console.error("[StorageManager] Error al importar configuración:", error);
      return { success: false, error: error.message };
    }
  }

  // ---------- Métodos auxiliares (CSV) ----------
  _convertToCSV(data) {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map((obj) =>
      headers
        .map((key) => {
          let val = obj[key] || "";
          if (
            typeof val === "string" &&
            (val.includes(",") || val.includes('"') || val.includes("\n"))
          ) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  }

  _parseCSV(csvString) {
    const { headers, rows } = parseCSV(csvString);
    if (headers.length === 0) throw new Error("CSV inválido: faltan datos.");
    const result = rows.map((values) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h.trim()] = (values[idx] || "").trim();
      });
      return obj;
    });
    return result;
  }

  // ---------- Métodos de compatibilidad (no operativos) ----------
  async syncAll() {
    return { success: false, error: "Google Drive no disponible" };
  }

  async restoreAll() {
    return { success: false, error: "Google Drive no disponible" };
  }

  async connectDrive() {
    return { success: false, error: "Google Drive no disponible" };
  }

  disconnectDrive() {
    return { success: false };
  }

  isDriveConnected() {
    return false;
  }

  getDriveStatus() {
    return {
      isConnected: false,
      lastSync: null,
      syncStatus: "off",
      syncError: null,
    };
  }
}

export const storageManager = new StorageManager();
