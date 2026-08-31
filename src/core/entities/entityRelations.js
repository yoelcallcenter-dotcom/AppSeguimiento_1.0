/**
 * entityRelations.js — Relaciones entre entidades del sistema.
 * Relaciona casos, aseguradoras, estudios jurídicos, condicionales,
 * speechs y objeciones mediante reglas explícitas (sin IA).
 */

import { normalizarTexto } from '../../utils/helpers';

// ============================================================
// UTILIDADES
// ============================================================

function matchName(fieldValue, searchName) {
  return normalizarTexto(fieldValue || '') === normalizarTexto(searchName || '');
}

function includesName(text, name) {
  return normalizarTexto(text || '').includes(normalizarTexto(name || ''));
}

// ============================================================
// CONDICIONALES
// ============================================================

export function getCondicionalesForInsurer(aseguradoraName, condicionales = []) {
  return condicionales.filter((c) => matchName(c.aseguradora, aseguradoraName));
}

export function getCondicionalesForLawFirm(estudioName, condicionales = []) {
  return condicionales.filter((c) => matchName(c.estudio, estudioName));
}

export function getCondicionalesForCombo(aseguradoraName, estudioName, condicionales = []) {
  return condicionales.filter(
    (c) => matchName(c.aseguradora, aseguradoraName) && matchName(c.estudio, estudioName)
  );
}

// ============================================================
// ESTADÍSTICAS DE ENTIDAD
// ============================================================

export function getInsurerStats(aseguradoraName, cases = [], config = {}) {
  const cats = config?.metrics?.categorias || {};
  const contact = [...(cats.contact || []), ...(cats.pending || [])];
  const success = cats.success || [];

  const related = cases.filter((c) => matchName(c.aseguradora, aseguradoraName));
  const total = related.length;
  const activos = related.filter((c) => contact.includes(c.estado)).length;
  const cerrados = related.filter((c) => success.includes(c.estado)).length;
  const firmas = related.filter((c) => success.includes(c.estado)).length;
  const tasaConversion = total > 0 ? Math.round((firmas / total) * 100) : 0;

  return { total, activos, cerrados, firmas, tasaConversion };
}

export function getLawFirmStats(estudioName, cases = [], config = {}) {
  const cats = config?.metrics?.categorias || {};
  const contact = [...(cats.contact || []), ...(cats.pending || [])];
  const success = cats.success || [];

  const related = cases.filter((c) => matchName(c.estudioJuridico, estudioName));
  const total = related.length;
  const activos = related.filter((c) => contact.includes(c.estado)).length;
  const cerrados = related.filter((c) => success.includes(c.estado)).length;
  const firmas = related.filter((c) => success.includes(c.estado)).length;
  const tasaConversion = total > 0 ? Math.round((firmas / total) * 100) : 0;

  return { total, activos, cerrados, firmas, tasaConversion };
}

// ============================================================
// CASOS RELACIONADOS
// ============================================================

export function getCasesForInsurer(aseguradoraName, cases = []) {
  return cases.filter((c) => matchName(c.aseguradora, aseguradoraName));
}

export function getCasesForLawFirm(estudioName, cases = []) {
  return cases.filter((c) => matchName(c.estudioJuridico, estudioName));
}

// ============================================================
// SPEECHS Y OBJECIONES RELACIONADOS
// ============================================================

export function getRelatedSpeechs(entityName, speechs = []) {
  if (!entityName) return [];
  return speechs.filter((s) => {
    const text = typeof s === 'string' ? s : (s.contenido || s.texto || '');
    return includesName(text, entityName);
  });
}

export function getRelatedObjeciones(entityName, objeciones = []) {
  if (!entityName) return [];
  return objeciones.filter((o) => {
    const text = o.contenido || o.texto || '';
    return includesName(text, entityName);
  });
}

// ============================================================
// HERRAMIENTAS RELACIONADAS (para VerCasoModal)
// ============================================================

export function getRelatedTools(aseguradoraName, estudioName, condicionales = [], speechs = [], objeciones = []) {
  const condicionalesCombo = getCondicionalesForCombo(aseguradoraName, estudioName, condicionales);
  const condicionalesInsurer = getCondicionalesForInsurer(aseguradoraName, condicionales);
  const condicionalesLawFirm = getCondicionalesForLawFirm(estudioName, condicionales);

  // Unificar condicionales sin duplicados
  const allCondIds = new Set();
  const allCondicionales = [];
  for (const c of [...condicionalesCombo, ...condicionalesInsurer, ...condicionalesLawFirm]) {
    if (!allCondIds.has(c.id)) {
      allCondIds.add(c.id);
      allCondicionales.push(c);
    }
  }

  const speechsInsurer = getRelatedSpeechs(aseguradoraName, speechs);
  const speechsLawFirm = getRelatedSpeechs(estudioName, speechs);
  const allSpeechs = [...new Set([...speechsInsurer, ...speechsLawFirm])];

  const objInsurer = getRelatedObjeciones(aseguradoraName, objeciones);
  const objLawFirm = getRelatedObjeciones(estudioName, objeciones);
  const allObjeciones = [...new Set([...objInsurer, ...objLawFirm])];

  return {
    condicionales: allCondicionales,
    speechs: allSpeechs,
    objeciones: allObjeciones,
    hasContent: allCondicionales.length > 0 || allSpeechs.length > 0 || allObjeciones.length > 0,
  };
}

// ============================================================
// RESUMEN DE ENTIDAD
// ============================================================

export function getInsurerSummary(aseguradoraName, cases = [], condicionales = [], aseguradoras = []) {
  const casosRelacionados = getCasesForInsurer(aseguradoraName, cases);
  const condicionalesRel = getCondicionalesForInsurer(aseguradoraName, condicionales);
  const directorio = aseguradoras.find((a) => matchName(a.nombre, aseguradoraName));

  // Estudios únicos de los condicionales
  const estudiosRelacionados = [...new Set(condicionalesRel.map((c) => c.estudio))];

  return {
    name: aseguradoraName,
    observaciones: directorio?.observaciones || '',
    casosCount: casosRelacionados.length,
    condicionalesCount: condicionalesRel.length,
    noTomanCount: condicionalesRel.filter((c) => c.condicion === 'no-toma').length,
    condicionCount: condicionalesRel.filter((c) => c.condicion === 'condicion').length,
    estudiosRelacionados,
    existeEnDirectorio: !!directorio,
  };
}

export function getLawFirmSummary(estudioName, cases = [], condicionales = [], mapeo = []) {
  const casosRelacionados = getCasesForLawFirm(estudioName, cases);
  const condicionalesRel = getCondicionalesForLawFirm(estudioName, condicionales);
  const mapeoEntry = mapeo.find((m) => matchName(m.estudio, estudioName));

  return {
    name: estudioName,
    provincia: mapeoEntry?.provincia || '',
    localidades: mapeoEntry?.localidades || '',
    direcciones: mapeoEntry?.direcciones || [],
    casosCount: casosRelacionados.length,
    condicionalesCount: condicionalesRel.length,
    noTomanCount: condicionalesRel.filter((c) => c.condicion === 'no-toma').length,
    condicionCount: condicionalesRel.filter((c) => c.condicion === 'condicion').length,
    existeEnMapeo: !!mapeoEntry,
  };
}
