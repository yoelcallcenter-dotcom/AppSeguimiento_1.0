/**
 * entityRelations.js — Relaciones entre entidades del sistema.
 * Relaciona casos, aseguradoras, estudios jurídicos, condicionales,
 * speechs y objeciones mediante reglas explícitas (sin IA).
 *
 * 1.10.1 — Higiene P3 (código muerto; AUDITORIA_RELEASE_1.10.1 §8, cluster
 * entityRelations ×11 exportados sin importador): se eliminaron
 * getInsurerStats, getLawFirmStats, getCasesForInsurer, getCasesForLawFirm,
 * getInsurerSummary y getLawFirmSummary (grep de cada nombre en src/ incl.
 * *.test.* y barrels = 0 usos; getCasesForInsurer/getCasesForLawFirm solo las
 * usaban los dos resúmenes eliminados). Las 5 funciones de condicionales /
 * speechs / objeciones quedaron SIN `export`: siguen existiendo porque solo
 * las usa internamente getRelatedTools. Único export vivo: getRelatedTools
 * (importado por components/modales/VerCasoModal.jsx:42).
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
// CONDICIONALES (sin export: helpers internos de getRelatedTools)
// ============================================================

function getCondicionalesForInsurer(aseguradoraName, condicionales = []) {
  return condicionales.filter((c) => matchName(c.aseguradora, aseguradoraName));
}

function getCondicionalesForLawFirm(estudioName, condicionales = []) {
  return condicionales.filter((c) => matchName(c.estudio, estudioName));
}

function getCondicionalesForCombo(aseguradoraName, estudioName, condicionales = []) {
  return condicionales.filter(
    (c) => matchName(c.aseguradora, aseguradoraName) && matchName(c.estudio, estudioName)
  );
}

// ============================================================
// SPEECHS Y OBJECIONES RELACIONADOS (sin export: internos de getRelatedTools)
// ============================================================

function getRelatedSpeechs(entityName, speechs = []) {
  if (!entityName) return [];
  return speechs.filter((s) => {
    const text = typeof s === 'string' ? s : (s.contenido || s.texto || '');
    return includesName(text, entityName);
  });
}

function getRelatedObjeciones(entityName, objeciones = []) {
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
