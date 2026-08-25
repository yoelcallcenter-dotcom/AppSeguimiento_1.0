/**
 * caseRepository.js
 * Capa de acceso única a los casos (Single Source of Truth).
 *
 * Todas las escrituras son:
 *  - Atómicas (clear + bulkPut dentro de una transacción Dexie).
 *  - Versionadas (version/updatedAt).
 *  - Notificadas a otras pestañas (BroadcastChannel vía syncService).
 *
 * Responsabilidad: centralizar el CRUD de casos para evitar fuentes de datos
 * duplicadas (localStorage legacy vs IndexedDB).
 */

import casesDB from "../db/casesDB";
import { ensureVersion, touchVersion, assertNoConflict, latestOf } from "../db/versioning";
import { notifyChange, SYNC_EVENTS } from "../sync/syncService";

/** Genera un id de caso (mismo formato que los utilizados por la UI). */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Hash del contenido de un caso (ignora version/updatedAt para comparar cambios reales). */
function contentHash(c) {
  if (!c || typeof c !== "object") return String(c);
  const { id, version, updatedAt, createdAt, ...rest } = c;
  return JSON.stringify(rest);
}

/**
 * Clave natural para detección de duplicados (mismo criterio que el
 * importador de CSV): nombre + teléfono normalizados.
 * @param {object} c caso.
 * @returns {string|null}
 */
export function naturalKey(c) {
  const n = (c.nombre || "").trim().toLowerCase();
  const t = (c.telefono || "").trim().toLowerCase();
  return n || t ? `${n}|||${t}` : null;
}

export const caseRepository = {
  /**
   * Devuelve todos los casos (mismo orden que casesDB.cases.toArray()).
   * @returns {Promise<Array>}
   */
  async getAll() {
    return await casesDB.cases.toArray();
  },

  /**
   * Devuelve un caso por id.
   * @param {string|number} id
   * @returns {Promise<object|null>}
   */
  async getById(id) {
    return (await casesDB.cases.get(id)) || null;
  },

  /**
   * Crea un caso (con id generado si falta) y lo persiste.
   * @param {object} data
   * @returns {Promise<object>} caso creado con id y versión.
   */
  async create(data) {
    const nuevo = touchVersion({
      ...data,
      id: data.id || generateId(),
      createdAt: data.createdAt || new Date().toISOString(),
    });
    await casesDB.cases.put(nuevo);
    notifyChange(SYNC_EVENTS.CASES_UPDATED, { action: "create", id: nuevo.id });
    return nuevo;
  },

  /**
   * Actualiza un caso con control de conflicto de versión.
   * @param {string|number} id
   * @param {object} updates
   * @returns {Promise<object|null>} caso actualizado o null si no existe.
   */
  async update(id, updates) {
    const existing = await casesDB.cases.get(id);
    if (!existing) return null;
    assertNoConflict(updates, existing);
    const updated = touchVersion({ ...existing, ...updates, id });
    await casesDB.cases.put(updated);
    notifyChange(SYNC_EVENTS.CASES_UPDATED, { action: "update", id });
    return updated;
  },

  /**
   * Elimina un caso.
   * @param {string|number} id
   * @returns {Promise<boolean>}
   */
  async remove(id) {
    await casesDB.cases.delete(id);
    notifyChange(SYNC_EVENTS.CASES_UPDATED, { action: "delete", id });
    return true;
  },

  /**
   * Reemplazo total atómico con control de concurrencia: clear + bulkPut dentro
   * de una transacción. Si algo falla a mitad, Dexie revierte la transacción
   * (sin pérdida de datos).
   *
   * Para cada caso entrante:
   *  - Si su contenido no cambió respecto del persistido, se conserva tal cual.
   *  - Si cambió, se incrementa su versión (updatedAt nuevo).
   *  - Nunca se sobrescribe un registro más nuevo con una copia obsoleta
   *    (protege el trabajo de otras pestañas / escrituras directas).
   * @param {Array} casos lista completa de casos.
   * @returns {Promise<Array>} casos persistidos.
   */
  async bulkReplace(casos = []) {
    let normalizados = [];
    await casesDB.transaction("rw", casesDB.cases, async () => {
      const existing = await casesDB.cases.toArray();
      const existingById = new Map(existing.map((c) => [c.id, c]));
      const now = new Date().toISOString();
      normalizados = casos.map((c) => {
        let entity = ensureVersion(c);
        const prev = existingById.get(entity.id);
        if (!entity.createdAt) {
          entity = { ...entity, createdAt: prev?.createdAt || now };
        }
        if (prev) {
          const inV = Number(entity.version) || 0;
          const exV = Number(prev.version) || 0;
          const changed = contentHash(entity) !== contentHash(prev);
          if (exV > inV && !changed) {
            // Copia obsoleta sin cambios: la DB tiene algo más nuevo.
            return prev;
          }
          if (changed) {
            entity = touchVersion(entity, { now: () => now });
            if (latestOf(prev, entity) === prev) {
              // Otra escritura (p. ej. otra pestaña) ya registró un cambio
              // posterior: no pisar ese trabajo.
              return prev;
            }
          }
        }
        return entity;
      });
      await casesDB.cases.clear();
      if (normalizados.length > 0) {
        await casesDB.cases.bulkPut(normalizados);
      }
    });
    notifyChange(SYNC_EVENTS.CASES_UPDATED, {
      action: "replace",
      count: normalizados.length,
    });
    return normalizados;
  },

  /**
   * Adición no destructiva y atómica. Los casos con id ya existente se omiten
   * (mismo comportamiento previo de appendCases). Los nuevos se versionan.
   * @param {Array} casos casos a agregar.
   * @returns {Promise<{added: number, skipped: number, merged: Array}>}
   */
  async bulkAppend(casos = []) {
    const toAdd = casos.map((c) => ensureVersion(c));
    let added = 0;
    let skipped = 0;
    let merged = [];

    await casesDB.transaction("rw", casesDB.cases, async () => {
      const existing = await casesDB.cases.toArray();
      const existingIds = new Set(existing.map((c) => c.id).filter(Boolean));
      // Dedupe por clave natural (nombre + teléfono), como el importador de CSV.
      const existingKeys = new Set();
      existing.forEach((c) => {
        const k = naturalKey(c);
        if (k) existingKeys.add(k);
      });

      const seen = new Set();
      const fresh = [];
      for (const c of toAdd) {
        if (c.id && existingIds.has(c.id)) { skipped += 1; continue; }
        const k = naturalKey(c);
        if (k && (existingKeys.has(k) || seen.has(k))) { skipped += 1; continue; }
        if (k) seen.add(k);
        if (c.id) existingIds.add(c.id);
        fresh.push(c);
      }
      added = fresh.length;
      merged = [...existing, ...fresh];
      if (fresh.length > 0) {
        await casesDB.cases.bulkPut(fresh);
      }
    });

    notifyChange(SYNC_EVENTS.CASES_UPDATED, { action: "append", added, skipped });
    return { added, skipped, merged };
  },
};
