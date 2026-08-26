/**
 * backup/validators.js
 * Validadores de estructura de datos
 */

import {
  CASE_REQUIRED_FIELDS,
  CASE_ARRAY_FIELDS,
  CASE_DATE_FIELDS,
  CONFIG_KEYS,
} from "./constants";
import { normalizeDate } from "../dateFilters";

/**
 * Valida que un objeto sea un caso válido
 * @param {Object} caso - Objeto caso a validar
 * @returns {boolean} True si es válido
 */
export function isValidCase(caso) {
  if (!caso || typeof caso !== "object") return false;
  // Debe tener al menos nombre o teléfono
  return !!(caso.nombre || caso.telefono);
}

/**
 * Normaliza un caso
 * @param {Object} caso - Caso a normalizar
 * @returns {Object|null} Caso normalizado o null si es inválido
 */
export function normalizeCase(caso) {
  if (!isValidCase(caso)) return null;

  const normalized = { ...caso };

  // Asegurar ID
  if (!normalized.id) {
    normalized.id =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Asegurar arrays
  CASE_ARRAY_FIELDS.forEach((field) => {
    if (!Array.isArray(normalized[field])) {
      normalized[field] = [];
    }
  });

  // Asegurar fecha: normaliza DD/MM/YYYY y DD/MM a ISO para evitar que
  // `new Date("07/08")` las interprete como año 2001 o intercambie mes/día.
  // Integridad (1.3.3): una fecha irrecuperable NUNCA se reemplaza por la
  // fecha actual — se conserva el valor original para revisión del usuario.
  const fechaIso = normalizeDate(normalized.fecha);
  if (fechaIso) {
    normalized.fecha = fechaIso;
  } else if (!normalized.fecha || typeof normalized.fecha !== "string") {
    normalized.fecha = "";
  }

  if (normalized.fechaFirma) {
    normalized.fechaFirma = normalizeDate(normalized.fechaFirma) || normalized.fechaFirma;
  }

  // Normalizar tags (strings)
  if (Array.isArray(normalized.tags)) {
    normalized.tags = normalized.tags
      .filter((t) => t && typeof t === "string")
      .map((t) => t.trim());
  }

  // Normalizar notasVinculadas
  if (Array.isArray(normalized.notasVinculadas)) {
    normalized.notasVinculadas = normalized.notasVinculadas.filter(
      (n) => n && (n.titulo || n.contenido)
    );
  }

  // Normalizar agendaVinculada
  if (Array.isArray(normalized.agendaVinculada)) {
    normalized.agendaVinculada = normalized.agendaVinculada.filter(
      (e) => e && e.titulo
    );
  }

  // Normalizar reporteHistory
  if (Array.isArray(normalized.reporteHistory)) {
    normalized.reporteHistory = normalized.reporteHistory
      .filter((r) => r && typeof r === "object" && r.texto)
      .map((r) => ({
        ...r,
        fecha: r.fecha || "",
        texto: r.texto.trim(),
      }));
  }

  // Normalizar comentarios
  if (Array.isArray(normalized.comentarios)) {
    normalized.comentarios = normalized.comentarios
      .filter((c) => c && typeof c === "object" && c.texto)
      .map((c) => ({
        ...c,
        fecha: c.fecha || new Date().toISOString(),
        texto: c.texto.trim(),
        usuario: c.usuario || "Usuario",
      }));
  }

  // Limpiar strings
  ["nombre", "telefono", "localidad", "aseguradora"].forEach((field) => {
    if (normalized[field] && typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  });

  return normalized;
}

/**
 * Valida estructura de exportación de casos
 * @param {*} data - Datos a validar
 * @returns {Object} { valid, cases, count, error }
 */
export function validateCaseExport(data) {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      error: "Los datos no son un objeto válido",
    };
  }

  // Buscar casos en diferentes formatos
  let cases = null;

  if (data.data && Array.isArray(data.data)) {
    cases = data.data;
  } else if (data.configuracion && data.configuracion.casos) {
    cases = data.configuracion.casos;
  } else if (Array.isArray(data)) {
    cases = data;
  }

  if (!cases || !Array.isArray(cases) || cases.length === 0) {
    return {
      valid: false,
      error: "No se encontraron casos válidos en el archivo",
    };
  }

  // Filtrar casos válidos
  const validCases = cases.filter(isValidCase);

  if (validCases.length === 0) {
    return {
      valid: false,
      error: "El archivo no contiene casos válidos (sin nombre o teléfono)",
    };
  }

  return {
    valid: true,
    cases: validCases,
    count: validCases.length,
  };
}

/**
 * Valida estructura de exportación de configuración
 * @param {*} data - Datos a validar
 * @returns {Object} { valid, config, error }
 */
export function validateConfigExport(data) {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      error: "Los datos no son un objeto válido",
    };
  }

  // Buscar configuración en diferentes formatos
  let configData = null;

  if (data.configuracion) {
    configData = data.configuracion;
  } else if (data.config) {
    configData = data.config;
  } else if (data.pasos || data.speechs || data.art) {
    configData = data;
  }

  if (!configData || typeof configData !== "object") {
    return {
      valid: false,
      error: "No se encontraron datos de configuración válidos",
    };
  }

  // Verificar que tenga al menos algunas claves válidas
  const validKeys = Object.keys(configData).filter((key) => {
    if (key === "conversaciones") return true;
    return CONFIG_KEYS.some((storageKey) => {
      const cleanKey = storageKey.replace("-art-tracker", "");
      return key === cleanKey;
    });
  });

  if (validKeys.length === 0) {
    return {
      valid: false,
      error: "No se encontraron claves de configuración válidas",
    };
  }

  return {
    valid: true,
    config: configData,
  };
}

/**
 * Valida que un array de casos no tenga duplicados por ID
 * @param {Array} cases - Array de casos
 * @returns {Array} Casos sin duplicados
 */
export function deduplicateCases(cases) {
  if (!Array.isArray(cases)) return [];

  const seen = new Set();
  return cases.filter((c) => {
    if (!c.id) return true;
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
