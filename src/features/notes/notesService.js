import { getAllNotes, searchNotes, createNote, deleteNote } from './notesStore';
import { createEvent } from '../calendar/calendarStore';
import { reportError } from '../../core/error/reportError';

export function useNotesService() {
  async function resolveInternalLinks(content) {
    if (!content) return content;
    const allNotes = await getAllNotes();
    const noteMap = {};
    for (const n of allNotes) {
      noteMap[n.title.toLowerCase()] = n;
      if (n.id) noteMap[n.id] = n;
    }
    let resolved = content;
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    resolved = resolved.replace(linkRegex, (match, ref) => {
      const key = ref.trim().toLowerCase();
      const found = noteMap[key];
      if (found) {
        return `<a href="#" data-note-id="${found.id}" class="note-link" style="color:var(--color-accent);text-decoration:underline;">${found.title}</a>`;
      }
      return `<span style="color:var(--color-danger);text-decoration:line-through;">${ref}</span>`;
    });
    return resolved;
  }

  async function createEventFromNote(noteId, noteTitle, dateStr) {
    try {
      const event = await createEvent({
        title: `Nota: ${noteTitle.slice(0, 50)}`,
        description: `Creado desde la nota: ${noteTitle}`,
        startDate: dateStr || new Date().toISOString(),
        endDate: dateStr || new Date().toISOString(),
        status: 'pending',
        priority: 'medium',
        relatedNoteId: noteId,
      });
      return event;
    } catch (error) {
      reportError(error, { operation: 'createEventFromNote', noteId });
      throw error;
    }
  }

  return { resolveInternalLinks, createEventFromNote };
}
