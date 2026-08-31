/**
 * activityFeed.js
 * Actividad unificada centralizada (Release 1.4.0).
 *
 * Construye un feed de actividad a partir de las fuentes de datos existentes:
 *   - Historial de casos (case_history en IndexedDB)
 *   - Notas (relatedCaseIds)
 *   - Eventos de calendario (relatedCaseIds)
 *   - Datos de casos (creación, firma, reportes)
 *
 * No crea nuevas entidades persistentes. Consulta datos existentes.
 */

import { HISTORY_TYPES } from './caseHistory';

/**
 * Convierte un evento de case_history a un item de actividad.
 */
function historyEventToActivityItem(ev, caseName) {
  if (!ev || !ev.type) return null;

  const base = {
    id: `history-${ev.id || ev.timestamp}-${ev.type}`,
    type: ev.type,
    entityType: ev.metadata?.noteId ? 'note' : ev.metadata?.eventId ? 'event' : 'case',
    entityId: ev.metadata?.noteId || ev.metadata?.eventId || ev.caseId,
    caseId: ev.caseId,
    timestamp: ev.timestamp,
    navigable: true,
  };

  switch (ev.type) {
    case HISTORY_TYPES.CASE_CREATED:
      return { ...base, title: caseName, detail: 'Caso creado', color: '#34D399' };
    case HISTORY_TYPES.STATUS_CHANGED:
      return {
        ...base,
        title: caseName,
        detail: `Estado: ${ev.metadata?.previousValue || '—'} → ${ev.metadata?.newValue || '—'}`,
        color: '#60A5FA',
      };
    case HISTORY_TYPES.CASE_UPDATED:
      return { ...base, title: caseName, detail: ev.description || 'Caso actualizado', color: '#60A5FA' };
    case HISTORY_TYPES.ESTUDIO_CHANGED:
      return {
        ...base,
        title: caseName,
        detail: `Estudio: ${ev.metadata?.newValue || '—'}`,
        color: '#8B5CF6',
      };
    case HISTORY_TYPES.ASEGURADORA_CHANGED:
      return {
        ...base,
        title: caseName,
        detail: `Aseguradora: ${ev.metadata?.newValue || '—'}`,
        color: '#8B5CF6',
      };
    case HISTORY_TYPES.FIRMA_REGISTERED:
      return { ...base, title: caseName, detail: 'Firma registrada', color: '#10B981' };
    case HISTORY_TYPES.NOTE_ADDED:
      return {
        ...base,
        title: ev.description || 'Nota',
        detail: `Nota agregada a ${caseName}`,
        color: '#D9A441',
        entityType: 'note',
        entityId: ev.metadata?.noteId || ev.caseId,
      };
    case HISTORY_TYPES.EVENT_LINKED:
      return {
        ...base,
        title: ev.description || 'Evento',
        detail: `Evento para ${caseName}`,
        color: '#F97316',
        entityType: 'event',
        entityId: ev.metadata?.eventId || ev.caseId,
      };
    case HISTORY_TYPES.REPORT_ADDED:
      return { ...base, title: caseName, detail: ev.description || 'Reporte agregado', color: '#60A5FA' };
    case HISTORY_TYPES.MANUAL_INTERACTION:
      return {
        ...base,
        title: caseName,
        detail: ev.description || ev.metadata?.interactionType || 'Interacción',
        color: '#D9A441',
      };
    default:
      return { ...base, title: caseName, detail: ev.description || 'Actividad', color: '#6B7280' };
  }
}

/**
 * Construye el feed de actividad unificado y ordenado.
 * @param {object} params
 * @param {Array} params.cases
 * @param {Array} params.notes
 * @param {Array} params.events
 * @param {Array} params.caseHistory - eventos de case_history (opcional, enriquece el feed)
 * @param {number} params.limit
 * @returns {Array} items de actividad ordenados por timestamp descendente
 */
export function buildUnifiedActivityFeed({ cases = [], notes = [], events = [], caseHistory = [], limit = 20 }) {
  const items = [];
  const casesById = new Map(cases.map((c) => [String(c.id), c]));

  // 1. Eventos del historial de casos (fuente principal de actividad real)
  for (const ev of caseHistory) {
    const caso = casesById.get(String(ev.caseId));
    const caseName = caso?.nombre || 'Caso';
    const item = historyEventToActivityItem(ev, caseName);
    if (item) items.push(item);
  }

  // 2. Casos creados sin historial (fallback para casos pre-1.3.1)
  for (const c of cases) {
    const hasHistoryEvent = caseHistory.some(
      (ev) => String(ev.caseId) === String(c.id) && ev.type === HISTORY_TYPES.CASE_CREATED
    );
    if (!hasHistoryEvent) {
      items.push({
        id: `case-created-${c.id}`,
        type: 'case_created',
        entityType: 'case',
        entityId: c.id,
        caseId: c.id,
        title: c.nombre || 'Caso',
        detail: 'Caso creado',
        timestamp: c.createdAt || c.fecha,
        color: '#34D399',
        navigable: true,
      });
    }
  }

  // 3. Notas recientes (como fuente complementaria)
  for (const n of notes) {
    const caseIds = n.relatedCaseIds || [];
    const primaryCaseId = caseIds[0] || null;
    const caso = primaryCaseId ? casesById.get(String(primaryCaseId)) : null;
    items.push({
      id: `note-${n.id}`,
      type: 'note_added',
      entityType: 'note',
      entityId: n.id,
      caseId: primaryCaseId,
      title: n.title || 'Nota',
      detail: caso ? `Nota para ${caso.nombre}` : 'Nota creada',
      timestamp: n.updatedAt || n.createdAt,
      color: '#D9A441',
      navigable: true,
    });
  }

  // 4. Eventos de calendario recientes (como fuente complementaria)
  for (const e of events) {
    const caseIds = e.relatedCaseIds || [];
    const primaryCaseId = caseIds[0] || null;
    const caso = primaryCaseId ? casesById.get(String(primaryCaseId)) : null;
    items.push({
      id: `event-${e.id}`,
      type: 'event_linked',
      entityType: 'event',
      entityId: e.id,
      caseId: primaryCaseId,
      title: e.title || 'Evento',
      detail: caso ? `Evento para ${caso.nombre}` : (e.startDate || 'Evento agendado'),
      timestamp: e.createdAt || e.updatedAt || e.startDate,
      color: '#F97316',
      navigable: true,
    });
  }

  // Deduplicar por tipo+entityId (el historial tiene prioridad sobre notas/eventos)
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const key = `${item.type}-${item.entityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  // Ordenar por timestamp descendente y limitar
  return deduped
    .filter((i) => i.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

/**
 * Construye el feed de actividad para un caso específico.
 * @param {string|number} caseId
 * @param {object} params
 * @returns {Array} items de actividad del caso
 */
export function getActivityForCase(caseId, { notes = [], events = [], caseHistory = [] }) {
  if (!caseId) return [];
  const id = String(caseId);

  const items = [];

  // Eventos del historial para este caso
  for (const ev of caseHistory) {
    if (String(ev.caseId) !== id) continue;
    const item = historyEventToActivityItem(ev, '');
    if (item) items.push(item);
  }

  // Notas vinculadas
  for (const n of notes) {
    if (!(n.relatedCaseIds || []).some((cid) => String(cid) === id)) continue;
    items.push({
      id: `note-${n.id}`,
      type: 'note_added',
      entityType: 'note',
      entityId: n.id,
      caseId: id,
      title: n.title || 'Nota',
      detail: 'Nota vinculada',
      timestamp: n.updatedAt || n.createdAt,
      color: '#D9A441',
      navigable: true,
    });
  }

  // Eventos vinculados
  for (const e of events) {
    if (!(e.relatedCaseIds || []).some((cid) => String(cid) === id)) continue;
    items.push({
      id: `event-${e.id}`,
      type: 'event_linked',
      entityType: 'event',
      entityId: e.id,
      caseId: id,
      title: e.title || 'Evento',
      detail: e.startDate || 'Evento agendado',
      timestamp: e.createdAt || e.updatedAt || e.startDate,
      color: '#F97316',
      navigable: true,
    });
  }

  // Deduplicar
  const seen = new Set();
  return items
    .filter((i) => {
      const key = `${i.type}-${i.entityId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((i) => i.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Construye actividad reciente para un día específico (para MiJornada).
 * @param {string} dateISO - fecha en formato YYYY-MM-DD
 * @param {object} params
 * @returns {Array} items del día
 */
export function getRecentActivityForDay(dateISO, params = {}) {
  if (!dateISO) return [];
  const all = buildUnifiedActivityFeed({ ...params, limit: 50 });
  return all.filter((item) => {
    if (!item.timestamp) return false;
    return item.timestamp.slice(0, 10) === dateISO;
  }).slice(0, 8);
}
