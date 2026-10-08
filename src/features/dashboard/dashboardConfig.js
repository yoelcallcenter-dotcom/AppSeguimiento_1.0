/**
 * dashboardConfig.js
 * Registro ÚNICO de pestañas y widgets del Dashboard.
 * Lo consumen Dashboard.jsx (rendering) y el editor de Configuración
 * (Apariencia → Vistas) para garantizar consistencia entre el orden
 * editable y lo que realmente se renderiza.
 */

import {
  AlertTriangle, BarChart3, Building2, Calendar, CalendarClock, CircleDot,
  Clock, FileText, LayoutDashboard, ListTodo, MapPin, MessageSquare,
  Sparkles, Target, TrendingUp, Zap,
} from 'lucide-react';

// ============================================================
// TABS
// ============================================================
export const DASH_TAB_MAP = {
  insights: { id: 'insights', label: 'Insights', icon: Sparkles },
  analitica: { id: 'analitica', label: 'Analítica', icon: BarChart3 },
  resumen: { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  rendimiento: { id: 'rendimiento', label: 'Rendimiento', icon: TrendingUp },
  geografia: { id: 'geografia', label: 'Geografía', icon: MapPin },
  estudios: { id: 'estudios', label: 'Estudios', icon: Building2 },
  estados: { id: 'estados', label: 'Estados', icon: CircleDot },
};

export const DEFAULT_DASH_TAB_ORDER = [
  'insights',
  'analitica',
  'resumen',
  'rendimiento',
  'geografia',
  'estudios',
  'estados',
];

// ============================================================
// WIDGETS (orden dinámico por tab)
// ============================================================
export const DASH_WIDGET_REGISTRY = {
  resumen: {
    generalMetrics: { label: 'Metricas generales', defaultOrder: 0, icon: BarChart3 },
    alertBanner: { label: 'Alertas automaticas', defaultOrder: 1, icon: AlertTriangle },
    quickActions: { label: 'Acciones rapidas', defaultOrder: 2, icon: Zap },
    proximasAcciones: { label: 'Proximas acciones', defaultOrder: 3, icon: ListTodo },
    analyticHeader: { label: 'Encabezado analitico', defaultOrder: 4, icon: LayoutDashboard },
    alertsPanel: { label: 'Alertas', defaultOrder: 5, icon: AlertTriangle },
    activityFeed: { label: 'Actividad reciente', defaultOrder: 6, icon: Sparkles },
    eventos: { label: 'Proximos eventos', defaultOrder: 7, icon: Calendar },
    citasProximas: { label: 'Citas proximas', defaultOrder: 8, icon: CalendarClock },
    reprogramaciones: { label: 'Reprogramaciones', defaultOrder: 9, icon: Clock },
    aseguradoras: { label: 'Aseguradoras', defaultOrder: 10, icon: Building2 },
    sinReporte: { label: 'Casos sin reporte', defaultOrder: 11, icon: FileText },
    notas: { label: 'Notas recientes', defaultOrder: 12, icon: MessageSquare },
    resumen: { label: 'Resumen rapido', defaultOrder: 13, icon: Clock },
    ultimosCasos: { label: 'Ultimos casos', defaultOrder: 14, icon: FileText },
    miDia: { label: 'Mi dia', defaultOrder: 15, icon: Target },
    // v1.10.0 (feature A): meta de firmas (día + mes) en Resumen.
    metaFirmas: { label: 'Meta de firmas', defaultOrder: 16, icon: Target },
  },
  rendimiento: {
    perfMetrics: { label: 'Métricas de performance', defaultOrder: 0, icon: BarChart3 },
    timeMetrics: { label: 'Métricas de tiempo', defaultOrder: 1, icon: Clock },
    logroObjetivos: { label: 'Logro de Objetivos', defaultOrder: 2, icon: Target },
    // v1.10.0 (feature E): historial de cumplimiento de metas de los últimos
    // 30 días hábiles (derivado, sin estado nuevo).
    historialMetas: { label: 'Historial de metas (30 días)', defaultOrder: 3, icon: TrendingUp },
  },
  geografia: {
    provinciasTable: { label: 'Tabla de provincias', defaultOrder: 0, icon: MapPin },
    topProvincias: { label: 'Mejores provincias', defaultOrder: 1, icon: MapPin },
    vistaMapa: { label: 'Mapa de casos', defaultOrder: 2, icon: MapPin },
  },
  estudios: {
    estudiosTable: { label: 'Tabla de estudios', defaultOrder: 0, icon: Building2 },
    topEstudios: { label: 'Mejores estudios', defaultOrder: 1, icon: Building2 },
  },
  estados: {
    estadosTable: { label: 'Distribución por estado', defaultOrder: 0, icon: CircleDot },
  },
};

export const DEFAULT_DASH_WIDGET_ORDER = Object.fromEntries(
  Object.entries(DASH_WIDGET_REGISTRY).map(([tab, widgets]) => [
    tab,
    Object.entries(widgets)
      .sort(([, a], [, b]) => a.defaultOrder - b.defaultOrder)
      .map(([id]) => id),
  ])
);

// ============================================================
// HELPERS DE ORDEN (patrón getOrderedMiEspacioKeys)
// Preservan el orden persistido e inyectan las secciones que faltan
// en su posición de default, evitando duplicados y claves inválidas.
// ============================================================
export function getOrderedDashTabOrder(order) {
  const seen = new Set();
  const ordered = [];
  for (const id of Array.isArray(order) ? order : DEFAULT_DASH_TAB_ORDER) {
    if (!DASH_TAB_MAP[id] || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  for (const id of DEFAULT_DASH_TAB_ORDER) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

export function getOrderedDashWidgets(order, tabId) {
  const defaults = DEFAULT_DASH_WIDGET_ORDER[tabId] || [];
  const registry = DASH_WIDGET_REGISTRY[tabId] || {};
  const seen = new Set();
  const ordered = [];
  for (const id of Array.isArray(order) ? order : defaults) {
    if (!registry[id] || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  for (const id of defaults) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}