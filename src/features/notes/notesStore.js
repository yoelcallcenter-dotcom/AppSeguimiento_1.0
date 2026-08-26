import appDB from '../../core/db/appDB';
import { reportError } from '../../core/error/reportError';
import { touchVersion, assertNoConflict } from '../../core/db/versioning';
import { notifyChange, SYNC_EVENTS } from '../../core/sync/syncService';
import { recordNotesAddedForCases } from '../../core/cases/caseHistory';

export async function createNote({ title, content, tags, relatedCaseIds }) {
  try {
    const note = touchVersion({
      title: title || 'Sin titulo',
      content: content || '',
      tags: tags || [],
      relatedCaseIds: relatedCaseIds || [],
      createdAt: new Date().toISOString(),
    });
    const id = await appDB.notes.add(note);
    await saveVersion(id, note);
    notifyChange(SYNC_EVENTS.NOTES_UPDATED, { action: 'create', id });
    // Historial: la nota sigue siendo la fuente de verdad; el evento la referencia.
    if ((note.relatedCaseIds || []).length > 0) {
      recordNotesAddedForCases(note.relatedCaseIds, { noteId: id, title: note.title });
    }
    return { ...note, id };
  } catch (error) {
    reportError(error, { operation: 'createNote' });
    throw error;
  }
}

export async function updateNote(id, updates) {
  try {
    const existing = await appDB.notes.get(id);
    if (!existing) throw new Error(`Note ${id} not found`);
    assertNoConflict(updates, existing);
    const merged = touchVersion({ ...existing, ...updates });
    await appDB.notes.put(merged);
    await saveVersion(id, merged);
    notifyChange(SYNC_EVENTS.NOTES_UPDATED, { action: 'update', id });
    return merged;
  } catch (error) {
    reportError(error, { operation: 'updateNote', id });
    throw error;
  }
}

export async function deleteNote(id) {
  try {
    await appDB.notes.delete(id);
    notifyChange(SYNC_EVENTS.NOTES_UPDATED, { action: 'delete', id });
    return true;
  } catch (error) {
    reportError(error, { operation: 'deleteNote', id });
    throw error;
  }
}

export async function getNote(id) {
  try {
    return await appDB.notes.get(id);
  } catch (error) {
    reportError(error, { operation: 'getNote', id });
    return null;
  }
}

export async function getAllNotes() {
  try {
    return await appDB.notes.orderBy('updatedAt').reverse().toArray();
  } catch (error) {
    reportError(error, { operation: 'getAllNotes' });
    return [];
  }
}

export async function searchNotes(query) {
  try {
    const q = query.toLowerCase().trim();
    if (!q) return await getAllNotes();
    const all = await appDB.notes.toArray();
    return all.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
  } catch (error) {
    reportError(error, { operation: 'searchNotes', query });
    return [];
  }
}

export async function saveVersion(noteId, noteData) {
  try {
    await appDB.note_versions.add({
      noteId,
      title: noteData.title,
      content: noteData.content,
      createdAt: new Date().toISOString(),
    });
    const count = await appDB.note_versions.where('noteId').equals(noteId).count();
    if (count > 50) {
      const oldest = await appDB.note_versions
        .where('noteId').equals(noteId)
        .orderBy('createdAt')
        .limit(count - 50)
        .toArray();
      if (oldest.length > 0) {
        await appDB.note_versions.bulkDelete(oldest.map(v => v.id));
      }
    }
  } catch (error) {
    reportError(error, { operation: 'saveVersion', noteId });
  }
}

export async function getVersions(noteId) {
  try {
    return await appDB.note_versions
      .where('noteId').equals(noteId)
      .reverse()
      .toArray();
  } catch (error) {
    reportError(error, { operation: 'getVersions', noteId });
    return [];
  }
}

export async function restoreVersion(versionId) {
  try {
    const version = await appDB.note_versions.get(versionId);
    if (!version) throw new Error(`Version ${versionId} not found`);
    const updated = await updateNote(version.noteId, {
      title: version.title,
      content: version.content,
    });
    return updated;
  } catch (error) {
    reportError(error, { operation: 'restoreVersion', versionId });
    throw error;
  }
}
