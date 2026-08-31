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

/**
 * Devuelve un objeto con toda la información resuelta de un caso.
 * Útil para el Perfil 360°.
 * @param {string|number} caseId
 * @param {Array} cases
 * @param {Array} notes
 * @param {Array} events
 * @returns {object|null} { caso, notas, eventos, casosByInsurer, casosByLawFirm }
 */
export function getCaseSummary(caseId, cases, notes, events) {
  if (!caseId) return null;
  const caso = cases.find((c) => String(c.id) === String(caseId));
  if (!caso) return null;

  const notas = getRelatedNotes(caseId, notes);
  const eventos = getRelatedEvents(caseId, events);
  const casosByInsurer = caso.aseguradora
    ? getCasesByInsurer(caso.aseguradora, cases).filter(
        (c) => String(c.id) !== String(caseId)
      )
    : [];
  const casosByLawFirm = caso.estudioJuridico
    ? getCasesByLawFirm(caso.estudioJuridico, cases).filter(
        (c) => String(c.id) !== String(caseId)
      )
    : [];

  return { caso, notas, eventos, casosByInsurer, casosByLawFirm };
}

/**
 * Normaliza un nombre de aseguradora/estudio para comparación segura.
 * Devuelve string vacío si el valor es null/undefined/vacío.
 * @param {string} name
 * @returns {string}
 */
export function safeName(name) {
  return (name || "").trim();
}

/**
 * Verifica si un nombre de aseguradora/estudio tiene casos asociados.
 * @param {string} name
 * @param {Array} cases
 * @param {'aseguradora'|'estudioJuridico'} field
 * @returns {boolean}
 */
export function hasRelatedCases(name, cases, field = "aseguradora") {
  if (!name || !Array.isArray(cases)) return false;
  const normalized = name.trim().toLowerCase();
  return cases.some(
    (c) => (c[field] || "").trim().toLowerCase() === normalized
  );
}

/**
 * Obtiene todas las aseguradoras únicas de los casos existentes.
 * @param {Array} cases
 * @returns {Array<string>}
 */
export function getUniqueInsurers(cases) {
  if (!Array.isArray(cases)) return [];
  const set = new Set();
  for (const c of cases) {
    const v = (c.aseguradora || "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}

/**
 * Obtiene todos los estudios jurídicos únicos de los casos existentes.
 * @param {Array} cases
 * @returns {Array<string>}
 */
export function getUniqueLawFirms(cases) {
  if (!Array.isArray(cases)) return [];
  const set = new Set();
  for (const c of cases) {
    const v = (c.estudioJuridico || "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}
