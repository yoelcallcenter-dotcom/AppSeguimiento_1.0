import React, { useMemo, useState, useCallback } from 'react';
import {
  LayoutDashboard, BarChart3, MapPin, Building2, CircleDot,
  Calendar, AlertTriangle, FileText, MessageSquare, Clock, Target, GripVertical, ChevronUp, ChevronDown, X, Sparkles,
  Plus, Upload, Play, Shield, TrendingUp,
} from 'lucide-react';
import { LogroObjetivos } from '../../components/estadisticas/LogroObjetivos';
import { UltimosCasos } from '../../components/estadisticas/UltimosCasos';
import { MiDiaView } from '../../components/estadisticas/MiDiaView';
import { VistaMapa } from '../../components/estadisticas/VistaMapa';
import useAppStore from '../../core/store/useAppStore';
import { useFilters } from '../../context/FiltersContext';
import { trackEvent } from '../../utils/behaviorEngine';
import { MonthDayFilterBar } from '../../components/common/MonthDayFilterBar';
import { MetricCard } from './MetricCard';
import { FunnelChart } from './FunnelChart';
import { ActivityChart } from './ActivityChart';
import { AlertBanner } from './AlertBanner';
import { QuickActions } from './QuickActions';
import { AnalyticHeader } from './AnalyticHeader';
import { SmartTable } from './SmartTable';
import { useDashboardData } from './useDashboardData';
import { computeMetrics as computeDashboardMetrics } from './computeMetrics';
import { sumarPeso } from '../../utils/catalogos';
import { ProductivityWidget } from '../productivity/ProductivityWidget';
import KPICards from './widgets/KPICards';
import CaseDistribution from './widgets/CaseDistribution';
import TimeMetrics from './widgets/TimeMetrics';
import ProvinceBars from './widgets/ProvinceBars';
import StudyBars from './widgets/StudyBars';
import CategoryDonut from './widgets/CategoryDonut';
import TypeBars from './widgets/TypeBars';
import StackedBars from './widgets/StackedBars';
import ConversionBars from './widgets/ConversionBars';
import WeeklyTrend from './widgets/WeeklyTrend';
import AlertsPanel from './widgets/AlertsPanel';
import ActivityFeed from './widgets/ActivityFeed';
import InsightsPanel from './widgets/InsightsPanel';
import ProximasAcciones from './widgets/ProximasAcciones';
import { useAnalytics } from '../analytics/useAnalytics';
import { PERIODO_DEFAULT } from '../analytics/periodUtils';
import PeriodSelector from '../analytics/components/PeriodSelector';
import ResumenPeriodo from '../analytics/components/ResumenPeriodo';
import SmartInsightsPanel from '../analytics/components/SmartInsightsPanel';
import TendenciaSemanalCard from '../analytics/components/TendenciaSemanalCard';
import {
  getOperatorGoals,
  getOperatorProfile,
  getOperatorAvailability,
} from '../operator/operatorStore';
import {
  computeMetrics, computeFunnel, evaluateAlerts, generateInsight,
  groupBy, groupByEstado,
  getMetricDefs, getDefaultCategories, getDefaultAlerts,
} from './metricsEngine';

// ============================================================
// TABS
// ============================================================
const TAB_MAP = {
  analitica: { id: 'analitica', label: 'Analítica', icon: Sparkles },
  resumen: { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  rendimiento: { id: 'rendimiento', label: 'Rendimiento', icon: BarChart3 },
  geografia: { id: 'geografia', label: 'Geografía', icon: MapPin },
  estudios: { id: 'estudios', label: 'Estudios', icon: Building2 },
  estados: { id: 'estados', label: 'Estados', icon: CircleDot },
};

// ============================================================
// WIDGET CARD (interno)
// ============================================================
const TAB_HELP = {
  analitica: 'Panel analítico unificado: KPIs, gráficos de distribución, funnel de conversión y actividad de los últimos 7 días. Filtros globales aplicados.',
  resumen: 'Visión general del pipeline: métricas clave, alertas, actividad reciente, últimos casos, eventos próximos y acciones rápidas.',
  rendimiento: 'Métricas de performance y tiempo, y logro de objetivos mensuales.',
  geografia: 'Distribución geográfica de casos por provincia/localidad con tasas de conversión y mapa de ubicaciones.',
  estudios: 'Desempeño de estudios jurídicos: casos asignados, firmas, tasas de conversión y pérdida.',
  estados: 'Distribución de casos por estado del pipeline.',
};

// ============================================================
// WIDGET REGISTRY (orden dinámico por tab)
// ============================================================
const WIDGET_REGISTRY = {
  resumen: {
    generalMetrics: { label: 'Métricas generales', defaultOrder: 0 },
    alertBanner: { label: 'Alertas automáticas', defaultOrder: 1 },
    quickActions: { label: 'Acciones rápidas', defaultOrder: 2 },
    proximasAcciones: { label: 'Próximas acciones', defaultOrder: 3 },
    analyticHeader: { label: 'Encabezado analítico', defaultOrder: 4 },
    alertsPanel: { label: 'Alertas', defaultOrder: 5 },
    activityFeed: { label: 'Actividad reciente', defaultOrder: 6 },
    eventos: { label: 'Próximos eventos', defaultOrder: 7 },
    sinReporte: { label: 'Casos sin reporte', defaultOrder: 8 },
    notas: { label: 'Notas recientes', defaultOrder: 9 },
    resumen: { label: 'Resumen rápido', defaultOrder: 10 },
    ultimosCasos: { label: 'Últimos casos', defaultOrder: 11 },
    miDia: { label: 'Mi día', defaultOrder: 12 },
  },
  rendimiento: {
    perfMetrics: { label: 'Métricas de performance', defaultOrder: 0 },
    timeMetrics: { label: 'Métricas de tiempo', defaultOrder: 1 },
    logroObjetivos: { label: 'Logro de Objetivos', defaultOrder: 2 },
  },
  geografia: {
    provinciasTable: { label: 'Tabla de provincias', defaultOrder: 0 },
    topProvincias: { label: 'Mejores provincias', defaultOrder: 1 },
    vistaMapa: { label: 'Mapa de casos', defaultOrder: 2 },
  },
  estudios: {
    estudiosTable: { label: 'Tabla de estudios', defaultOrder: 0 },
    topEstudios: { label: 'Mejores estudios', defaultOrder: 1 },
  },
  estados: {
    estadosTable: { label: 'Distribución por estado', defaultOrder: 0 },
  },
};

const DEFAULT_WIDGET_ORDER = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([tab, widgets]) => [
    tab,
    Object.entries(widgets)
      .sort(([, a], [, b]) => a.defaultOrder - b.defaultOrder)
      .map(([id]) => id),
  ])
);

const WidgetCard = React.memo(({ title, icon: Icon, children }) => (
  <div className="rounded-xl p-5 animate-fade-in" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
    <div className="flex items-center gap-2 mb-4">
      <Icon size={18} style={{ color: 'var(--color-accent)' }} />
      <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{title}</span>
    </div>
    {children}
  </div>
));

const RecentItem = React.memo(({ icon: Icon, title, subtitle, color }) => (
  <div className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface2)' }}>
    <Icon size={16} style={{ color: color || 'var(--color-text-muted)', flexShrink: 0 }} />
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{title}</div>
      <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</div>
    </div>
  </div>
));

// ============================================================
// MAIN
// ============================================================
function Dashboard({ config, casos = [], casosMes, mesesDisponibles = [], onVerCaso, onNuevoCaso, onImportarCSV, onTour }) {
  const allCases = useAppStore((s) => s.cases);
  const notes = useAppStore((s) => s.notes);
  const events = useAppStore((s) => s.events);

  const activeFilter = useAppStore((s) => s.dashActiveFilter);
  const setActiveFilter = useAppStore((s) => s.setDashActiveFilter);
  const tab = useAppStore((s) => s.dashTab);
  const setTab = useAppStore((s) => s.setDashTab);
  const tabOrder = useAppStore((s) => s.dashTabOrder);
  const setTabOrder = useAppStore((s) => s.setDashTabOrder);
  const dashWidgetOrder = useAppStore((s) => s.dashWidgetOrder);
  const setDashWidgetOrder = useAppStore((s) => s.setDashWidgetOrder);

  const [activityDay, setActivityDay] = useState(null);

  // Filtro global de mes/día (compartido con Kanban, Tabla y Reportes) + drill-down.
  const {
    selectedMonth, selectedYear, selectedDays,
    setSelectedView, setSearchQuery, setQuickFilter,
  } = useFilters();

  const handleDrill = useCallback((f) => {
    if (!f) return;
    trackEvent("DASHBOARD_DRILL");
    setQuickFilter(f);
    setSearchQuery('');
    setSelectedView('tabla');
  }, [setQuickFilter, setSearchQuery, setSelectedView]);

  // Drill-down de las tarjetas de métricas (misma lógica que las KPIs de Analítica).
  const drillDeMetrica = useCallback((m) => {
    const mapa = {
      totalCasos: { tipo: 'grupo', valor: 'todos' },
      firmas: { tipo: 'grupo', valor: 'firmas' },
      pendientes: { tipo: 'grupo', valor: 'pendientes' },
      noResponden: { tipo: 'grupo', valor: 'sinrespuesta' },
      perdidos: { tipo: 'grupo', valor: 'perdidos' },
      sinReporte: { tipo: 'grupo', valor: 'sinreporte' },
      tasaConversion: { tipo: 'grupo', valor: 'firmas' },
      tasaContacto: { tipo: 'grupo', valor: 'pendientes' },
      tasaPerdida: { tipo: 'grupo', valor: 'perdidos' },
      tasaCierre: { tipo: 'grupo', valor: 'firmas' },
      tiempoPromedioFirma: { tipo: 'grupo', valor: 'firmas' },
    };
    const drill = mapa[m?.id];
    if (!drill) return;
    if (drill.valor === 'todos') {
      setQuickFilter(null);
      setSelectedView('tabla');
      return;
    }
    handleDrill(drill);
  }, [handleDrill, setQuickFilter, setSelectedView]);

  const metricsCfg = config?.metrics || {};
  const cats = { ...getDefaultCategories(), ...(metricsCfg.categorias || {}) };
  const visibleMetrics = metricsCfg.visible || Object.keys(getMetricDefs());
  const alertas = metricsCfg.alertas || getDefaultAlerts();

  const showWidget = (key) => config?.[key] !== false;

  const handleGlobalMonthChange = useCallback(() => {
    setActiveFilter(null);
  }, [setActiveFilter]);

  // Datos analíticos (memoizados) usando los mismos filtros globales.
  const mesAnalitica = selectedMonth >= 0 && selectedYear >= 0
    ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
    : 'todos';
  const selectedDayISO = useMemo(() => {
    if (selectedDays.length === 1 && selectedMonth >= 0 && selectedYear >= 0) {
      const d = Number(selectedDays[0]);
      if (d >= 1 && d <= 31) {
        return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return null;
  }, [selectedDays, selectedMonth, selectedYear]);
  const filtrosAnalitica = useMemo(
    () => ({ mes: mesAnalitica, dias: selectedDays.length > 0 ? selectedDays : undefined }),
    [mesAnalitica, selectedDays]
  );
  const { metrics: analyticsMetrics, insights: analyticsInsights, activity } = useDashboardData(filtrosAnalitica, config);

  // ============================================================
  // INSIGHTS Y ANALÍTICA PERSONAL (1.3.2)
  // Selector de período propio de esta capa + datos de Mi Espacio.
  // ============================================================
  const [periodoId, setPeriodoId] = useState(() => {
    try {
      return localStorage.getItem('app_analytics_period') || PERIODO_DEFAULT;
    } catch {
      return PERIODO_DEFAULT;
    }
  });
  const cambiarPeriodo = useCallback((id) => {
    setPeriodoId(id);
    try { localStorage.setItem('app_analytics_period', id); } catch {}
  }, []);
  const operatorData = useMemo(
    () => ({
      goals: getOperatorGoals(),
      profile: getOperatorProfile(),
      availability: getOperatorAvailability(),
    }),
    []
  );
  const analitica = useAnalytics(allCases, config, periodoId, operatorData);

  // ============================================================
  // FILTRADO (casos ya filtrados por mes/día desde App)
  // ============================================================
  const filteredCases = useMemo(() => {
    if (!activeFilter) return casos;
    const actions = {
      pendientes: (c) => cats.contact.includes(c.estado),
      firmas: (c) => cats.success.includes(c.estado),
      perdidos: (c) => cats.lost.includes(c.estado),
      sinReporte: (c) => !c.reporteHistory || c.reporteHistory.length === 0,
    };
    const fn = actions[activeFilter];
    if (!fn) return casos;
    return casos.filter((c) => fn(c));
  }, [casos, activeFilter, cats]);

  const ctx = useMemo(() => ({ filtered: filteredCases, cats }), [filteredCases, cats]);

  // ============================================================
  // PERIODO ANTERIOR (para insight)
  // ============================================================
  const prevCtx = useMemo(() => {
    const today = new Date();
    const prevEnd = new Date(today);
    prevEnd.setDate(prevEnd.getDate() - 8);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 30);
    const prev = allCases.filter((c) => {
      if (!c.fecha) return false;
      const d = new Date(c.fecha);
      return d >= prevStart && d <= prevEnd;
    });
    return { filtered: prev, cats };
  }, [allCases, cats]);

  const prevMetrics = useMemo(
    () => (prevCtx.filtered.length > 0 ? computeDashboardMetrics(prevCtx.filtered, {}, config) : null),
    [prevCtx, config]
  );

  // ============================================================
  // CÓMPUTOS
  // ============================================================
  const metrics = useMemo(() => computeMetrics(ctx, visibleMetrics), [ctx, visibleMetrics]);
  const funnel = useMemo(() => (showWidget('widgetFunnel') ? computeFunnel(ctx) : []), [ctx, showWidget]);
  const alerts = useMemo(() => evaluateAlerts(ctx, alertas), [ctx, alertas]);
  const insight = useMemo(() => generateInsight(ctx, prevCtx), [ctx, prevCtx]);
  const metricValues = useMemo(() => Object.values(metrics), [metrics]);

  // Agrupaciones
  const provincias = useMemo(() => {
    const map = {};
    for (const c of ctx.filtered) {
      const key = (c.provincia || 'Sin provincia').trim() || 'Sin provincia';
      if (!map[key]) map[key] = { key, total: 0, success: 0, contact: 0, lost: 0, pending: 0 };
      map[key].total++;
      if      (cats.success.includes(c.estado)) map[key].success++;
      else if (cats.contact.includes(c.estado)) map[key].contact++;
      else if (cats.lost.includes(c.estado))    map[key].lost++;
      else if (cats.pending.includes(c.estado)) map[key].pending++;
    }
    return Object.values(map)
      .map(g => ({ ...g, conversion: g.total > 0 ? Math.round((g.success / g.total) * 100) : 0, perdida: g.total > 0 ? Math.round((g.lost / g.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [ctx, cats]);
  const estudios = useMemo(() => groupBy(ctx, 'estudioJuridico', cats).slice(0, 15), [ctx, cats]);
  const estadosGroup = useMemo(() => groupByEstado(ctx, cats), [ctx, cats]);

  const columnsProvEst = [
    { key: 'key', label: 'Nombre', bold: true },
    { key: 'total', label: 'Casos', format: 'number' },
    { key: 'success', label: 'Firmas', format: 'number' },
    { key: 'conversion', label: 'Conv.', format: 'percentage' },
    { key: 'perdida', label: 'Pérdida', format: 'percentage', colorFn: (r) => r.perdida > 50 ? 'var(--color-danger)' : 'var(--color-text)' },
  ];

  const columnsEstados = [
    { key: 'estado', label: 'Estado', bold: true },
    { key: 'count', label: 'Casos', format: 'number' },
  ];

  // ============================================================
  // WIDGETS COMUNES
  // ============================================================
  const upcomingEvents = useMemo(() => {
    if (!showWidget('widgetEventos')) return [];
    const today = new Date();
    return events
      .filter((e) => new Date(e.startDate || e.fecha) >= today)
      .sort((a, b) => new Date(a.startDate || a.fecha) - new Date(b.startDate || b.fecha))
      .slice(0, 5);
  }, [events, showWidget]);

  const sinReporte = useMemo(() => {
    if (!showWidget('widgetSinReporte')) return [];
    return filteredCases.filter((c) => !c.reporteHistory || c.reporteHistory.length === 0).slice(0, 5);
  }, [filteredCases, showWidget]);

  const recentNotes = useMemo(() => {
    if (!showWidget('widgetNotas')) return [];
    return [...notes].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)).slice(0, 5);
  }, [notes, showWidget]);

  const handleFilter = useCallback((id) => {
    setActiveFilter(id);
    setActivityDay(null);
  }, [setActiveFilter, setActivityDay]);

  // Widget order por tab (desde config, con fallback a DEFAULT_WIDGET_ORDER)
  const activeWidgetOrder = useMemo(() => {
    const saved = dashWidgetOrder || {};
    const result = {};
    for (const tabId of Object.keys(DEFAULT_WIDGET_ORDER)) {
      const valid = new Set(DEFAULT_WIDGET_ORDER[tabId]);
      const savedOrder = (saved[tabId] || []).filter((id) => valid.has(id));
      result[tabId] = savedOrder.length ? savedOrder : DEFAULT_WIDGET_ORDER[tabId];
    }
    return result;
  }, [dashWidgetOrder]);

  // Renderiza un widget por su ID para el tab activo
  const renderWidget = useCallback((widgetId) => {
    switch (widgetId) {
      case 'alertBanner':
        return <AlertBanner key="alertBanner" alerts={alerts} />;
      case 'quickActions':
        return showWidget('widgetQuickActions') && casos.length > 0
          ? <QuickActions key="quickActions" casos={casos} categorias={cats} onFilter={handleFilter} activeFilter={activeFilter} />
          : null;
      case 'analyticHeader':
        return <AnalyticHeader key="analyticHeader" metrics={metrics} filteredCases={filteredCases} insight={insight} />;
      case 'generalMetrics':
        return metricValues.length > 0 ? (
          <div key="generalMetrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {metricValues.filter((m) => m.group === 'general').map((m) => (
              <MetricCard key={m.id} metric={m} onDrill={drillDeMetrica} />
            ))}
          </div>
        ) : null;
      case 'alertsPanel':
        return <AlertsPanel key="alertsPanel" metrics={analyticsMetrics} cases={allCases} notes={notes} events={events} onDrill={handleDrill} onVerCaso={onVerCaso} />;
      case 'proximasAcciones':
        return <ProximasAcciones key="proximasAcciones" cases={allCases} notes={notes} events={events} onVerCaso={onVerCaso} onNavigateToEvent={(e) => {}} onNavigateFiltered={handleDrill} />;
      case 'activityFeed':
        return <ActivityFeed key="activityFeed" items={activity} onSelectItem={(item) => {
          if (item.type === 'case' && item.caseId) {
            const caso = casos.find((c) => String(c.id) === String(item.caseId));
            if (caso) onVerCaso(caso);
          }
        }} />;
      case 'eventos':
        return showWidget('widgetEventos') ? (
          <WidgetCard key="eventos" title="Próximos eventos" icon={Calendar}>
            {upcomingEvents.length === 0
              ? <EmptyState msg="Sin eventos próximos" />
              : upcomingEvents.map((e) => (
                  <RecentItem key={e.id} title={e.titulo || e.title || 'Evento'} subtitle={e.startDate || e.fecha || ''} icon={Calendar} color="var(--color-accent)" />
                ))}
          </WidgetCard>
        ) : null;
      case 'sinReporte':
        return showWidget('widgetSinReporte') ? (
          <WidgetCard key="sinReporte" title="Casos sin reporte" icon={AlertTriangle}>
            {sinReporte.length === 0
              ? <EmptyState msg="Todos tienen reporte" />
              : sinReporte.map((c) => (
                  <RecentItem key={c.id} title={c.nombre || 'Sin nombre'} subtitle={`${c.estado || '—'} | ${c.fecha || '—'}`} icon={FileText} color="var(--color-danger)" />
                ))}
          </WidgetCard>
        ) : null;
      case 'notas':
        return showWidget('widgetNotas') ? (
          <WidgetCard key="notas" title="Notas recientes" icon={MessageSquare}>
            {recentNotes.length === 0
              ? <EmptyState msg="Sin notas recientes" />
              : recentNotes.map((n) => (
                  <RecentItem key={n.id} title={n.title || 'Sin título'} subtitle={new Date(n.updatedAt || n.createdAt || '').toLocaleDateString()} icon={MessageSquare} color="var(--color-success)" />
                ))}
          </WidgetCard>
        ) : null;
      case 'resumen':
        return showWidget('widgetResumen') ? (
          <WidgetCard key="resumen" title="Resumen rápido" icon={Clock}>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--color-text-muted)' }}>Total casos</span><b style={{ color: 'var(--color-text)' }}>{filteredCases.length}</b></div>
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--color-text-muted)' }}>Total ponderado</span><b style={{ color: 'var(--color-accent)' }}>{sumarPeso(config, filteredCases)}</b></div>
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--color-text-muted)' }}>Total notas</span><b style={{ color: 'var(--color-text)' }}>{notes.length}</b></div>
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--color-text-muted)' }}>Total eventos</span><b style={{ color: 'var(--color-text)' }}>{events.length}</b></div>
            </div>
          </WidgetCard>
        ) : null;
      case 'ultimosCasos':
        return showWidget('widgetUltimosCasos') ? (
          <WidgetCard key="ultimosCasos" title="Últimos casos" icon={FileText}>
            <UltimosCasos casos={allCases} onVerCaso={onVerCaso} limite={5} />
          </WidgetCard>
        ) : null;
      case 'miDia':
        return showWidget('widgetMiDia') ? (
          <WidgetCard key="miDia" title="Mi día" icon={Target}>
            <MiDiaView casos={allCases} onVerCaso={onVerCaso} />
          </WidgetCard>
        ) : null;
      case 'perfMetrics':
        return metricValues.filter((m) => m.group === 'performance').length > 0 ? (
          <div key="perfMetrics">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Performance</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {metricValues.filter((m) => m.group === 'performance').map((m) => (
                <MetricCard key={m.id} metric={m} onDrill={drillDeMetrica} />
              ))}
            </div>
          </div>
        ) : null;
      case 'timeMetrics':
        return metricValues.filter((m) => m.group === 'time').length > 0 ? (
          <div key="timeMetrics">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Tiempo</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {metricValues.filter((m) => m.group === 'time').map((m) => (
                <MetricCard key={m.id} metric={m} onDrill={drillDeMetrica} />
              ))}
            </div>
          </div>
        ) : null;
      case 'logroObjetivos':
        return showWidget('widgetLogroObjetivos') ? (
          <WidgetCard key="logroObjetivos" title="Logro de Objetivos" icon={Target}>
            <LogroObjetivos casos={allCases} onVerCaso={onVerCaso} showHeader={false} />
          </WidgetCard>
        ) : null;
      case 'provinciasTable':
        return <SmartTable key="provinciasTable" title="Provincias" icon={MapPin} columns={columnsProvEst} data={provincias} />;
      case 'topProvincias':
        return provincias.length > 0 ? (
          <div key="topProvincias" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {provincias.slice(0, 6).map((p) => (
              <MetricCard key={p.key} metric={{ id: p.key, label: p.key, value: p.conversion, format: 'percentage' }} onDrill={() => handleDrill({ tipo: 'provincia', valor: p.key })} />
            ))}
          </div>
        ) : null;
      case 'vistaMapa':
        return showWidget('widgetVistaMapa') ? (
          <WidgetCard key="vistaMapa" title="Mapa de casos" icon={MapPin}>
            <VistaMapa casos={allCases} onVerCaso={onVerCaso} />
          </WidgetCard>
        ) : null;
      case 'estudiosTable':
        return <SmartTable key="estudiosTable" title="Estudios jurídicos" icon={Building2} columns={columnsProvEst} data={estudios} />;
      case 'topEstudios':
        return estudios.length > 0 ? (
          <div key="topEstudios" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {estudios.slice(0, 6).map((e) => (
              <MetricCard key={e.key} metric={{ id: e.key, label: e.key, value: e.conversion, format: 'percentage' }} onDrill={() => handleDrill({ tipo: 'estudioJuridico', valor: e.key })} />
            ))}
          </div>
        ) : null;
      case 'estadosTable':
        return (
          <SmartTable key="estadosTable" title="Distribución por estado" icon={CircleDot} columns={columnsEstados} data={estadosGroup} />
        );
      default:
        return null;
    }
   }, [
    alerts, showWidget, casos, cats, handleFilter, activeFilter,
    metrics, filteredCases, insight, metricValues, allCases,
    upcomingEvents, sinReporte, recentNotes,
    notes, events, onVerCaso, provincias, estudios, estadosGroup,
    drillDeMetrica, analyticsMetrics, activity, handleDrill,
  ]);

  return (
    <div>
      {allCases.length === 0 && (
        <OnboardingEmptyState onNuevoCaso={onNuevoCaso} onImportarCSV={onImportarCSV} onTour={onTour} />
      )}
      {/* ============================================================ */}
      {/* FILTROS + CONFIG */}
      {/* ============================================================ */}
      <MonthDayFilterBar
        mesesDisponibles={mesesDisponibles}
        total={casos.length}
        casos={casos}
        casosMes={casosMes}
        onMonthChange={handleGlobalMonthChange}
      />

      {/* ============================================================ */}
      {/* TABS */}
      {/* ============================================================ */}
      <div
        className="flex items-center gap-1 mb-4 pb-1 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {tabOrder.map((id) => {
          const t = TAB_MAP[id];
          if (!t) return null;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap"
              style={{
                color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* TAB CONTENT */}
      {/* ============================================================ */}
      {tab === 'analitica' ? (
        <div className="space-y-4" key="analitica">
          {/* ============================================================ */}
          {/* INSIGHTS Y ANALÍTICA PERSONAL (período propio, 1.3.2) */}
          {/* ============================================================ */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              <Sparkles size={13} style={{ color: 'var(--color-accent)' }} />
              Insights y analítica personal
            </div>
            <PeriodSelector value={periodoId} onChange={cambiarPeriodo} />
          </div>
          <SmartInsightsPanel estadoVacio={analitica.estadoVacio} insights={analitica.insights} />
          <ResumenPeriodo resumen={analitica.resumen} />
          <TendenciaSemanalCard tendencia={analitica.tendencia} periodoLabel={analitica.resumen?.periodo} />

          <div className="text-[10px] pt-2" style={{ color: 'var(--color-text-muted)' }}>
            Las métricas de arriba usan su propio selector de período. Los KPIs y gráficos siguientes responden al filtro global de mes/día.
          </div>

          <KPICards metrics={analyticsMetrics} onDrill={handleDrill} prevMetrics={prevMetrics} />
          <InsightsPanel insights={analyticsInsights} onDrill={handleDrill} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CaseDistribution data={analyticsMetrics.byStatus} onDrill={handleDrill} />
            <CategoryDonut data={analyticsMetrics.byCategory} onDrill={handleDrill} />
            <TimeMetrics data={analyticsMetrics.seriesByDay} />
            <WeeklyTrend data={analyticsMetrics.weeklySeries} />
            <StackedBars
              data={analyticsMetrics.byAseguradora}
              title="Casos por aseguradora"
              icon={Shield}
              onDrill={handleDrill}
              drillField="aseguradora"
              desc="Distribución de casos por aseguradora con el desglose por categoría del pipeline (firmados, en contacto, pendientes y perdidos). Haz clic en una barra para filtrar la tabla."
            />
            <StackedBars
              data={analyticsMetrics.byLocalidad}
              title="Casos por localidad"
              icon={MapPin}
              onDrill={handleDrill}
              drillField="localidad"
              desc="Distribución de casos por localidad con el desglose por categoría del pipeline. Haz clic en una barra para filtrar la tabla."
            />
            <ConversionBars
              data={analyticsMetrics.byStudy}
              title="Conversión por estudio"
              icon={TrendingUp}
              onDrill={handleDrill}
              drillField="estudioJuridico"
              desc="Compara la tasa de conversión de cada estudio jurídico: verde (50% o más), ámbar (25% a 49%) o rojo (menos de 25%). Haz clic en una barra para filtrar la tabla."
            />
            <TypeBars data={analyticsMetrics.byType} onDrill={handleDrill} />
            <ProvinceBars data={analyticsMetrics.byProvince} onDrill={handleDrill} />
            <StudyBars data={analyticsMetrics.byStudy} onDrill={handleDrill} />
            {showWidget('widgetFunnel') && <FunnelChart funnel={funnel} />}
            {showWidget('widgetActividad') && (
              <ActivityChart cases={allCases} selectedDay={activityDay} onSelectDay={setActivityDay} />
            )}
          </div>
          <ProductivityWidget onOpenCaso={onVerCaso} onChangeView={setTab} dayISO={selectedDayISO} />
        </div>
      ) : (
      activeWidgetOrder[tab] && (
        <div className="space-y-4" key={tab}>
          {(() => {
            const order = activeWidgetOrder[tab];
            const cardIds = ['alertsPanel', 'activityFeed', 'eventos', 'sinReporte', 'notas', 'resumen', 'ultimosCasos', 'miDia'];
            const rendered = [];
            let pendingCards = [];
            for (const widgetId of order) {
              if (cardIds.includes(widgetId)) {
                const w = renderWidget(widgetId);
                if (w !== null) pendingCards.push(w);
              } else {
                // Flush pending cards before non-card widget
                if (pendingCards.length > 0) {
                  rendered.push(
                    <div key="cardGrid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                      {pendingCards}
                    </div>
                  );
                  pendingCards = [];
                }
                const w = renderWidget(widgetId);
                if (w !== null) rendered.push(w);
              }
            }
            // Flush remaining cards
            if (pendingCards.length > 0) {
              rendered.push(
                <div key="cardGrid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                  {pendingCards}
                </div>
              );
            }
            return rendered;
          })()}
        </div>
      ))}


    </div>
  );
}

const EmptyState = React.memo(({ msg }) => (
  <div className="text-sm py-6 text-center" style={{ color: 'var(--color-text-muted)' }}>{msg}</div>
));

const OnboardingEmptyState = React.memo(({ onNuevoCaso, onImportarCSV, onTour }) => (
  <div
    className="mb-4 rounded-xl p-6 sm:p-8 text-center"
    style={{
      backgroundColor: 'var(--color-surface2)',
      border: '2px dashed var(--color-accent)',
    }}
  >
    <div className="text-base sm:text-lg font-bold mb-1" style={{ color: 'var(--color-text)' }}>
      Bienvenido a AppSeguimientoART
    </div>
    <div className="text-xs sm:text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
      Todavía no hay casos cargados. Empezá creando tu primer caso, importá datos existentes o mirá el tour guiado.
    </div>
    <div className="flex flex-wrap items-center justify-center gap-3">
      {onNuevoCaso && (
        <button
          onClick={onNuevoCaso}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg transition-opacity hover:opacity-85"
          style={{ backgroundColor: 'var(--color-accent)', color: '#14181F' }}
        >
          <Plus size={15} /> Crear primer caso
        </button>
      )}
      {onImportarCSV && (
        <button
          onClick={onImportarCSV}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg transition-opacity hover:opacity-85"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          <Upload size={15} /> Importar CSV
        </button>
      )}
      {onTour && (
        <button
          onClick={onTour}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg transition-opacity hover:opacity-85"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          <Play size={15} /> Ver tour guiado
        </button>
      )}
    </div>
  </div>
));

export default React.memo(Dashboard);
