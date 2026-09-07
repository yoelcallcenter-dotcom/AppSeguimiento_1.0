import appDB from '../../core/db/appDB';
import { escapeCSV, sanitizeCSV } from './csvUtils';

export const EVENTS_CSV_HEADERS = [
  'ID',
  'Titulo',
  'Fecha Inicio',
  'Fecha Fin',
  'Estado',
  'Prioridad',
  'Descripcion',
  'Casos Vinculados',
  'Nota Vinculada',
  'Fecha Creacion',
];

export async function exportEventsToCSV(events = null) {
  const allEvents = events || await appDB.events.toArray();

  if (!allEvents || allEvents.length === 0) {
    throw new Error('No hay eventos para exportar');
  }

  const rows = allEvents.map((e) => [
    e.id || '',
    e.title || e.titulo || '',
    e.startDate || e.fecha || '',
    e.endDate || '',
    e.status || '',
    e.priority || '',
    e.description || '',
    (e.relatedCaseIds || []).join('; '),
    e.relatedNoteId || '',
    e.createdAt || '',
  ].map((v) => escapeCSV(sanitizeCSV(String(v || '')))));

  return [EVENTS_CSV_HEADERS.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
