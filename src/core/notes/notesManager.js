/**
 * notesManager.js
 * Gestor de notas avanzado con relación a casos
 * Responsabilidad: CRUD de notas y vinculación con casos
 */

import { storageManager } from "../storage/storageManager";

const NOTES_KEY = "bloc-notas-multi";

class NotesManager {
  constructor() {
    this.notes = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    const saved = await storageManager.get(NOTES_KEY, []);
    this.notes = Array.isArray(saved) ? saved : [];
    this.initialized = true;
  }

  async save() {
    await storageManager.set(NOTES_KEY, this.notes);
  }

  // ============ CRUD ============

  getNotes() {
    return [...this.notes];
  }

  getNote(id) {
    return this.notes.find((n) => n.id === id) || null;
  }

  async createNote({ title = "", content = "", caseIds = [] } = {}) {
    const note = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      title: title || `Nota ${this.notes.length + 1}`,
      content: content || "",
      caseIds: Array.isArray(caseIds) ? caseIds : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.notes = [note, ...this.notes];
    await this.save();
    return note;
  }

  async updateNote(id, updates) {
    const index = this.notes.findIndex((n) => n.id === id);
    if (index === -1) return null;

    this.notes[index] = {
      ...this.notes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.save();
    return this.notes[index];
  }

  async deleteNote(id) {
    const index = this.notes.findIndex((n) => n.id === id);
    if (index === -1) return false;

    this.notes.splice(index, 1);
    await this.save();
    return true;
  }

  // ============ RELACIÓN CON CASOS ============

  async linkNoteToCase(noteId, caseId) {
    const note = this.getNote(noteId);
    if (!note) return null;

    if (!note.caseIds.includes(caseId)) {
      note.caseIds.push(caseId);
      note.updatedAt = new Date().toISOString();
      await this.save();
    }

    return note;
  }

  async unlinkNoteFromCase(noteId, caseId) {
    const note = this.getNote(noteId);
    if (!note) return null;

    note.caseIds = note.caseIds.filter((id) => id !== caseId);
    note.updatedAt = new Date().toISOString();
    await this.save();

    return note;
  }

  async getNotesByCase(caseId) {
    return this.notes.filter((n) => n.caseIds.includes(caseId));
  }

  async getCasesByNote(noteId) {
    const note = this.getNote(noteId);
    if (!note) return [];
    return note.caseIds || [];
  }

  // ============ BÚSQUEDA ============

  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.getNotes();

    return this.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }

  // ============ UTILIDADES ============

  count() {
    return this.notes.length;
  }

  getRecent(limit = 5) {
    return [...this.notes].slice(0, limit);
  }
}

export const notesManager = new NotesManager();
