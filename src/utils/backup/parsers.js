/**
 * backup/parsers.js
 * Parser CSV robusto y serializador
 */

import { CSV_HEADERS, CSV_FIELD_MAP, STORAGE_KEYS } from "./constants";
import appDB from "../../core/db/appDB";
import { sanitizeCSV } from "./csvUtils";
import { parseCSV } from "../csvParse";

/**
 * Escapa un valor para CSV
 * @param {*} value - Valor a escapar
 * @returns {string} Valor escapado
 */
export function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);

  // Si contiene caracteres especiales, envolver en comillas
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Desescapa un valor de CSV
 * @param {string} value - Valor a desescapar
 * @returns {string} Valor desescapado
 */
export function unescapeCSV(value) {
  if (!value) return "";
  let str = value.trim();

  // Quitar comillas exteriores si existen
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.slice(1, -1).replace(/""/g, '"');
  }

  return str;
}

/**
 * Parsea una línea CSV respetando comillas
 * @param {string} line - Línea CSV
 * @returns {string[]} Array de valores
 */
export function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Doble comilla dentro de comillas (escape)
        current += '"';
        i++;
      } else {
        // Alternar estado de comillas
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Fin de campo
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Último campo
  result.push(current.trim());
  return result;
}

/**
 * Parsea reportes desde string
 * @param {string} str - String de reportes
 * @returns {Array} Array de reportes
 */
export function parseReportesString(str) {
  if (!str || typeof str !== "string") return [];

  const ORIGEN_MAP = { "Operador": "Operador", "Primera Atención": "Primera Atención", "Estudio Jurídico": "Estudio Jurídico" };

  const items = str.split("//").filter((s) => s.trim());
  return items
    .map((item) => {
      const match = item.trim().match(/^\(([^)]+)\)\s*(?:\[([^\]]+)\]\s*)?(.*)/);
      if (match) {
        const origen = match[2] && ORIGEN_MAP[match[2]] ? ORIGEN_MAP[match[2]] : "Operador";
        return {
          fecha: match[1].trim(),
          texto: match[3].trim(),
          origen,
        };
      }
      return {
        fecha: "",
        texto: item.trim(),
        origen: "Operador",
      };
    })
    .filter((r) => r.texto);
}

/**
 * Parsea comentarios desde string
 * @param {string} str - String de comentarios
 * @returns {Array} Array de comentarios
 */
export function parseComentariosString(str) {
  if (!str || typeof str !== "string") return [];

  const items = str.split("//").filter((s) => s.trim());
  return items
    .map((item) => {
      const match = item.trim().match(/^\(([^)]+)\)\s*(.*)/);
      if (match) {
        return {
          fecha: match[1].trim(),
          texto: match[2].trim(),
          usuario: "Usuario",
        };
      }
      return {
        fecha: new Date().toISOString(),
        texto: item.trim(),
        usuario: "Usuario",
      };
    })
    .filter((c) => c.texto);
}

/**
 * Parsea tags desde string
 * @param {string} str - String de tags
 * @returns {Array} Array de tags
 */
export function parseTagsString(str) {
  if (!str || typeof str !== "string") return [];
  return str
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Serializa notas vinculadas para CSV
 * @param {Array} notas - Array de notas
 * @returns {string} String serializado
 */
export function serializarNotasVinculadas(notas) {
  if (!notas || notas.length === 0) return "";
  return notas
    .map((n) => `${n.titulo || n.title || ""}: ${n.contenido || n.content || ""} (${n.fecha || ""})`)
    .join(" // ");
}

/**
 * Parsea notas vinculadas desde CSV
 * @param {string} str - String de notas
 * @returns {Array} Array de notas
 */
export function parseNotasVinculadas(str) {
  if (!str || typeof str !== "string") return [];
  return str
    .split("//")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^([^:]+):\s*(.*)\s*\(([^)]*)\)$/);
      if (match) {
        return {
          titulo: match[1].trim(),
          contenido: match[2].trim(),
          fecha: match[3].trim() || new Date().toISOString(),
        };
      }
      return { titulo: "", contenido: item, fecha: new Date().toISOString() };
    });
}

/**
 * Serializa agenda vinculada para CSV
 * @param {Array} eventos - Array de eventos
 * @returns {string} String serializado
 */
export function serializarAgendaVinculada(eventos) {
  if (!eventos || eventos.length === 0) return "";
  return eventos
    .map((e) => {
      const fecha = e.fecha || (e.startDate ? e.startDate.slice(0, 10) : "");
      return `${e.titulo || e.title || ""} (${fecha})`;
    })
    .join(" // ");
}

/**
 * Parsea agenda vinculada desde CSV
 * @param {string} str - String de agenda
 * @returns {Array} Array de eventos
 */
export function parseAgendaVinculada(str) {
  if (!str || typeof str !== "string") return [];
  return str
    .split("//")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^(.+)\s*\(([^)]*)\)$/);
      if (match) {
        return {
          titulo: match[1].trim(),
          fecha: match[2].trim() || new Date().toISOString().slice(0, 10),
        };
      }
      return { titulo: item.trim(), fecha: new Date().toISOString().slice(0, 10) };
    });
}

/**
 * Parsea CSV a array de casos
 * @param {string} csvData - Datos CSV
 * @returns {Array} Array de casos
 * @throws {Error} Si el CSV es inválido
 */
export function parseCSVToCases(csvData) {
  const { headers, rows } = parseCSV(csvData);

  if (headers.length === 0) {
    throw new Error("El archivo CSV está vacío o es inválido");
  }

  // Parsear headers
  const normalizedHeaders = headers.map((h) => unescapeCSV(h).trim());

  const cases = [];
  for (const values of rows) {
    const caso = {};

    normalizedHeaders.forEach((header, index) => {
      const field = CSV_FIELD_MAP[header];
      const value =
        values[index] !== undefined ? unescapeCSV(values[index]) : "";

      if (field && value) {
        switch (field) {
          case "tags":
            caso[field] = parseTagsString(value);
            break;
          case "reporteHistory":
            caso[field] = parseReportesString(value);
            break;
          case "comentarios":
            caso[field] = parseComentariosString(value);
            break;
          case "notasVinculadas":
            caso[field] = parseNotasVinculadas(value);
            break;
          case "agendaVinculada":
            caso[field] = parseAgendaVinculada(value);
            break;
          default:
            caso[field] = value;
        }
      }
    });

    // Validar que tenga al menos nombre o teléfono
    if (caso.nombre || caso.telefono) {
      cases.push(caso);
    }
  }

  if (cases.length === 0) {
    throw new Error("No se encontraron casos válidos en el archivo CSV");
  }

  return cases;
}

/**
 * Obtiene notas vinculadas a un caso desde la base de datos (appDB)
 * @param {string} caseId - ID del caso
 * @returns {Promise<Array>} Array de notas vinculadas
 */
async function getNotasPorCaso(caseId) {
  try {
    const all = await appDB.notes.toArray();
    return all.filter((n) => (n.relatedCaseIds || []).includes(caseId));
  } catch {
    return [];
  }
}

/**
 * Obtiene eventos vinculados a un caso desde la base de datos (appDB)
 * @param {string} caseId - ID del caso
 * @returns {Promise<Array>} Array de eventos vinculados
 */
async function getEventosPorCaso(caseId) {
  try {
    const all = await appDB.events.toArray();
    return all.filter((e) => (e.relatedCaseIds || []).includes(caseId));
  } catch {
    return [];
  }
}

/**
 * Genera CSV desde casos
 * @param {Array} cases - Array de casos
 * @returns {string} CSV string
 * @throws {Error} Si no hay casos
 */
export async function generateCSVFromCases(cases) {
  if (!cases || cases.length === 0) {
    throw new Error("No hay casos para exportar");
  }

  const formatearReportes = (reportes) => {
    if (!reportes || reportes.length === 0) return "";
    return reportes.map((r) => {
      const origenTag = r.origen ? ` [${r.origen}]` : "";
      return `(${r.fecha})${origenTag} ${r.texto}`;
    }).join(" // ");
  };

  const formatearComentarios = (comentarios) => {
    if (!comentarios || comentarios.length === 0) return "";
    return comentarios.map((c) => `(${c.fecha}) ${c.texto}`).join(" // ");
  };

  // Generar filas
  const rows = await Promise.all(cases.map(async (c) => {
    const notas = c.notasVinculadas || (await getNotasPorCaso(c.id));
    const agenda = c.agendaVinculada || (await getEventosPorCaso(c.id));
    return [
      c.id || "",
      c.fecha || "",
      c.nombre || "",
      c.telefono || "",
      c.localidad || "",
      c.aseguradora || "",
      c.profesion || "",
      c.ingreso || "",
      c.lesion || "",
      c.tipoIngreso || "",
      c.cita || "",
      c.estado || "",
      c.estudioJuridico || "",
      c.observaciones || "",
      (c.tags || []).join("; "),
      formatearReportes(c.reporteHistory || []),
      formatearComentarios(c.comentarios || []),
      serializarNotasVinculadas(notas),
      serializarAgendaVinculada(agenda),
    ].map((v) => escapeCSV(sanitizeCSV(v)));
  }));

  return [CSV_HEADERS.join(","), ...rows.map((row) => row.join(","))].join(
    "\n"
  );
}
