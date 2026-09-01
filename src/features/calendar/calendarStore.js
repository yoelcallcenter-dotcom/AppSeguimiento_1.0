import appDB from '../../core/db/appDB';
import { reportError } from '../../core/error/reportError';
import { touchVersion, assertNoConflict } from '../../core/db/versioning';
import { notifyChange, SYNC_EVENTS } from '../../core/sync/syncService';
import { recordEventLinkedForCases } from '../../core/cases/caseHistory';

/** Tipos de evento de calendario (Sistema de Citas, 1.5.0). */
export const EVENT_TYPES = {
  MANUAL: 'manual',
  CITA: 'cita',
  REPROGRAMACION: 'reprogramacion',
};

export async function createEvent(data) {
  try {
    const event = touchVersion({
      title: data.title || '',
      description: data.description || '',
      startDate: data.startDate,
      endDate: data.endDate || data.startDate,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      relatedNoteId: data.relatedNoteId || null,
      relatedCaseIds: data.relatedCaseIds || [],
      tags: data.tags || [],
      eventType: data.eventType || EVENT_TYPES.MANUAL,
      relatedReportId: data.relatedReportId || null,
      originalEventId: data.originalEventId || null,
      caseContext: data.caseContext || null,
      createdAt: new Date().toISOString(),
    });
    const id = await appDB.events.add(event);
    notifyChange(SYNC_EVENTS.EVENTS_UPDATED, { action: 'create', id });
    // Historial: el evento de calendario vinculado queda registrado por caso.
    if ((event.relatedCaseIds || []).length > 0) {
      recordEventLinkedForCases(event.relatedCaseIds, {
        eventId: id,
        title: event.title,
        startDate: event.startDate,
      });
    }
    return { ...event, id };
  } catch (error) {
    reportError(error, { operation: 'createEvent', data });
    throw error;
  }
}

export async function updateEvent(id, updates) {
  try {
    const existing = await appDB.events.get(id);
    if (!existing) throw new Error(`Event ${id} not found`);
    assertNoConflict(updates, existing);
    const merged = touchVersion({ ...existing, ...updates });
    await appDB.events.put(merged);
    notifyChange(SYNC_EVENTS.EVENTS_UPDATED, { action: 'update', id });
    return merged;
  } catch (error) {
    reportError(error, { operation: 'updateEvent', id, updates });
    throw error;
  }
}

export async function deleteEvent(id) {
  try {
    await appDB.events.delete(id);
    notifyChange(SYNC_EVENTS.EVENTS_UPDATED, { action: 'delete', id });
    return true;
  } catch (error) {
    reportError(error, { operation: 'deleteEvent', id });
    throw error;
  }
}

export async function getEvent(id) {
  try {
    return await appDB.events.get(id);
  } catch (error) {
    reportError(error, { operation: 'getEvent', id });
    return null;
  }
}

export async function getEventsByDateRange(start, end) {
  try {
    return await appDB.events
      .where('startDate')
      .between(start, end, true, true)
      .toArray();
  } catch (error) {
    reportError(error, { operation: 'getEventsByDateRange', start, end });
    return [];
  }
}

export async function getEventsByMonth(year, month) {
  try {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return await appDB.events
      .where('startDate')
      .between(start, end, true, true)
      .toArray();
  } catch (error) {
    reportError(error, { operation: 'getEventsByMonth', year, month });
    return [];
  }
}

export async function getAllEvents() {
  try {
    return await appDB.events.orderBy('startDate').toArray();
  } catch (error) {
    reportError(error, { operation: 'getAllEvents' });
    return [];
  }
}

export async function getEventsByNoteId(noteId) {
  try {
    return await appDB.events.where('relatedNoteId').equals(noteId).toArray();
  } catch (error) {
    reportError(error, { operation: 'getEventsByNoteId', noteId });
    return [];
  }
}
