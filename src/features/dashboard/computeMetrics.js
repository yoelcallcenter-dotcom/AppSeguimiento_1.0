/**
 * computeMetrics.js
 * Motor de métricas avanzadas del dashboard.
 * Entrada: casos (IndexedDB) + filtros opcionales.
 * Salida: KPIs, distribuciones, series temporales y listas de alertas.
 * Todas las funciones son puras y se calculan en una sola pasada (O(n)).
 */

import { CATEGORIAS_DEFAULT } from "./metricsEngine";
import { isSameMonth, normalizeDate } from "../../utils/dateFilters";
import { getEstados, getEstadoAccent, sumarPeso } from "../../utils/catalogos";
import { normalizarUbicacion } from "../../utils/ubicacionUtils";
import { buildUnifiedActivityFeed } from "../../core/cases/activityFeed";

const CHART_COLORS = [
  "#D9A441", "#60A5FA", "#34D399", "#F87171", "#818CF8",
  "#FBBF24", "#94A3B8", "#E11D48", "#FB923C", "#10B981",
];

export function colorDeEstado(estado, config) {
  return getEstadoAccent(config, estado) || "#94A3B8";
}

export function getChartColors() {
  return [...CHART_COLORS];
}

export function provinciaDe(c) {
  const p = (c?.provincia || '').trim();
  if (p) return p.toUpperCase();
  const loc = (c?.localidad || '').trim();
  if (!loc) return 'Sin provincia';
  const norm = normalizarUbicacion(loc);
  return norm.provincia || 'Sin provincia';
}

export function diasDesde(fechaStr) {
  if (!fechaStr) return null;
  const iso = normalizeDate(fechaStr);
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

// ============================================================
// FILTRADO
// ============================================================
export function aplicarFiltros(cases, filters = {}) {
  if (!Array.isArray(cases)) return [];
  let result = cases;

  const mes = filters.mes;
  if (mes && mes !== "todos") {
    const [year, month] = mes.split("-").map(Number);
    result = result.filter((c) => isSameMonth(c.fecha, month - 1, year));
  }

  // Multi-selección de días (array) o día único (compatibilidad).
  const dias = filters.dias || (filters.dia !== undefined && filters.dia >= 1 ? [filters.dia] : []);
  if (dias.length > 0) {
    const pads = new Set(dias.map((d) => String(d).padStart(2, "0")));
    result = result.filter((c) => {
      const iso = normalizeDate(c.fecha);
      if (!iso) return false;
      const parts = iso.split("-");
      return parts.length === 3 && pads.has(parts[2]);
    });
  }

  const match = (campo) => (valor) => (c) =>
    !valor || valor === "todos" ||
    (c[campo] || '').toString().trim().toUpperCase() === String(valor).trim().toUpperCase();

  const fEstado = match("estado")(filters.estado);
  const fEstudio = match("estudioJuridico")(filters.estudio);
  const fProvincia = match("provincia")(filters.provincia);
  const fTipo = match("tipoIngreso")(filters.tipo);

  result = result.filter(
    (c) => fEstado(c) && fEstudio(c) && fProvincia(c) && fTipo(c)
  );

  return result;
}

// ============================================================
// AGRUPACIONES
// ============================================================
function groupByField(cases, field, cats, { max = 10 } = {}) {
  const map = {};
  for (const c of cases) {
    const key = (field === "provincia" ? provinciaDe(c) : (c[field] || 'Sin dato')).trim() || 'Sin dato';
    if (!map[key]) map[key] = { key, total: 0, success: 0, contact: 0, lost: 0, pending: 0 };
    map[key].total++;
    if (cats.success.includes(c.estado)) map[key].success++;
    else if (cats.contact.includes(c.estado)) map[key].contact++;
    else if (cats.lost.includes(c.estado)) map[key].lost++;
    else if (cats.pending.includes(c.estado)) map[key].pending++;
  }
  return Object.values(map)
    .map((g) => ({
      ...g,
      conversion: g.total > 0 ? Math.round((g.success / g.total) * 100) : 0,
      share: cases.length > 0 ? Math.round((g.total / cases.length) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, max);
}

// Convierte la fecha de un reporte (DD/MM[/YYYY] o ISO) a ISO (YYYY-MM-DD).
// Para fechas DD/MM sin año usa el año actual; si la fecha caería demasiado en
// el futuro (más de 30 días) pertenece al año anterior.
// (Exportada para reuso en features/analytics sin duplicar la lógica.)
export function reporteFechaIso(fechaStr, today) {
  if (!fechaStr) return null;
  const s = String(fechaStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parts = s.split("/");
  if (parts.length >= 2) {
    const dd = Number(parts[0]);
    const mm = Number(parts[1]);
    if (!isNaN(dd) && !isNaN(mm) && dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      const year = today.getFullYear();
      let iso = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      const candidate = new Date(year, mm - 1, dd);
      const diff = Math.round((candidate - today) / (1000 * 60 * 60 * 24));
      if (diff > 30) {
        iso = `${year - 1}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      }
      return iso;
    }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// Clave de semana ISO (año-semana) para agrupar la serie por semanas.
// (Exportada para reuso en features/analytics.)
export function isoWeekKey(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function buildSeries(cases, days = 30, cats) {
  const series = [];
  const index = new Map();
  const today = new Date();
  let semana = 0;
  let lastWeek = null;
  // La serie ignora sábados y domingos (días no laborales).
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const iso = d.toISOString().slice(0, 10);
    const wk = isoWeekKey(d);
    if (wk !== lastWeek) {
      semana += 1;
      lastWeek = wk;
    }
    index.set(iso, series.length);
    series.push({ fecha: iso, label: `${d.getDate()}/${d.getMonth() + 1}`, semana, total: 0, firmas: 0 });
  }

  const success = cats?.success || ["Firmo"];

  // Fecha de la firma: se usa el día en que se cargó el reporte de la firma
  // (último reporte); si no hay reportes, se usa fechaFirma.
  const fechaFirmaDe = (c) => {
    const reports = c.reporteHistory || [];
    if (reports.length > 0) {
      const iso = reporteFechaIso(reports[reports.length - 1].fecha, today);
      if (iso) return iso;
    }
    return normalizeDate(c.fechaFirma) || null;
  };

  for (const c of cases) {
    const key = normalizeDate(c.fecha);
    if (key && index.has(key)) series[index.get(key)].total++;
    const esFirma = success.includes(c.estado) || !!c.fechaFirma;
    if (esFirma) {
      const fk = fechaFirmaDe(c);
      if (fk && index.has(fk)) series[index.get(fk)].firmas++;
    }
  }
  return series;
}

// ============================================================
// ACTIVIDAD RECIENTE
// ============================================================
function stripHTML(str) {
  if (!str) return '';
  return String(str).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseFechaCorta(str) {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str.slice(0, 10) + "T00:00:00");
  const parts = String(str).split('/');
  if (parts.length >= 2) {
    const year = new Date().getFullYear();
    const d = new Date(year, Number(parts[1]) - 1, Number(parts[0]));
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * buildActivityFeed — Wrapper que delega a la versión centralizada de activityFeed.js.
 * Mantiene compatibilidad con el Dashboard existente.
 */
export function buildActivityFeed(cases, notes, events, limit = 15) {
  return buildUnifiedActivityFeed({ cases, notes, events, limit });
}

// ============================================================
// MÉTRICAS PRINCIPALES
// ============================================================
export function computeMetrics(cases, filters = {}, config = {}) {
  const cats = {
    ...CATEGORIAS_DEFAULT,
    ...(config?.metrics?.categorias || {}),
  };
  const base = aplicarFiltros(cases, filters);
  const total = base.length;

  const isActivo = (c) => [...cats.contact, ...cats.pending].includes(c.estado);
  const isCerrado = (c) => [...cats.success, ...cats.lost].includes(c.estado);

  const activos = base.filter(isActivo);
  const cerrados = base.filter(isCerrado);
  const firmas = base.filter((c) => cats.success.includes(c.estado));
  const perdidos = base.filter((c) => cats.lost.includes(c.estado));
  const sinReporte = base.filter((c) => !c.reporteHistory || c.reporteHistory.length === 0);
  const unassigned = base.filter((c) => !(c.estudioJuridico || '').trim());

  // Suma ponderada según el peso de cada estado (peso 0 ⇒ no suma).
  const totalPonderado = sumarPeso(config, base);

  const now = Date.now();
  const DAY = 1000 * 60 * 60 * 24;

  // Casos vencidos: activos con más de 30 días desde la fecha del caso.
  const overdue = base.filter((c) => {
    if (!isActivo(c)) return false;
    const d = diasDesde(c.fecha);
    return d !== null && d > 30;
  });

  // Casos sin actualizar: activos con más de 15 días desde el último update.
  const stale = base.filter((c) => {
    if (!isActivo(c)) return false;
    const d = diasDesde(c.updatedAt || c.fecha);
    return d !== null && d > 15;
  });

  // Tiempo promedio a firma (días entre fecha del caso y fechaFirma).
  let avgResolutionDays = 0;
  let resolucionCount = 0;
  for (const c of firmas) {
    const start = normalizeDate(c.fecha);
    const end = normalizeDate(c.fechaFirma);
    if (!start || !end) continue;
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    if (isNaN(s.getTime()) || isNaN(e.getTime())) continue;
    const diff = Math.round((e - s) / DAY);
    if (diff >= 0) {
      avgResolutionDays += diff;
      resolucionCount++;
    }
  }
  if (resolucionCount > 0) avgResolutionDays = Math.round(avgResolutionDays / resolucionCount);

  const tasaConversion = total > 0 ? Math.round((firmas.length / total) * 100) : 0;
  const tasaCierre = total > 0 ? Math.round((cerrados.length / total) * 100) : 0;

  // Reprogramaciones (1.5.1): contar reportes con estado "Reprogramado".
  let reprogramaciones = 0;
  const casosReprogramados = new Set();
  for (const c of base) {
    if (!Array.isArray(c.reporteHistory)) continue;
    for (const r of c.reporteHistory) {
      if (r && r.estado === "Reprogramado") {
        reprogramaciones++;
        casosReprogramados.add(c.id);
      }
    }
  }

  const byStatus = Object.entries(
    base.reduce((acc, c) => {
      const k = c.estado || 'Sin estado';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value, color: colorDeEstado(name, config) }))
    .sort((a, b) => b.value - a.value);

  // Categorías del pipeline (para donut/cards).
  const byCategory = [
    { key: 'activos', name: 'Activos', value: activos.length, color: '#60A5FA' },
    { key: 'firmas', name: 'Firmados', value: firmas.length, color: '#10B981' },
    { key: 'perdidos', name: 'Perdidos', value: perdidos.length, color: '#EF4444' },
    { key: 'sinReporte', name: 'Sin reporte', value: sinReporte.length, color: '#FBBF24' },
  ].filter((x) => x.value > 0);

  const byStudy = groupByField(base, 'estudioJuridico', cats, { max: 10 });
  const byProvince = groupByField(base, 'provincia', cats, { max: 10 });
  const byType = groupByField(base, 'tipoIngreso', cats, { max: 10 });
  const byAseguradora = groupByField(base, 'aseguradora', cats, { max: 8 });
  const byLocalidad = groupByField(base, 'localidad', cats, { max: 8 });

  const recentCases = [...base]
    .sort((a, b) => new Date(b.updatedAt || b.fecha || 0) - new Date(a.updatedAt || a.fecha || 0))
    .slice(0, 5);

  const oldestCase = [...base].sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0))[0] || null;

  const seriesByDay = buildSeries(base, 30, cats);

  // Serie semanal agregada (total y firmas por semana + conversión).
  const weeklySeries = (() => {
    const map = new Map();
    for (const s of seriesByDay) {
      if (!map.has(s.semana)) map.set(s.semana, { semana: s.semana, total: 0, firmas: 0 });
      map.get(s.semana).total += s.total;
      map.get(s.semana).firmas += s.firmas;
    }
    return [...map.values()].map((w) => ({
      ...w,
      conversion: w.total > 0 ? Math.round((w.firmas / w.total) * 100) : 0,
      label: `Semana ${w.semana}`,
    }));
  })();

  return {
    // KPI generales
    total,
    totalPonderado,
    activos: activos.length,
    cerrados: cerrados.length,
    firmas: firmas.length,
    perdidos: perdidos.length,
    pendientes: base.length - activos.length - cerrados.length,
    sinReporte: sinReporte.length,
    unassigned: unassigned.length,
    tasaConversion,
    tasaCierre,
    avgResolutionDays,

    // Distribuciones
    byStatus,
    byCategory,
    byStudy,
    byProvince,
    byType,
    byAseguradora,
    byLocalidad,

    // Tiempo
    seriesByDay,
    weeklySeries,

    // Referencias
    recentCases,
    oldestCase,

    // Alertas
    overdueCases: overdue,
    staleCases: stale,
    unassignedCases: unassigned,
    sinReporteCasos: sinReporte,

    // Reprogramaciones (1.5.1)
    reprogramaciones,
    casosReprogramados: casosReprogramados.size,
  };
}
