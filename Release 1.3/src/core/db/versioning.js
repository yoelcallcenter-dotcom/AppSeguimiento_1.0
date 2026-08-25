/**
 * versioning.js
 * Versionado por registro para control de conflictos (optimistic concurrency).
 *
 * Cada entidad persistida puede llevar:
 *   { id, updatedAt, version }
 *
 * Regla de escritura: si el dato entrante tiene versión menor que el existente,
 * se lanza un error de conflicto (assertNoConflict).
 */

export function nowISO() {
  return new Date().toISOString();
}

/**
 * Asegura que una entidad tenga `version` y `updatedAt` (sin incrementar).
 * Útil para datos migrados o provenientes de importaciones.
 * @param {object} entity
 * @param {{now: () => string}} [opts]
 * @returns {object}
 */
export function ensureVersion(entity, { now = nowISO } = {}) {
  if (!entity || typeof entity !== "object") return entity;
  const updatedAt = entity.updatedAt || now();
  const version = typeof entity.version === "number" ? entity.version : 1;
  return { ...entity, updatedAt, version };
}

/**
 * Incrementa la versión y actualiza `updatedAt`.
 * @param {object} entity
 * @param {{now: () => string}} [opts]
 * @returns {object}
 */
export function touchVersion(entity, { now = nowISO } = {}) {
  if (!entity || typeof entity !== "object") return entity;
  const version = (Number(entity.version) || 0) + 1;
  return { ...entity, updatedAt: now(), version };
}

/**
 * Lanza un Error si `incoming` es más antiguo que `existing`.
 * Si alguna de las dos entidades no tiene versión, no hay conflicto posible
 * (se preserva el comportamiento previo de last-write-wins).
 * @param {object} incoming entidad entrante.
 * @param {object} existing entidad persistida.
 */
export function assertNoConflict(incoming, existing) {
  if (!incoming || !existing) return;
  const inV = Number(incoming.version) || 0;
  const exV = Number(existing.version) || 0;
  if (exV > 0 && inV > 0 && inV < exV) {
    throw new Error(
      "Conflicto de versión: el dato entrante es más antiguo que el actual"
    );
  }
}

/**
 * Devuelve la entidad más reciente entre dos (por version y luego updatedAt).
 * @param {object} a
 * @param {object} b
 * @returns {object|null}
 */
export function latestOf(a, b) {
  if (!a) return b;
  if (!b) return a;
  const aV = Number(a.version) || 0;
  const bV = Number(b.version) || 0;
  if (aV !== bV) return aV > bV ? a : b;
  const aT = new Date(a.updatedAt || 0).getTime();
  const bT = new Date(b.updatedAt || 0).getTime();
  return aT >= bT ? a : b;
}
