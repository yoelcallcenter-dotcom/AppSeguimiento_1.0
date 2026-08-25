/**
 * useDashboardData.js
 * Hook central del dashboard: lee casos/notas/eventos de IndexedDB (vía
 * useAppStore, que ya sincroniza entre pestañas) y calcula métricas +
 * insights + actividad reciente con useMemo (sin recalcular por render).
 */

import { useMemo } from 'react';
import useAppStore from '../../core/store/useAppStore';
import { computeMetrics, buildActivityFeed } from './computeMetrics';
import { generateInsights } from './insightsEngine';

export function useDashboardData(filters = {}, config = {}) {
  const cases = useAppStore((s) => s.cases);
  const notes = useAppStore((s) => s.notes);
  const events = useAppStore((s) => s.events);

  return useMemo(() => {
    const metrics = computeMetrics(cases, filters, config);
    const insights = generateInsights(metrics);
    const activity = buildActivityFeed(cases, notes, events, 15);
    return {
      metrics,
      insights,
      activity,
      totalGlobal: cases.length,
      loaded: cases.length > 0,
    };
  }, [cases, notes, events, filters, config]);
}
