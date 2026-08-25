import appDB from '../../core/db/appDB';

export async function exportNotesCalendarToJSON() {
  const notes = await appDB.notes.toArray();
  const events = await appDB.events.toArray();
  const data = {
    exportDate: new Date().toISOString(),
    notesCount: notes.length,
    eventsCount: events.length,
    notes,
    events,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Importa notas y eventos desde un JSON exportado.
 * @param {string} jsonStr contenido del archivo.
 * @param {object} [options]
 * @param {boolean} [options.incluirNotas=true] importar notas.
 * @param {boolean} [options.incluirEventos=true] importar eventos.
 * @param {string} [options.duplicados="actualizar"] "actualizar" | "omitir" | "duplicar".
 */
export async function importNotesCalendarFromJSON(jsonStr, options = {}) {
  try {
    const opts = {
      incluirNotas: options.incluirNotas !== false,
      incluirEventos: options.incluirEventos !== false,
      duplicados: ['actualizar', 'omitir', 'duplicar'].includes(options.duplicados)
        ? options.duplicados
        : 'actualizar',
    };
    const data = JSON.parse(jsonStr);
    if ((!opts.incluirNotas || !data.notes) && (!opts.incluirEventos || !data.events)) {
      return { success: false, error: 'Formato inválido: se requieren notes y events' };
    }

    // Merge notes
    let importedNotes = 0;
    if (opts.incluirNotas && Array.isArray(data.notes)) {
      for (const note of data.notes) {
        const existing = note.id ? await appDB.notes.get(note.id) : undefined;
        if (existing) {
          if (opts.duplicados === 'actualizar') {
            await appDB.notes.update(note.id, note);
            importedNotes++;
          } else if (opts.duplicados === 'duplicar') {
            const { id, ...rest } = note;
            await appDB.notes.add(rest);
            importedNotes++;
          }
          // "omitir": no hacer nada
        } else {
          await appDB.notes.add(note);
          importedNotes++;
        }
      }
    }

    // Merge events
    let importedEvents = 0;
    if (opts.incluirEventos && Array.isArray(data.events)) {
      for (const event of data.events) {
        const existing = event.id ? await appDB.events.get(event.id) : undefined;
        if (existing) {
          if (opts.duplicados === 'actualizar') {
            await appDB.events.update(event.id, event);
            importedEvents++;
          } else if (opts.duplicados === 'duplicar') {
            const { id, ...rest } = event;
            await appDB.events.add(rest);
            importedEvents++;
          }
        } else {
          await appDB.events.add(event);
          importedEvents++;
        }
      }
    }

    return {
      success: true,
      notesCount: importedNotes,
      eventsCount: importedEvents,
    };
  } catch (err) {
    return { success: false, error: err.message || 'Error al importar' };
  }
}
