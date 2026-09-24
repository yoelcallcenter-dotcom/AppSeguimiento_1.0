/**
 * searchEngine.js
 * Motor de búsqueda único para la aplicación.
 * Se comparte entre la barra de búsqueda del header y la Búsqueda Global (Ctrl+K)
 * para que ambas tengan la misma lógica.
 *
 * Sintaxis de búsqueda:
 *   #etiqueta  → coincide con casos, notas y eventos que tengan esa etiqueta.
 *   @palabra   → coincide con casos cuyo comentario empieza (o contiene) ese texto.
 *   texto libre → búsqueda difusa (Fuse) sobre todos los campos.
 */

import Fuse from "fuse.js";
import { normalizarTexto } from "./helpers";

export const FUSE_KEYS = [
  { name: "nombre", weight: 2 },
  { name: "title", weight: 2 },
  { name: "telefono", weight: 1.5 },
  { name: "localidad", weight: 1 },
  { name: "aseguradora", weight: 1 },
  { name: "descripcion", weight: 1 },
  { name: "observaciones", weight: 0.5 },
  { name: "content", weight: 0.5 },
  { name: "tags", weight: 0.5 },
  { name: "estado", weight: 0.5 },
];

export const FUSE_KEYS_REPORTES = [
  { name: "texto", weight: 2 },
  { name: "caseNombre", weight: 1.5 },
  { name: "fecha", weight: 1 },
  { name: "origen", weight: 0.5 },
];

export const FUSE_KEYS_HISTORIAL = [
  { name: "title", weight: 2 },
  { name: "description", weight: 1 },
  { name: "caseNombre", weight: 1.5 },
];

const IDX_MAP = {
  idxNombre: "nombre",
  idxTelefono: "telefono",
  idxLocalidad: "localidad",
  idxAseguradora: "aseguradora",
  idxObservaciones: "observaciones",
};

/**
 * Interpreta una consulta: tipo tag (#), comentario (@) o texto libre.
 */
export function parseBusqueda(q) {
  const s = (q || "").trim();
  if (s.startsWith("#")) return { tipo: "tag", termino: s.slice(1).trim() };
  if (s.startsWith("@")) return { tipo: "comentario", termino: s.slice(1).trim() };
  return { tipo: "texto", termino: s };
}

function matchTag(tags, term) {
  return (tags || []).some((t) => {
    const nt = normalizarTexto(t);
    return nt === term || nt.includes(term);
  });
}

function matchComentario(comentarios, term) {
  return (comentarios || []).some((cm) => {
    const texto = normalizarTexto(cm?.texto);
    return texto.startsWith(term) || texto.includes(term);
  });
}

/**
 * Coincidencia de un caso contra una consulta (filtro en vivo del header).
 * Devuelve true si la consulta está vacía.
 */
export function casoCoincide(c, q) {
  const { tipo, termino } = parseBusqueda(q);
  if (!termino) return true;
  if (tipo === "tag") return matchTag(c?.tags, normalizarTexto(termino));
  if (tipo === "comentario") return matchComentario(c?.comentarios, normalizarTexto(termino));

  const t = normalizarTexto(q);
  return [
    c?.nombre,
    c?.telefono,
    c?.localidad,
    c?.aseguradora,
    c?.profesion,
    c?.estudioJuridico,
    c?.observaciones,
    c?.estado,
    (c?.tags || []).join(" "),
    (c?.comentarios || []).map((x) => x.texto).join(" "),
  ].some((v) => normalizarTexto(v).includes(t));
}

/**
 * Aplana el historial de reportes de todos los casos en items buscables.
 * No muta datos: genera una proyección { id, type, caseId, caseNombre, ... }.
 */
export function flattenReportes(cases = []) {
  const out = [];
  for (const c of cases) {
    const caseNombre = c.nombre || "Sin nombre";
    (Array.isArray(c.reporteHistory) ? c.reporteHistory : []).forEach((r, idx) => {
      out.push({
        id: `rep-${c.id}-${idx}`,
        type: "reporte",
        caseId: c.id,
        caseNombre,
        texto: r?.texto || "",
        fecha: r?.fecha || "",
        origen: r?.origen || "",
      });
    });
  }
  return out;
}

/**
 * Aplana los registros de case_history (tabla local cole-gated por caso)
 * en items buscables, enriqueciéndolos con el nombre del caso asociado.
 */
export function flattenHistorial(historialRows = [], cases = []) {
  const byId = new Map(cases.map((c) => [String(c.id), c]));
  return historialRows.map((h) => {
    const caso = byId.get(String(h.caseId));
    return {
      id: `hist-${h.key ?? h.id}`,
      type: "historial",
      caseId: h.caseId,
      caseNombre: caso?.nombre || "Sin nombre",
      title: h.title || "",
      description: h.description || "",
      timestamp: h.timestamp || "",
      source: h.source || "",
    };
  });
}

/**
 * Construye los índices Fuse compartidos para la búsqueda global.
 * Reportes e historial se indexan de la misma manera determinística.
 */
export function crearIndicesGlobal({ cases = [], notes = [], events = [], cfg = {}, historial = [] }) {
  const caseKeys = FUSE_KEYS.filter((k) => {
    if (k.name === "title" || k.name === "content" || k.name === "descripcion") return false;
    const idxKey = Object.keys(IDX_MAP).find((ik) => IDX_MAP[ik] === k.name);
    if (idxKey && cfg[idxKey] === false) return false;
    return true;
  });

  const reportes = flattenReportes(cases);
  const historialItems = flattenHistorial(historial, cases);

  return {
    cases,
    notes,
    events,
    reportes,
    historial: historialItems,
    fuseCases: new Fuse(cases, { threshold: 0.4, keys: caseKeys }),
    fuseNotes: new Fuse(notes, {
      threshold: 0.4,
      keys: FUSE_KEYS.filter((k) => ["title", "content", "tags"].includes(k.name)),
    }),
    fuseEvents: new Fuse(events, {
      threshold: 0.4,
      keys: FUSE_KEYS.filter((k) => ["title", "descripcion", "tags"].includes(k.name)),
    }),
    fuseReportes: new Fuse(reportes, { threshold: 0.4, keys: FUSE_KEYS_REPORTES }),
    fuseHistorial: new Fuse(historialItems, { threshold: 0.4, keys: FUSE_KEYS_HISTORIAL }),
  };
}

/**
 * Busca en casos, notas, eventos, reportes e historial con el motor compartido.
 * Respeta #etiqueta y @comentario; para texto libre usa Fuse.
 */
export function buscarGlobal(indices, q) {
  const { tipo, termino } = parseBusqueda(q);
  if (!termino) {
    return { cases: [], notes: [], events: [], reportes: [], historial: [] };
  }
  const { cases, notes, events, fuseCases, fuseNotes, fuseEvents, fuseReportes, fuseHistorial } = indices;

  if (tipo === "tag") {
    const term = normalizarTexto(termino);
    return {
      cases: cases.filter((c) => matchTag(c.tags, term)).slice(0, 5),
      notes: notes.filter((n) => matchTag(n.tags, term)).slice(0, 5),
      events: events.filter((e) => matchTag(e.tags, term)).slice(0, 5),
      reportes: [],
      historial: [],
    };
  }

  if (tipo === "comentario") {
    const term = normalizarTexto(termino);
    return {
      cases: cases.filter((c) => matchComentario(c.comentarios, term)).slice(0, 5),
      notes: [],
      events: [],
      reportes: [],
      historial: [],
    };
  }

  return {
    cases: fuseCases.search(termino).slice(0, 5).map((r) => r.item),
    notes: fuseNotes.search(termino).slice(0, 5).map((r) => r.item),
    events: fuseEvents.search(termino).slice(0, 5).map((r) => r.item),
    reportes: fuseReportes.search(termino).slice(0, 5).map((r) => r.item),
    historial: fuseHistorial.search(termino).slice(0, 5).map((r) => r.item),
  };
}

/**
 * Busca en aseguradoras, estudios jurídicos y condicionales.
 */
export function buscarEntidades(entityIndices, q) {
  const { tipo, termino } = parseBusqueda(q);
  if (!termino) return { insurers: [], lawFirms: [], condicionales: [] };
  const { aseguradoras = [], mapeo = [], condicionales = [] } = entityIndices;
  const term = normalizarTexto(termino);

  const insurers = aseguradoras
    .filter((a) => normalizarTexto(typeof a === 'string' ? a : a.nombre || '').includes(term))
    .slice(0, 5)
    .map((a) => ({ nombre: typeof a === 'string' ? a : a.nombre }));

  const lawFirms = mapeo
    .filter((m) => normalizarTexto(typeof m === 'string' ? m : m.nombre || '').includes(term))
    .slice(0, 5)
    .map((m) => ({ nombre: typeof m === 'string' ? m : m.nombre }));

  const foundCondicionales = condicionales
    .filter((c) => normalizarTexto(c.aseguradora || '').includes(term) || normalizarTexto(c.estudioJuridico || '').includes(term))
    .slice(0, 5);

  return { insurers, lawFirms, condicionales: foundCondicionales };
}
