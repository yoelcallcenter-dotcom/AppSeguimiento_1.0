/**
 * caseHistory.js
 * Historial y seguimiento de casos (Release 1.3.1).
 *
 * Cada evento representa una acción o cambio relevante en la evolución del
 * caso (nunca renderizados ni aperturas). Los eventos se persisten en la
 * tabla `case_history` (CasesDB, IndexedDB) indexada por `caseId`, y se
 * cargan solo cuando se necesitan (detalle del caso).
 *
 * El texto visible se construye de forma consistente desde el tipo de evento;
 * `metadata` conserva el contexto estructurado (valores anterior/nuevo, ids).
 */

import casesDB from '../db/casesDB';
import { nowISO } from '../db/versioning';

/** Ventana (ms) para considerar dos registros como duplicado de una misma acción. */
const DUPLICATE_WINDOW_MS = 1500;

/** Longitud máxima del texto visible de un evento. */
const MAX_DESC_LENGTH = 220;

/** Tipos de evento de historial. */
export const HISTORY_TYPES = {
  CASE_CREATED: 'case_created',
  CASE_UPDATED: 'case_updated',
  STATUS_CHANGED: 'status_changed',
  ESTUDIO_CHANGED: 'estudio_changed',
  ASEGURADORA_CHANGED: 'aseguradora_changed',
  FIRMA_REGISTERED: 'firma_registered',
  NOTE_ADDED: 'note_added',
  EVENT_LINKED: 'event_linked',
  REPORT_ADDED: 'report_added',
  MANUAL_INTERACTION: 'manual_interaction',
};

/** Tipos de interacción manual disponibles para registro rápido. */
export const TIPOS_INTERACCION = [
  'Llamada realizada',
  'No atendió',
  'Se envió información',
  'Volver a llamar',
  'Conversación relevante',
  'Otro',
];

/** Estados que no requieren seguimiento (casos cerrados/finales por defecto). */
export const ESTADOS_SIN_SEGUIMIENTO = ['Firmo', 'No le interesa', 'No viable', 'Baja'];

/** Umbral por defecto (días sin actividad) para considerar un caso inactivo. */
export const INACTIVIDAD_DEFAULT_DIAS = 5;

/** Campos generales relevantes para CASE_UPDATED: [clave, etiqueta visible]. */
const CAMPOS_GENERALES = [
  ['nombre', 'Nombre'],
  ['telefono', 'Teléfono'],
  ['localidad', 'Localidad'],
  ['profesion', 'Profesión'],
  ['ingreso', 'Ingreso'],
  ['lesion', 'Lesión'],
  ['tipoIngreso', 'Tipo de ingreso'],
  ['cita', 'Cita'],
  ['horario', 'Horario'],
  ['observaciones', 'Observaciones'],
];

function normalizarValor(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(', ');
  return String(v).trim();
}

function truncar(texto, max = MAX_DESC_LENGTH) {
  const t = String(texto || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function valoresDistintos(a, b) {
  return normalizarValor(a) !== normalizarValor(b);
}

function mismoPrefijo(listaPrevia, listaNueva) {
  if (!Array.isArray(listaPrevia)) return true;
  return listaNueva.every((item, i) => {
    if (i < listaPrevia.length) return item === listaPrevia[i];
    return true;
  });
}

/**
 * Compara dos versiones de un caso y devuelve los cambios relevantes.
 * Devuelve un array vacío si no hay cambios reales (no se debe registrar nada).
 *
 * @param {object|null} prev caso anterior.
 * @param {object} next caso nuevo.
 * @returns {Array<object>} descriptores de cambio ({ type, ... }).
 */
export function computeCaseChanges(prev, next) {
  if (!next) return [];
  if (!prev) return [{ type: HISTORY_TYPES.CASE_CREATED }];

  const cambios = [];

  if (valoresDistintos(prev.estado, next.estado)) {
    cambios.push({
      type: HISTORY_TYPES.STATUS_CHANGED,
      field: 'estado',
      previousValue: normalizarValor(prev.estado),
      newValue: normalizarValor(next.estado),
    });
  }

  if (valoresDistintos(prev.estudioJuridico, next.estudioJuridico)) {
    cambios.push({
      type: HISTORY_TYPES.ESTUDIO_CHANGED,
      field: 'estudioJuridico',
      previousValue: normalizarValor(prev.estudioJuridico) || '(sin estudio)',
      newValue: normalizarValor(next.estudioJuridico) || '(sin estudio)',
    });
  }

  if (valoresDistintos(prev.aseguradora, next.aseguradora)) {
    cambios.push({
      type: HISTORY_TYPES.ASEGURADORA_CHANGED,
      field: 'aseguradora',
      previousValue: normalizarValor(prev.aseguradora) || '(sin aseguradora)',
      newValue: normalizarValor(next.aseguradora) || '(sin aseguradora)',
    });
  }

  // Firma registrada: se asigna/actualiza fechaFirma con valor concreto.
  if (
    normalizarValor(prev.fechaFirma) !== normalizarValor(next.fechaFirma) &&
    normalizarValor(next.fechaFirma) !== ''
  ) {
    cambios.push({
      type: HISTORY_TYPES.FIRMA_REGISTERED,
      field: 'fechaFirma',
      previousValue: normalizarValor(prev.fechaFirma),
      newValue: normalizarValor(next.fechaFirma),
    });
  }

  // Campos generales: se agrupan en un único evento comprensible.
  const labelsModificados = [];
  for (const [key, label] of CAMPOS_GENERALES) {
    if (valoresDistintos(prev[key], next[key])) labelsModificados.push(label);
  }
  if ((prev.tags || []).join('|') !== (next.tags || []).join('|')) {
    labelsModificados.push('Etiquetas');
  }
  if (labelsModificados.length > 0) {
    cambios.push({
      type: HISTORY_TYPES.CASE_UPDATED,
      field: '__general__',
      labels: labelsModificados,
      previousValue: null,
      newValue: null,
    });
  }

  // Reportes agregados (crecen al final manteniendo el prefijo intacto).
  const prevRep = Array.isArray(prev.reporteHistory) ? prev.reporteHistory : [];
  const nextRep = Array.isArray(next.reporteHistory) ? next.reporteHistory : [];
  if (nextRep.length > prevRep.length && mismoPrefijo(prevRep, nextRep)) {
    cambios.push({
      type: HISTORY_TYPES.REPORT_ADDED,
      field: 'reporteHistory',
      previousValue: null,
      newValue: null,
      addedCount: nextRep.length - prevRep.length,
      addedText: truncar(nextRep[nextRep.length - 1]?.texto || '', 120),
    });
  }

  // Comentarios nuevos (interacciones manuales), detectados por id.
  const prevIds = new Set((prev.comentarios || []).map((c) => c.id));
  const nuevosComentarios = (next.comentarios || []).filter(
    (c) => c && c.id && !prevIds.has(c.id)
  );
  for (const c of nuevosComentarios) {
    cambios.push({
      type: HISTORY_TYPES.MANUAL_INTERACTION,
      field: 'comentarios',
      previousValue: null,
      newValue: truncar(c.texto),
      interactionType: c.tipo || '',
      comentarioId: c.id,
    });
  }

  return cambios;
}

/**
 * Construye los eventos de historial a partir de los descriptores de cambio.
 * Todos los eventos comparten el mismo timestamp (contexto temporal único).
 */
export function eventsFromChanges(caseId, cambios, { timestamp = nowISO(), source = 'automatic' } = {}) {
  const ts = timestamp;
  const events = [];

  for (const cambio of cambios) {
    switch (cambio.type) {
      case HISTORY_TYPES.CASE_CREATED:
        events.push({
          caseId: String(caseId),
          type: cambio.type,
          title: 'Caso creado',
          description: 'El caso fue dado de alta en el sistema',
          metadata: null,
          source,
          timestamp: ts,
        });
        break;

      case HISTORY_TYPES.STATUS_CHANGED:
        events.push({
          caseId: String(caseId),
          type: cambio.type,
          title: 'Estado actualizado',
          description: `El caso pasó de "${cambio.previousValue}" a "${cambio.newValue}"`,
          metadata: { field: 'estado', previousValue: cambio.previousValue, newValue: cambio.newValue },
          source,
          timestamp: ts,
        });
        break;

      case HISTORY_TYPES.ESTUDIO_CHANGED:
        events.push({
          caseId: String(caseId),
          type: cambio.type,
          title: 'Estudio jurídico actualizado',
          description: `De "${cambio.previousValue}" a "${cambio.newValue}"`,
          metadata: { field: 'estudioJuridico', previousValue: cambio.previousValue, newValue: cambio.newValue },
          source,
          timestamp: ts,
        });
        break;

      case HISTORY_TYPES.ASEGURADORA_CHANGED:
        events.push({
          caseId: String(caseId),
          type: cambio.type,
          title: 'Aseguradora actualizada',
          description: `De "${cambio.previousValue}" a "${cambio.newValue}"`,
          metadata: { field: 'aseguradora', previousValue: cambio.previousValue, newValue: cambio.newValue },
          source,
          timestamp: ts,
        });
        break;

      case HISTORY_TYPES.FIRMA_REGISTERED:
        events.push({
          caseId: String(caseId),
          type: cambio.type,
          title: 'Firma registrada',
          description: `Fecha de firma: ${cambio.newValue}`,
          metadata: { field: 'fechaFirma', previousValue: cambio.previousValue, newValue: cambio.newValue },
          source,
          timestamp: ts,
        });
        break;

      case HISTORY_TYPES.CASE_UPDATED:
        events.push({
          caseId: String(caseId),
          type: cambio.type,
          title: 'Información actualizada',
          description: `Se modificaron: ${cambio.labels.join(', ')}`,
          metadata: { fields: cambio.labels },
          source,
          timestamp: ts,
        });
        break;

      case HISTORY_TYPES.REPORT_ADDED:
        events.push({
          caseId: String(caseId),
          type: cambio.type,
          title: cambio.addedCount > 1 ? `Reportes agregados (${cambio.addedCount})` : 'Reporte agregado',
          description: cambio.addedText || 'Nuevo reporte cargado',
          metadata: { count: cambio.addedCount },
          source,
          timestamp: ts,
        });
        break;

      case HISTORY_TYPES.MANUAL_INTERACTION:
        events.push({
          caseId: String(caseId),
          type: cambio.type,
          title: cambio.interactionType || 'Interacción registrada',
          description: cambio.newValue || '',
          metadata: { comentarioId: cambio.comentarioId, interactionType: cambio.interactionType || '' },
          source: 'manual',
          timestamp: ts,
        });
        break;

      default:
        break;
    }
  }

  return events.map((e) => ({ ...e, description: truncar(e.description) }));
}

async function existeDuplicado(event) {
  try {
    const desde = new Date(new Date(event.timestamp).getTime() - DUPLICATE_WINDOW_MS).toISOString();
    const recientes = await casesDB.case_history
      .where('caseId')
      .equals(event.caseId)
      .and(
        (e) =>
          e.type === event.type &&
          e.title === event.title &&
          e.description === event.description &&
          e.timestamp >= desde &&
          e.timestamp <= event.timestamp
      )
      .toArray();
    return recientes.length > 0;
  } catch {
    return false;
  }
}

/**
 * Registra un evento individual con protección anti-duplicados.
 * @param {object} event { caseId, type, title, description, metadata, source, timestamp }
 * @returns {Promise<boolean>} true si se registró.
 */
export async function recordCaseEvent(event) {
  if (!event || !event.caseId || !event.type) return false;
  const normalized = {
    ...event,
    caseId: String(event.caseId),
    timestamp: event.timestamp || nowISO(),
    source: event.source || 'automatic',
    title: event.title || '',
    description: truncar(event.description),
    metadata: event.metadata || null,
  };
  try {
    if (await existeDuplicado(normalized)) return false;
    await casesDB.case_history.add(normalized);
    return true;
  } catch (err) {
    console.warn('[caseHistory] No se pudo registrar el evento:', err);
    return false;
  }
}

/**
 * Registra varios eventos de una misma acción (mismo timestamp/contexto).
 * @returns {Promise<number>} cantidad efectivamente registrada.
 */
export async function recordCaseEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return 0;
  let registrados = 0;
  for (const e of events) {
    if (await recordCaseEvent(e)) registrados += 1;
  }
  return registrados;
}

/**
 * Detecta cambios entre dos casos, construye los eventos y los registra.
 * Atajo usado por las acciones de guardado de App.
 * @returns {Promise<number>} eventos registrados (0 si no hubo cambios).
 */
export async function recordCaseChanges(caseId, prev, next, opts = {}) {
  const cambios = computeCaseChanges(prev, next);
  if (cambios.length === 0) return 0;
  const events = eventsFromChanges(caseId, cambios, opts);
  return await recordCaseEvents(events);
}

/** Eventos de notas vinculadas a uno o más casos (NOTE_ADDED, referencia a la nota). */
export async function recordNotesAddedForCases(caseIds, { noteId, title }) {
  const ids = Array.isArray(caseIds) ? caseIds : [];
  if (ids.length === 0 || !noteId) return 0;
  const timestamp = nowISO();
  const events = ids.map((caseId) => ({
    caseId: String(caseId),
    type: HISTORY_TYPES.NOTE_ADDED,
    title: 'Nota agregada',
    description: title || 'Nota vinculada al caso',
    metadata: { noteId },
    source: 'automatic',
    timestamp,
  }));
  return await recordCaseEvents(events);
}

/** Eventos de calendario vinculados a uno o más casos (EVENT_LINKED). */
export async function recordEventLinkedForCases(caseIds, { eventId, title, startDate }) {
  const ids = Array.isArray(caseIds) ? caseIds : [];
  if (ids.length === 0 || !eventId) return 0;
  const timestamp = nowISO();
  const events = ids.map((caseId) => ({
    caseId: String(caseId),
    type: HISTORY_TYPES.EVENT_LINKED,
    title: 'Evento de calendario vinculado',
    description: title || 'Evento vinculado al caso',
    metadata: { eventId, startDate: startDate || '' },
    source: 'automatic',
    timestamp,
  }));
  return await recordCaseEvents(events);
}

/**
 * Devuelve el historial de un caso, ordenado del más reciente al más antiguo.
 * @param {string|number} caseId
 * @returns {Promise<Array>}
 */
export async function getCaseHistory(caseId) {
  if (caseId === undefined || caseId === null || caseId === '') return [];
  try {
    const rows = await casesDB.case_history.where('caseId').equals(String(caseId)).toArray();
    return rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (err) {
    console.warn('[caseHistory] Error al leer historial:', err);
    return [];
  }
}

/** Elimina el historial asociado a un caso (al eliminar el caso). */
export async function deleteCaseHistory(caseId) {
  try {
    await casesDB.case_history.where('caseId').equals(String(caseId)).delete();
    return true;
  } catch {
    return false;
  }
}

/**
 * Última actividad real del caso: propiedad dedicada con fallback seguro
 * para casos creados antes de 1.3.1 (nunca se inventan fechas).
 */
export function resolveLastActivity(caso) {
  if (!caso) return null;
  return caso.lastActivityAt || caso.updatedAt || caso.createdAt || null;
}

/**
 * Información de inactividad de un caso.
 * Los estados incluidos en `ignoredStates` no se marcan como inactivos.
 * @returns {{ days: number, inactive: boolean, tracked: boolean, lastActivity: string|null }}
 */
export function getInactivityInfo(caso, options = {}) {
  const {
    thresholdDays = INACTIVIDAD_DEFAULT_DIAS,
    ignoredStates = ESTADOS_SIN_SEGUIMIENTO,
    now = new Date(),
  } = options;

  const lastActivity = resolveLastActivity(caso);
  const tracked = !(ignoredStates || []).includes(caso?.estado);
  if (!lastActivity) {
    return { days: 0, inactive: false, tracked, lastActivity: null };
  }
  const days = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / 86400000);
  return {
    days: Math.max(0, days),
    inactive: tracked && days >= thresholdDays,
    tracked,
    lastActivity,
  };
}
