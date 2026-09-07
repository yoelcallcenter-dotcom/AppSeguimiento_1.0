import appDB from '../../core/db/appDB';
import { escapeCSV, sanitizeCSV } from './csvUtils';

export const NOTES_CSV_HEADERS = [
  'ID',
  'Titulo',
  'Contenido',
  'Tags',
  'Casos Vinculados',
  'Fecha Creacion',
  'Fecha Modificacion',
];

export async function exportNotesToCSV(notes = null) {
  const allNotes = notes || await appDB.notes.toArray();

  if (!allNotes || allNotes.length === 0) {
    throw new Error('No hay notas para exportar');
  }

  const rows = allNotes.map((n) => [
    n.id || '',
    n.title || n.titulo || '',
    n.content || n.contenido || '',
    (n.tags || []).join('; '),
    (n.relatedCaseIds || []).join('; '),
    n.createdAt || '',
    n.updatedAt || '',
  ].map((v) => escapeCSV(sanitizeCSV(String(v || '')))));

  return [NOTES_CSV_HEADERS.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
