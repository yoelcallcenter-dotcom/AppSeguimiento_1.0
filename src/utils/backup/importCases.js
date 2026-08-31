import { unescapeCSV } from './csvUtils';
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

/**
 * Neutraliza inyección de fórmulas en celdas (CSV injection): si un valor
 * comienza con =, +, - o @, se antepone una comilla para que se trate como
 * texto plano.
 */
const FORMULA_START = /^[=+\-@]/;
function neutralizarFormula(value) {
  if (typeof value !== 'string') return value;
  if (FORMULA_START.test(value.trim())) return `'${value}`;
  return value;
}

/**
 * Sanea un valor de importación: remueve HTML/scripts y neutraliza fórmulas.
 */
function sanitizarValor(value) {
  if (typeof value !== 'string') return value;
  return sanitizeString(neutralizarFormula(value));
}

/**
 * Valida que un caso importado tenga los campos mínimos y devuelve un error
 * descriptivo, o null si es válido.
 */
function validarCasoImportado(c) {
  if (!c || typeof c !== 'object') return 'Caso inválido';
  if (!c.id && !c.nombre && !c.telefono) return 'Faltan nombre y teléfono';
  return null;
}

const parseReportesStr = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split('//').filter((s) => s.trim()).map((item) => {
    const m = item.trim().match(/^\(([^)]+)\)\s*(.*)/);
    if (m) return { fecha: m[1].trim(), texto: m[2].trim() };
    return { fecha: '', texto: item.trim() };
  }).filter((r) => r.texto);
};

const parseComentariosStr = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split('//').filter((s) => s.trim()).map((item) => {
    const m = item.trim().match(/^\(([^)]+)\)\s*(.*)/);
    if (m) return { fecha: m[1].trim(), texto: m[2].trim(), usuario: 'Usuario' };
    return { fecha: new Date().toISOString(), texto: item.trim(), usuario: 'Usuario' };
  }).filter((c) => c.texto);
};

const parseTagsStr = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split(';').map((t) => t.trim()).filter(Boolean);
};

const parseNotasStr = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split('//').map((s) => s.trim()).filter(Boolean).map((item) => {
    const m = item.match(/^([^:]+):\s*(.*)\s*\(([^)]*)\)$/);
    if (m) return { titulo: m[1].trim(), contenido: m[2].trim(), fecha: m[3].trim() || '' };
    return { titulo: '', contenido: item, fecha: '' };
  });
};

const parseAgendaStr = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split('//').map((s) => s.trim()).filter(Boolean).map((item) => {
    const m = item.match(/^(.+)\s*\(([^)]*)\)$/);
    if (m) return { titulo: m[1].trim(), fecha: m[2].trim() || '' };
    return { titulo: item.trim(), fecha: '' };
  });
};

const parseHistorialStr = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split(';').map((s) => s.trim()).filter(Boolean).map((item) => {
    const parts = item.split('|');
    return {
      timestamp: parts[0] ? new Date(parts[0]).getTime() || Date.now() : Date.now(),
      type: parts[1] || 'manual',
      title: parts[2] || '',
      description: parts[3] || '',
    };
  });
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return parseTagsStr(value);
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
  // Integridad (1.3.3): fecha irrecuperable se conserva (o queda vacía);
  // nunca se inventa la fecha actual.
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
    reporteHistory: normalizeJSONorText(c.reporteHistory || c.reportes, parseReportesStr).map((r) => ({
      ...r,
      texto: sanitizarValor(r.texto),
    })),
    comentarios: normalizeJSONorText(c.comentarios, parseComentariosStr).map((c2) => ({
      ...c2,
      texto: sanitizarValor(c2.texto),
    })),
    notasVinculadas: normalizeJSONorText(c.notasVinculadas, parseNotasStr).map((n) => ({
      ...n,
      titulo: sanitizarValor(n.titulo),
      contenido: sanitizarValor(n.contenido),
    })),
    agendaVinculada: normalizeJSONorText(c.agendaVinculada, parseAgendaStr).map((e) => ({
      ...e,
      titulo: sanitizarValor(e.titulo),
    })),
    caseHistory: normalizeJSONorText(c.caseHistory, parseHistorialStr),
    fechaFirma: normalizeDate(c.fechaFirma),
    alertaFirmaEnviada: c.alertaFirmaEnviada || false,
    leido: c.leido !== undefined ? c.leido : true,
  };
}

export async function importCasesFromCSV(csvData) {
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
    // Reemplazo total atómico (transacción Dexie): si falla, no se pierde nada.
    await caseRepository.bulkReplace(deduplicated);
    
    // Importar case_history si existe
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
  } catch (storageError) {
    return { success: false, error: 'Error al guardar los datos importados' };
  }

  return {
    success: true,
    count: deduplicated.length,
    cases: deduplicated,
    warnings: errorCount > 0 ? `${errorCount} filas ignoradas` : undefined,
  };
}
