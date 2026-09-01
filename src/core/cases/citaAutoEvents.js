/**
 * citaAutoEvents.js
 * Sistema de Citas (Release 1.5.0).
 *
 * Sincronización automática del campo CITA de un caso con su evento de
 * calendario. La única fuente de verdad es el campo `cita`. Toda la lógica es
 * local y determinista; se ejecuta SOLO ante una creación o actualización
 * intencional del caso (nunca en inicializaciones, recargas o migraciones).
 *
 * Identificación lógica del evento automático: caso + tipo 'cita'. Esto evita
 * duplicados ante guardados repetidos, ediciones de campos no relacionados,
 * recargas, importaciones o restauraciones.
 */

import { getAllEvents, createEvent, updateEvent, deleteEvent, EVENT_TYPES } from '../../features/calendar/calendarStore';
import { parseCita, resolveCitaDate, formatCita } from '../../utils/citaParser';
import { recordCaseEvent, HISTORY_TYPES } from './caseHistory';

/**
 * Construye el contexto visible del caso para el evento (referencial, sin
 * duplicar el objeto completo del caso).
 * @param {object} caso
 * @returns {{ nombre:string, estado:string, aseguradora:string, estudioJuridico:string, localidad:string }}
 */
export function buildCaseContext(caso = {}) {
  return {
    nombre: caso.nombre || '',
    estado: caso.estado || '',
    aseguradora: caso.aseguradora || '',
    estudioJuridico: caso.estudioJuridico || '',
    estudio: caso.estudioJuridico || '',
    localidad: caso.localidad || '',
  };
}

/**
 * Busca el evento automático de cita existente para un caso.
 * La comparación es robusta: mismo caso y tipo 'cita'.
 * @param {string} caseId
 * @param {Array} [allEvents] cache opcional (evita releer múltiples veces).
 * @returns {Promise<object|undefined>}
 */
export async function findExistingCitaEvent(caseId, allEvents) {
  const events = allEvents || (await getAllEvents());
  return events.find(
    (e) =>
      e.eventType === EVENT_TYPES.CITA &&
      Array.isArray(e.relatedCaseIds) &&
      e.relatedCaseIds.includes(caseId)
  );
}

/**
 * Construye el payload del evento automático a partir del caso y la cita parseada.
 * @param {object} caso
 * @param {{ day:number, month:number, startTime:string, endTime:string }} parsed
 * @returns {{title:string, description:string, startDate:string, endDate:string, eventType:string, relatedCaseIds:string[], caseContext:object, status:string, priority:string}}
 */
export function buildCitaEventPayload(caso, parsed) {
  const isoDate = resolveCitaDate(parsed, caso.fecha);
  const ctx = buildCaseContext(caso);
  return {
    title: `Cita: ${ctx.nombre || 'Sin nombre'}`,
    description: `Cita agendada para ${formatCita(parsed)}`,
    startDate: `${isoDate}T${parsed.startTime}:00`,
    endDate: `${isoDate}T${parsed.endTime}:00`,
    eventType: EVENT_TYPES.CITA,
    relatedCaseIds: [caso.id],
    caseContext: ctx,
    status: 'pending',
    priority: 'high',
  };
}

/**
 * Sincroniza el evento automático de cita con el campo CITA del caso.
 *
 * Reglas:
 *  - Sin CITA válida: si existía un evento automático de cita, se elimina.
 *  - Con CITA válida y sin evento: se crea.
 *  - Con CITA válida y evento existente: se actualiza (nunca duplica).
 *
 * @param {object} caso
 * @param {object} [opts] { allEvents, notify } para controlar notificaciones y cache.
 * @returns {Promise<{action:'created'|'updated'|'deleted'|'unchanged'|'skip', eventId?:number}>}
 */
export async function syncCitaEvent(caso, opts = {}) {
  if (!caso || !caso.id) {
    return { action: 'skip' };
  }
  const config = opts.config || {};
  const parsed = parseCita(caso.cita);
  const existing = await findExistingCitaEvent(caso.id, opts.allEvents);

  // Sin cita válida → eliminar evento automático si existía.
  if (!parsed) {
    if (existing) {
      if (config.citasAutoCrear === false) return { action: 'skip' };
      await deleteAutoCitaEvent(caso.id, existing);
      return { action: 'deleted', eventId: existing.id };
    }
    return { action: 'unchanged' };
  }

  if (config.citasAutoCrear === false && !existing) {
    return { action: 'skip' };
  }

  const payload = buildCitaEventPayload(caso, parsed);
  if (!payload.startDate) {
    // Fecha no resoluble (día inexistente) → no crear evento corrupto.
    return { action: 'skip' };
  }

  if (existing) {
    if (config.citasAutoActualizar === false) return { action: 'unchanged', eventId: existing.id };
    // Comparar solo lo funcional para evitar updates innecesarios.
    const same =
      existing.startDate === payload.startDate &&
      existing.endDate === payload.endDate;
    if (same) return { action: 'unchanged', eventId: existing.id };
    const updated = await updateEvent(existing.id, payload);
    await recordAutoHistory(caso.id, HISTORY_TYPES.CITA_UPDATED, payload);
    return { action: 'updated', eventId: updated.id };
  }

  const created = await createEvent(payload);
  await recordAutoHistory(caso.id, HISTORY_TYPES.CITA_CREATED, payload);
  return { action: 'created', eventId: created.id };
}

/**
 * Elimina el evento automático de cita y registra el historial asociado.
 */
async function deleteAutoCitaEvent(caseId, event) {
  try {
    await deleteEvent(event.id);
  } catch {
    // Si el evento ya no existe, no es un error bloqueante.
  }
  await recordCaseEvent({
    caseId: String(caseId),
    type: HISTORY_TYPES.CITA_DELETED,
    title: 'Cita eliminada',
    description: 'Se eliminó la cita automática del caso.',
    metadata: { eventId: event.id },
    source: 'automatic',
  });
}

async function recordAutoHistory(caseId, type, payload) {
  const ctx = payload.caseContext || {};
  const section = fmtSection(payload.startDate, payload.endDate);
  const desc = {
    [HISTORY_TYPES.CITA_CREATED]: `Cita creada automáticamente para el ${section}.`,
    [HISTORY_TYPES.CITA_UPDATED]: `Cita actualizada: ${section}.`,
  }[type];
  await recordCaseEvent({
    caseId: String(caseId),
    type,
    title:
      type === HISTORY_TYPES.CITA_CREATED
        ? 'Cita creada automáticamente'
        : 'Cita actualizada',
    description: desc || '',
    metadata: {
      eventoInicio: payload.startDate,
      eventoFin: payload.endDate,
      nombre: ctx.nombre || '',
    },
    source: 'automatic',
  });
}

/** "15/09 - (14:00 a 15:30)" a partir de fechas ISO. */
function fmtSection(startIso, endIso) {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const dd = String(s.getDate()).padStart(2, '0');
    const mm = String(s.getMonth() + 1).padStart(2, '0');
    const sh = String(s.getHours()).padStart(2, '0');
    const sm = String(s.getMinutes()).padStart(2, '0');
    const eh = String(e.getHours()).padStart(2, '0');
    const em = String(e.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} - (${sh}:${sm} a ${eh}:${em})`;
  } catch {
    return '';
  }
}

/**
 * Crea un evento de reprogramación vinculado a un caso y, si existe, al evento
 * original de cita. El evento original se conserva (marcado como cancelado).
 *
 * @param {object} caso
 * @param {{ date:string, startTime:string, endTime:string }} nuevaCita
 * @param {object} [contexto] { reportId, originalEvent, allEvents, config }
 * @returns {Promise<object>}
 */
export async function createRescheduleEvent(caso, nuevaCita, contexto = {}) {
  if (contexto.config?.citasAutoReprogramar === false) {
    return null;
  }
  const isoDate = nuevoISODate(nuevaCita.date);
  const original = contexto.originalEvent || (await findExistingCitaEvent(caso.id, contexto.allEvents));
  const ctx = buildCaseContext(caso);

  // Conservar el evento original: marcarlo como cancelado (no destruir).
  if (original && original.eventType === EVENT_TYPES.CITA) {
    try {
      await updateEvent(original.id, { status: 'cancelled' });
    } catch {
      // no bloqueante
    }
  }

  const payload = {
    title: `Cita reprogramada: ${ctx.nombre || 'Sin nombre'}`,
    description: `Cita reprogramada para el ${nuevaCita.date} de ${nuevaCita.startTime} a ${nuevaCita.endTime}`,
    startDate: `${isoDate}T${nuevaCita.startTime}:00`,
    endDate: `${isoDate}T${nuevaCita.endTime}:00`,
    eventType: EVENT_TYPES.REPROGRAMACION,
    relatedCaseIds: [caso.id],
    relatedReportId: contexto.reportId || null,
    originalEventId: original ? original.id : null,
    caseContext: ctx,
    status: 'confirmed',
    priority: 'high',
  };

  const event = await createEvent(payload);
  await recordCaseEvent({
    caseId: String(caso.id),
    type: HISTORY_TYPES.RESCHEDULE_CREATED,
    title: 'Cita reprogramada',
    description: `Cita reprogramada para el ${nuevaCita.date} de ${nuevaCita.startTime} a ${nuevaCita.endTime}.`,
    metadata: {
      eventId: event.id,
      originalEventId: payload.originalEventId,
      reportId: payload.relatedReportId,
      nuevoInicio: payload.startDate,
      nuevoFin: payload.endDate,
    },
    source: 'automatic',
  });
  return event;
}

function nuevoISODate(dateStr) {
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) {
      const [y, m, dd] = String(dateStr).split('-').map(Number);
      if (y && m && dd) {
        return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      }
      return dateStr;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
}
