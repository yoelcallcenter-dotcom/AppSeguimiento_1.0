/**
 * caseRelations.js
 * Resolución centralizada de relaciones entre entidades del sistema.
 *
 * Evita repetir la misma lógica de filtrado en múltiples componentes.
 * Consulta directamente los datos existentes (no crea nuevas fuentes de verdad).
 *
 * Relaciones soportadas:
 *   Caso → Notas (relatedCaseIds en notas)
 *   Caso → Eventos (relatedCaseIds en eventos)
 *   Caso → Aseguradora (string match sobre casos)
 *   Caso → Estudio Jurídico (string match sobre casos)
 */

/**
 * Devuelve las notas vinculadas a un caso.
 * @param {string|number} caseId
 * @param {Array} notes - array de notas del store
 * @returns {Array} notas filtradas
 */
export function getRelatedNotes(caseId, notes) {
  if (!caseId || !Array.isArray(notes)) return [];
  const id = String(caseId);
  return notes.filter((n) =>
    (n.relatedCaseIds || []).some((cid) => String(cid) === id)
  );
}

/**
 * Devuelve los eventos vinculados a un caso.
 * @param {string|number} caseId
 * @param {Array} events - array de eventos del store
 * @returns {Array} eventos filtrados, ordenados por startDate descendente
 */
export function getRelatedEvents(caseId, events) {
  if (!caseId || !Array.isArray(events)) return [];
  const id = String(caseId);
  return events
    .filter((e) =>
      (e.relatedCaseIds || []).some((cid) => String(cid) === id)
    )
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}

/**
 * Devuelve los casos que tienen una aseguradora específica (match por string).
 * @param {string} insurerName - nombre de la aseguradora
 * @param {Array} cases - array de casos
 * @returns {Array} casos filtrados
 */
export function getCasesByInsurer(insurerName, cases) {
  if (!insurerName || !Array.isArray(cases)) return [];
  const normalized = insurerName.trim().toLowerCase();
  if (!normalized) return [];
  return cases.filter(
    (c) => (c.aseguradora || "").trim().toLowerCase() === normalized
  );
}

/**
 * Devuelve los casos que tienen un estudio jurídico específico (match por string).
 * @param {string} lawFirmName - nombre del estudio jurídico
 * @param {Array} cases - array de casos
 * @returns {Array} casos filtrados
 */
export function getCasesByLawFirm(lawFirmName, cases) {
  if (!lawFirmName || !Array.isArray(cases)) return [];
  const normalized = lawFirmName.trim().toLowerCase();
  if (!normalized) return [];
  return cases.filter(
    (c) => (c.estudioJuridico || "").trim().toLowerCase() === normalized
  );
}

// 1.10.1 — Higiene P3 (código muerto): se eliminaron getCaseSummary, safeName,
// hasRelatedCases, getUniqueInsurers y getUniqueLawFirms. Verificación: grep de
// cada nombre en src/ (incl. *.test.* y barrels) = 0 usos fuera de este archivo y
// 0 usos internos (getCaseSummary no era llamado por nadie; el resto tampoco).
// Informe AUDITORIA_RELEASE_1.10.1.md §8 (cluster caseRelations ×6; verificados 5).
// Se conservan getRelatedNotes/getRelatedEvents/getCasesByInsurer/getCasesByLawFirm,
// únicos importados por components/modales/VerCasoModal.jsx:36-41.
