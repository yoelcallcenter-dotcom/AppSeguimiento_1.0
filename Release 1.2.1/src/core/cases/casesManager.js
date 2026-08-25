/**
 * casesManager.js
 * Gestor de casos con historial estandarizado
 * Responsabilidad: CRUD de casos y seguimiento de historial
 */

import { storageManager } from "../storage/storageManager";

const CASES_KEY = "casos-art-tracker";

// Tipos de eventos de historial
export const HISTORY_TYPES = {
  CREATED: "CREATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  NOTE_LINKED: "NOTE_LINKED",
  NOTE_UNLINKED: "NOTE_UNLINKED",
  UPDATED: "UPDATED",
};

class CasesManager {
  constructor() {
    this.cases = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    const saved = await storageManager.get(CASES_KEY, []);
    this.cases = Array.isArray(saved) ? saved : [];
    this.initialized = true;
  }

  async save() {
    await storageManager.set(CASES_KEY, this.cases);
  }

  // ============ CRUD ============

  getCases(filters = {}) {
    let result = [...this.cases];

    if (filters.estado && filters.estado !== "todos") {
      result = result.filter((c) => c.estado === filters.estado);
    }

    if (filters.busqueda) {
      const q = filters.busqueda.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.nombre || "").toLowerCase().includes(q) ||
          (c.telefono || "").toLowerCase().includes(q) ||
          (c.localidad || "").toLowerCase().includes(q)
      );
    }

    return result;
  }

  getCase(id) {
    return this.cases.find((c) => c.id === id) || null;
  }

  async createCase(data) {
    const newCase = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      ...data,
      history: [
        {
          type: HISTORY_TYPES.CREATED,
          date: new Date().toISOString(),
          message: "Caso creado",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.cases = [newCase, ...this.cases];
    await this.save();
    return newCase;
  }

  async updateCase(id, updates) {
    const index = this.cases.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const oldState = this.cases[index];
    const newState = {
      ...oldState,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const historyEntry = {
      type: HISTORY_TYPES.UPDATED,
      date: new Date().toISOString(),
    };

    if (updates.estado && updates.estado !== oldState.estado) {
      historyEntry.type = HISTORY_TYPES.STATUS_CHANGED;
      historyEntry.message = `Estado cambiado: ${oldState.estado} → ${updates.estado}`;
      historyEntry.from = oldState.estado;
      historyEntry.to = updates.estado;
    } else if (
      updates.observaciones &&
      updates.observaciones !== oldState.observaciones
    ) {
      historyEntry.message = "Observaciones actualizadas";
    } else {
      historyEntry.message = "Caso actualizado";
    }

    newState.history = [...(oldState.history || []), historyEntry];
    this.cases[index] = newState;

    await this.save();
    return newState;
  }

  async deleteCase(id) {
    const index = this.cases.findIndex((c) => c.id === id);
    if (index === -1) return false;

    this.cases.splice(index, 1);
    await this.save();
    return true;
  }

  async changeStatus(id, newStatus) {
    const caseData = this.getCase(id);
    if (!caseData) return null;

    return await this.updateCase(id, { estado: newStatus });
  }

  // ============ EVENTOS DE NOTAS ============

  async addNoteEvent(caseId, noteId, action) {
    const caseData = this.getCase(caseId);
    if (!caseData) return null;

    const historyEntry = {
      type:
        action === "link"
          ? HISTORY_TYPES.NOTE_LINKED
          : HISTORY_TYPES.NOTE_UNLINKED,
      date: new Date().toISOString(),
      noteId: noteId,
      message:
        action === "link"
          ? "Nota vinculada al caso"
          : "Nota desvinculada del caso",
    };

    caseData.history = [...(caseData.history || []), historyEntry];
    caseData.updatedAt = new Date().toISOString();

    await this.save();
    return caseData;
  }

  // ============ ESTADÍSTICAS ============

  getStats() {
    const total = this.cases.length;
    const byStatus = {};

    this.cases.forEach((c) => {
      const status = c.estado || "Sin estado";
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return {
      total,
      byStatus,
    };
  }

  getHistory(id) {
    const caseData = this.getCase(id);
    return caseData?.history || [];
  }

  // ============ UTILIDADES ============

  count() {
    return this.cases.length;
  }

  getRecent(limit = 5) {
    return [...this.cases].slice(0, limit);
  }

  getByStatus(status) {
    return this.cases.filter((c) => c.estado === status);
  }
}

export const casesManager = new CasesManager();
