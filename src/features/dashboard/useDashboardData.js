/**
 * useDashboardData.js
 * Hook central del dashboard: lee casos/notas/eventos de IndexedDB (vía
 * useAppStore, que ya sincroniza entre pestañas) y calcula métricas +
 * insights + actividad reciente con useMemo (sin recalcular por render).
 *
 * v1.10.1 (fix M01): tercer parámetro opcional `casesOverride` — la población
 * YA filtrada por App (casosGlobales: mes vía casoEnMes + días + búsqueda +
 * filtro global + quickFilter). Al recibirla, computeMetrics corre con
 * `poblacionPreFiltrada` y NO re-filtra por isSameMonth(c.fecha), de modo que
 * el widget de métricas, los KPICards y el CSV de Analítica miden sobre la
 * MISMA lista. Sin el parámetro se conserva el comportamiento anterior
 * (lectura del store + filtros), por compatibilidad con cualquier otro
 * consumidor futuro.
 */
import { useMemo } from 'react';
import useAppStore from '../../core/store/useAppStore';
import { computeMetrics, buildActivityFeed } from './computeMetrics';
import { generateInsights } from './insightsEngine';
import { getOperatorProfile, getOperatorAvailability } from '../operator/operatorStore';

export function useDashboardData(filters = {}, config = {}, casesOverride) {
  const storeCases = useAppStore((s) => s.cases);
  const notes = useAppStore((s) => s.notes);
  const events = useAppStore((s) => s.events);

  // Población de métricas: la externa (ya filtrada) o la del store.
  const cases = casesOverride === undefined ? storeCases : casesOverride;
  const poblacionPreFiltrada = casesOverride !== undefined;

  return useMemo(() => {
    const profile = getOperatorProfile() || {};
    const metrics = computeMetrics(cases, filters, config, {
      workingDays: profile.workingDays,
      availability: getOperatorAvailability() || {},
      // v1.10.1 (fix M01): la lista externa ya viene filtrada por App.
      poblacionPreFiltrada,
    });
    const insights = generateInsights(metrics);
    // El feed de actividad es global (no depende del filtro de mes): se sigue
    // calculando sobre los casos del store para no vaciarlo al filtrar.
    const activity = buildActivityFeed(storeCases, notes, events, 15);
    return {
      metrics,
      insights,
      activity,
      totalGlobal: storeCases.length,
      loaded: storeCases.length > 0,
    };
  }, [cases, storeCases, notes, events, filters, config, poblacionPreFiltrada]);
}
