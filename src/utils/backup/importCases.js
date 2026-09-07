import { unescapeCSV, parseReportesString, parseComentariosString, parseTagsString, parseNotasVinculadas, parseAgendaVinculada, parseHistorialVinculada } from './csvUtils';
import { CSV_FIELD_MAP } from './constants';
import { sanitizeString } from '../sanitize';
import { normalizeDate } from '../dateFilters';
import { parseCSV } from '../csvParse';
import { caseRepository } from '../../core/cases/caseRepository';
import { notifyChange, SYNC_EVENTS } from '../../core/sync/syncService';
import casesDB from '../../core/db/casesDB';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const FORMULA_START = /^[=+\-@]/;
function neutralizarFormula(value) {
  if (typeof value !== 'string') return value;
  if (FORMULA_START.test(value.trim())) return `'${value}`;
  return value;
}

function sanitizarValor(value) {
  if (typeof value !== 'string') return value;
  return sanitizeString(neutralizarFormula(value));
}

function validarCasoImportado(c) {
  if (!c || typeof c !== 'object') return 'Caso inválido';
  if (!c.id && !c.nombre && !c.telefono) return 'Faltan nombre y teléfono';
  return null;
}

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return parseTagsString(value);
  }
  return [];
};

const normalizeJSONorText = (value, textParser) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
        return [];
      } catch {}
    }
    return textParser(value);
  }
  if (value && typeof value === 'object') return [value];
  return [];
};

function normalizeCase(c) {
  const id = sanitizarValor(c.id) || generateId();
  const fechaIso = normalizeDate(c.fecha);
  return {
    id,
    fecha: fechaIso || (typeof c.fecha === 'string' ? c.fecha.trim() : ''),
    nombre: sanitizarValor(c.nombre || ''),
    telefono: sanitizarValor(c.telefono || ''),
    localidad: sanitizarValor(c.localidad || ''),
    aseguradora: sanitizarValor(c.aseguradora || ''),
    profesion: sanitizarValor(c.profesion || ''),
    ingreso: sanitizarValor(c.ingreso || ''),
    lesion: sanitizarValor(c.lesion || ''),
    tipoIngreso: sanitizarValor(c.tipoIngreso || ''),
    cita: sanitizarValor(c.cita || ''),
    estado: sanitizarValor(c.estado || 'Sin reporte'),
    estudioJuridico: sanitizarValor(c.estudioJuridico || ''),
    observaciones: sanitizarValor(c.observaciones || ''),
    tags: normalizeArray(c.tags).map(sanitizarValor),
    reporteHistory: normalizeJSONorText(c.reporteHistory || c.reportes, parseReportesString).map((r) => ({
      ...r,
      texto: sanitizarValor(r.texto),
    })),
    comentarios: normalizeJSONorText(c.comentarios, parseComentariosString).map((c2) => ({
      ...c2,
      texto: sanitizarValor(c2.texto),
    })),
    notasVinculadas: normalizeJSONorText(c.notasVinculadas, parseNotasVinculadas).map((n) => ({
      ...n,
      titulo: sanitizarValor(n.titulo),
      contenido: sanitizarValor(n.contenido),
    })),
    agendaVinculada: normalizeJSONorText(c.agendaVinculada, parseAgendaVinculada).map((e) => ({
      ...e,
      titulo: sanitizarValor(e.titulo),
    })),
    caseHistory: normalizeJSONorText(c.caseHistory, parseHistorialVinculada),
    fechaFirma: normalizeDate(c.fechaFirma),
    alertaFirmaEnviada: c.alertaFirmaEnviada || false,
    leido: c.leido !== undefined ? c.leido : true,
  };
}

/**
 * Importa casos desde CSV.
 * @param {string} csvData - Datos CSV.
 * @param {object} [options] - Opciones de importación.
 * @param {string} [options.mode='append'] - 'append' (agrega sin borrar) o 'replace' (reemplaza todo).
 * @returns {Promise<{success: boolean, count?: number, cases?: Array, error?: string, warnings?: string}>}
 */
export async function importCasesFromCSV(csvData, options = {}) {
  const mode = options.mode === 'replace' ? 'replace' : 'append';

  const { headers, rows } = parseCSV(csvData);

  if (headers.length === 0) {
    return { success: false, error: 'El archivo CSV está vacío o es inválido' };
  }

  const normalizedHeaders = headers.map((h) => unescapeCSV(h).trim());

  const cases = [];
  let errorCount = 0;

  for (const values of rows) {
    try {
      const caso = {};

      normalizedHeaders.forEach((header, index) => {
        const field = CSV_FIELD_MAP[header];
        const value = values[index] !== undefined ? unescapeCSV(values[index]) : '';
        if (field && value !== '') {
          caso[field] = value;
        }
      });

      if (caso.nombre || caso.telefono) {
        cases.push(caso);
      } else {
        errorCount++;
      }
    } catch {
      errorCount++;
    }
  }

  if (cases.length === 0) {
    return { success: false, error: 'No se encontraron casos válidos en el archivo CSV' };
  }

  const normalizedCases = [];
  let normErrorCount = 0;

  for (const c of cases) {
    try {
      const normalized = normalizeCase(c);
      const validationError = validarCasoImportado(normalized);
      if (validationError) {
        normErrorCount++;
      } else {
        normalizedCases.push(normalized);
      }
    } catch {
      normErrorCount++;
    }
  }

  if (normalizedCases.length === 0) {
    return { success: false, error: 'No se pudieron normalizar los casos del CSV' };
  }

  const seen = new Set();
  const deduplicated = normalizedCases.filter((c) => {
    if (!c.id) return true;
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  try {
    let result;
    if (mode === 'replace') {
      result = await caseRepository.bulkReplace(deduplicated);
    } else {
      result = await caseRepository.bulkAppend(deduplicated);
    }

    const historyToImport = deduplicated
      .filter((c) => Array.isArray(c.caseHistory) && c.caseHistory.length > 0)
      .flatMap((c) => c.caseHistory.map((h) => ({
        caseId: c.id,
        timestamp: h.timestamp || Date.now(),
        type: h.type || 'manual',
        title: h.title || '',
        description: h.description || '',
      })));

    if (historyToImport.length > 0) {
      await casesDB.case_history.bulkAdd(historyToImport);
    }

    notifyChange(SYNC_EVENTS.DATA_IMPORTED, { source: 'csv', count: deduplicated.length });

    const savedCases = mode === 'replace' ? (result || deduplicated) : (result?.merged || deduplicated);
    return {
      success: true,
      count: deduplicated.length,
      cases: savedCases,
      warnings: errorCount > 0 ? `${errorCount} filas ignoradas` : undefined,
    };
  } catch (storageError) {
    return { success: false, error: 'Error al guardar los datos importados' };
  }
}
