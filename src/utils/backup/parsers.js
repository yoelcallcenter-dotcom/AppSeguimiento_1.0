/**
 * backup/parsers.js
 * Parser CSV robusto y serializador
 * Importa funciones base de csvUtils.js (fuente única de verdad).
 */

import { CSV_HEADERS, CSV_FIELD_MAP } from "./constants";
import appDB from "../../core/db/appDB";
import casesDB from "../../core/db/casesDB";
import { sanitizeCSV, escapeCSV, unescapeCSV, parseCSVLine, parseTagsString, parseReportesString, parseComentariosString, parseNotasVinculadas, parseAgendaVinculada, parseHistorialVinculada, serializarNotasVinculadas, serializarAgendaVinculada } from "./csvUtils";
import { parseCSV } from "../csvParse";

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
          case "caseHistory":
            caso[field] = parseHistorialVinculada(value);
            break;
          default:
            caso[field] = value;
        }
      }
    });

    if (caso.nombre || caso.telefono) {
      cases.push(caso);
    }
  }

  if (cases.length === 0) {
    throw new Error("No se encontraron casos válidos en el archivo CSV");
  }

  return cases;
}

async function getNotasPorCaso(caseId) {
  try {
    const all = await appDB.notes.toArray();
    return all.filter((n) => (n.relatedCaseIds || []).includes(caseId));
  } catch {
    return [];
  }
}

async function getEventosPorCaso(caseId) {
  try {
    const all = await appDB.events.toArray();
    return all.filter((e) => (e.relatedCaseIds || []).includes(caseId));
  } catch {
    return [];
  }
}

async function getHistorialPorCaso(caseId) {
  try {
    const all = await casesDB.case_history.toArray();
    return all.filter((h) => h.caseId === caseId);
  } catch {
    return [];
  }
}

const serializarHistorial = (eventos) => {
  if (!eventos || eventos.length === 0) return '';
  return eventos.map((e) => {
    const fecha = e.timestamp ? new Date(e.timestamp).toISOString().slice(0, 16).replace('T', ' ') : '';
    return `${fecha}|${e.type || ''}|${e.title || ''}|${e.description || ''}`;
  }).join('; ');
};

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

  const rows = await Promise.all(cases.map(async (c) => {
    const notas = c.notasVinculadas || (await getNotasPorCaso(c.id));
    const agenda = c.agendaVinculada || (await getEventosPorCaso(c.id));
    const historial = await getHistorialPorCaso(c.id);
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
      serializarHistorial(historial),
    ].map((v) => escapeCSV(sanitizeCSV(v)));
  }));

  return [CSV_HEADERS.join(","), ...rows.map((row) => row.join(","))].join(
    "\n"
  );
}
