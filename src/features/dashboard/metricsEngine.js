// ============================================================
// CATEGORÍAS DE ESTADO (configurables)
// ============================================================
import { normalizeDate } from "../../utils/dateFilters";

export const CATEGORIAS_DEFAULT = {
  success: ['Firmo'],
  contact: ['Cita virtual', 'Cita presencial', 'Lo piensa', 'Pendiente', '2do Llamado'],
  lost: ['No le interesa', 'Tiene Abogado', 'Incontactable', 'No viable'],
  pending: ['No responde', 'Reprogramado', 'Sin reporte'],
};

export function getDefaultCategories() {
  return JSON.parse(JSON.stringify(CATEGORIAS_DEFAULT));
}

// ============================================================
// MÉTRICAS — definiciones con fórmulas
// ============================================================
const METRIC_DEFS = {
  // --- GENERALES ---
  totalCasos: {
    id: 'totalCasos', label: 'Casos totales', format: 'number', group: 'general',
    desc: 'Total de casos en el período',
    formula: (ctx) => ctx.filtered.length,
  },
  firmas: {
    id: 'firmas', label: 'Firmas', format: 'number', group: 'general',
    desc: 'Casos que llegaron a firma',
    formula: (ctx) => ctx.filtered.filter((c) => ctx.cats.success.includes(c.estado)).length,
  },
  pendientes: {
    id: 'pendientes', label: 'Pendientes', format: 'number', group: 'general',
    desc: 'Casos en etapa de contacto activo',
    formula: (ctx) => ctx.filtered.filter((c) => ctx.cats.contact.includes(c.estado)).length,
  },
  noResponden: {
    id: 'noResponden', label: 'No responden', format: 'number', group: 'general',
    desc: 'Casos donde el prospecto no responde o fue reprogramado',
    formula: (ctx) => ctx.filtered.filter((c) => ctx.cats.pending.includes(c.estado)).length,
  },
  perdidos: {
    id: 'perdidos', label: 'Perdidos', format: 'number', group: 'general',
    desc: 'Casos perdidos definitivamente',
    formula: (ctx) => ctx.filtered.filter((c) => ctx.cats.lost.includes(c.estado)).length,
  },
  sinReporte: {
    id: 'sinReporte', label: 'Sin reporte', format: 'number', group: 'general',
    desc: 'Casos sin ningún reporte cargado',
    formula: (ctx) => ctx.filtered.filter((c) => !c.reporteHistory || c.reporteHistory.length === 0).length,
  },

  // --- PERFORMANCE ---
  tasaConversion: {
    id: 'tasaConversion', label: 'Tasa de conversión', format: 'percentage', group: 'performance',
    desc: '% de casos convertidos en firma',
    formula: (ctx) => {
      const total = ctx.filtered.length;
      if (total === 0) return 0;
      return Math.round((ctx.filtered.filter((c) => ctx.cats.success.includes(c.estado)).length / total) * 100);
    },
  },
  tasaContacto: {
    id: 'tasaContacto', label: 'Tasa de contacto', format: 'percentage', group: 'performance',
    desc: '% de casos en etapa de contacto',
    formula: (ctx) => {
      const total = ctx.filtered.length;
      if (total === 0) return 0;
      return Math.round((ctx.filtered.filter((c) => ctx.cats.contact.includes(c.estado)).length / total) * 100);
    },
  },
  tasaPerdida: {
    id: 'tasaPerdida', label: 'Tasa de pérdida', format: 'percentage', group: 'performance',
    desc: '% de casos perdidos sobre el total',
    formula: (ctx) => {
      const total = ctx.filtered.length;
      if (total === 0) return 0;
      return Math.round((ctx.filtered.filter((c) => ctx.cats.lost.includes(c.estado)).length / total) * 100);
    },
  },
  tasaCierre: {
    id: 'tasaCierre', label: 'Tasa de cierre', format: 'percentage', group: 'performance',
    desc: '% de firmas sobre casos contactados',
    formula: (ctx) => {
      const contactados = ctx.filtered.filter((c) => [...ctx.cats.contact, ...ctx.cats.success].includes(c.estado)).length;
      if (contactados === 0) return 0;
      return Math.round((ctx.filtered.filter((c) => ctx.cats.success.includes(c.estado)).length / contactados) * 100);
    },
  },

  // --- TIEMPO ---
  tiempoPromedioFirma: {
    id: 'tiempoPromedioFirma', label: 'Tiempo promedio a firma', format: 'number', group: 'time',
    desc: 'Días promedio desde creación hasta firma',
    formula: (ctx) => avgDays(ctx, (c) => ctx.cats.success.includes(c.estado)),
    unit: 'días',
  },
  tiempoSinActividad: {
    id: 'tiempoSinActividad', label: 'Tiempo sin actividad', format: 'number', group: 'time',
    desc: 'Días desde el último reporte',
    formula: (ctx) => avgDaysSinceLastReport(ctx),
    unit: 'días',
  },
};

function avgDays(ctx, filterFn) {
  const filtered = ctx.filtered.filter(filterFn);
  if (filtered.length === 0) return 0;
  let totalDays = 0;
  let count = 0;
  for (const c of filtered) {
    const start = normalizeDate(c.fecha);
    if (!start) continue;
    const end = fechaDeFirma(c) || new Date().toISOString().slice(0, 10);
    if (!end) continue;
    const diff = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
    totalDays += Math.max(0, diff);
    count++;
  }
  return count > 0 ? Math.round(totalDays / count) : 0;
}

// Fecha de firma de un caso: usa `fechaFirma`; si no existe, usa el último
// reporte cargado (que suele ser el que registra la firma).
function fechaDeFirma(c) {
  const directa = normalizeDate(c.fechaFirma);
  if (directa) return directa;
  const reports = c.reporteHistory;
  if (reports && reports.length > 0) {
    const ultimo = reports[reports.length - 1];
    return normalizeDate(ultimo.fecha) || null;
  }
  return null;
}

function avgDaysSinceLastReport(ctx) {
  const now = new Date();
  let totalDays = 0;
  let count = 0;
  for (const c of ctx.filtered) {
    const reports = c.reporteHistory;
    if (!reports || reports.length === 0) continue;
    const lastReport = reports[reports.length - 1];
    const rDate = normalizeDate(lastReport?.fecha);
    if (!rDate) continue;
    const diff = Math.round((now - new Date(rDate)) / (1000 * 60 * 60 * 24));
    totalDays += Math.max(0, diff);
    count++;
  }
  return count > 0 ? Math.round(totalDays / count) : 0;
}

export function getMetricDefs() {
  return METRIC_DEFS;
}

export function computeMetrics(ctx, visibleIds) {
  const results = {};
  for (const id of visibleIds) {
    const def = METRIC_DEFS[id];
    if (!def) continue;
    try {
      results[id] = { ...def, value: def.formula(ctx) };
    } catch {
      results[id] = { ...def, value: 0 };
    }
  }
  return results;
}

// ============================================================
// FUNNEL
// ============================================================
const FUNNEL_ETAPAS = [
  { id: 'total', label: 'Total casos', get: (ctx) => ctx.filtered.length },
  {
    id: 'contacto', label: 'En contacto',
    get: (ctx) => ctx.filtered.filter((c) => [...ctx.cats.contact, ...ctx.cats.success].includes(c.estado)).length,
  },
  {
    id: 'gestion', label: 'En gestión',
    get: (ctx) => {
      const gestionEstados = ctx.cats.contact.filter((e) => !['Pendiente', '2do Llamado'].includes(e));
      return ctx.filtered.filter((c) => gestionEstados.includes(c.estado)).length;
    },
  },
  {
    id: 'exito', label: 'Firmas',
    get: (ctx) => ctx.filtered.filter((c) => ctx.cats.success.includes(c.estado)).length,
  },
];

export function getFunnelStages() { return FUNNEL_ETAPAS; }

export function computeFunnel(ctx) {
  return FUNNEL_ETAPAS.map((etapa, i) => {
    const value = etapa.get(ctx);
    const prev = i > 0 ? FUNNEL_ETAPAS[i - 1].get(ctx) : value;
    const conversion = prev > 0 ? Math.round((value / prev) * 100) : 0;
    return { ...etapa, value, conversion };
  });
}

// ============================================================
// AGRUPACIONES DINÁMICAS (Smart Tables)
// ============================================================
export function groupBy(ctx, field, cats) {
  const map = {};
  for (const c of ctx.filtered) {
    const key = (c[field] || 'Sin dato').trim();
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
      perdida: g.total > 0 ? Math.round((g.lost / g.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function groupByEstado(ctx, cats) {
  const map = {};
  for (const c of ctx.filtered) {
    const key = c.estado || 'Sin estado';
    if (!map[key]) map[key] = { estado: key, count: 0 };
    map[key].count++;
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

// ============================================================
// ALERTAS
// ============================================================
const ALERTAS_DEFAULT = {
  bajaConversion: { active: true, label: 'Baja conversión', threshold: 15, severity: 'warning' },
  muchosPendientes: { active: true, label: 'Muchos pendientes', threshold: 60, severity: 'info' },
  casosSinReporte: { active: true, label: 'Casos sin reporte', threshold: 5, severity: 'warning' },
  altaPerdida: { active: false, label: 'Alta tasa de pérdida', threshold: 40, severity: 'danger' },
};

export function getDefaultAlerts() { return JSON.parse(JSON.stringify(ALERTAS_DEFAULT)); }

export function evaluateAlerts(ctx, alertas) {
  const activas = [];
  for (const [id, cfg] of Object.entries(alertas)) {
    if (!cfg.active) continue;
    const total = ctx.filtered.length;
    if (total === 0) continue;
    switch (id) {
      case 'bajaConversion': {
        const exito = ctx.filtered.filter((c) => ctx.cats.success.includes(c.estado)).length;
        const tasa = Math.round((exito / total) * 100);
        if (tasa < cfg.threshold) activas.push({ ...cfg, id, actual: tasa, unidad: '%' });
        break;
      }
      case 'muchosPendientes': {
        const pendientes = ctx.filtered.filter((c) => ctx.cats.contact.includes(c.estado)).length;
        const pct = Math.round((pendientes / total) * 100);
        if (pct > cfg.threshold) activas.push({ ...cfg, id, actual: pct, unidad: '%' });
        break;
      }
      case 'casosSinReporte': {
        const count = ctx.filtered.filter((c) => !c.reporteHistory || c.reporteHistory.length === 0).length;
        if (count > cfg.threshold) activas.push({ ...cfg, id, actual: count, unidad: ' casos' });
        break;
      }
      case 'altaPerdida': {
        const perdida = ctx.filtered.filter((c) => ctx.cats.lost.includes(c.estado)).length;
        const pct = Math.round((perdida / total) * 100);
        if (pct > cfg.threshold) activas.push({ ...cfg, id, actual: pct, unidad: '%' });
        break;
      }
    }
  }
  return activas;
}

// ============================================================
// INSIGHT AUTOMÁTICO
// ============================================================
export function generateInsight(ctx, prevCtx) {
  if (!prevCtx || prevCtx.filtered.length === 0) return null;
  const currConversion = ctx.filtered.length > 0
    ? Math.round((ctx.filtered.filter((c) => ctx.cats.success.includes(c.estado)).length / ctx.filtered.length) * 100)
    : 0;
  const prevConversion = prevCtx.filtered.length > 0
    ? Math.round((prevCtx.filtered.filter((c) => prevCtx.cats.success.includes(c.estado)).length / prevCtx.filtered.length) * 100)
    : 0;
  const diff = currConversion - prevConversion;

  if (Math.abs(diff) < 3) {
    const firmas = ctx.filtered.filter((c) => ctx.cats.success.includes(c.estado)).length;
    return firmas > 0
      ? `Tenés ${firmas} firma${firmas !== 1 ? 's' : ''} en el período actual.`
      : 'Sin firmas en el período actual.';
  }
  const direction = diff > 0 ? 'subió' : 'cayó';
  return `La conversión ${direction} ${Math.abs(diff)}% respecto al período anterior.`;
}
