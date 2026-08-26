/**
 * useAnalytics.js
 * Hook central de la capa de Insights (Release 1.3.2).
 * Ejecuta toda la cadena analítica en una única cadena de useMemo:
 * casos + período → resumen, tendencia, patrones, grupos, objetivos e insights.
 * Nada derivado se persiste: todo se recalcula desde los datos reales.
 */

import { useMemo } from 'react';
import { getPeriodRange } from './periodUtils';
import {
  computeResumenPeriodo,
  computeTendenciaSemanal,
  computeFranjasHorarias,
  rendimientoPorGrupo,
  promedioPersonalReciente,
  casosSinSeguimiento,
  proyeccionObjetivos,
} from './analyticsEngine';
import { generarInsightsAnaliticos } from './smartInsights';
import { PERIODO_DEFAULT } from './periodUtils';

/**
 * @param {Array} allCases todos los casos (IndexedDB vía useAppStore/useCases).
 * @param {object} config configuración global (config-art-tracker).
 * @param {string} periodoId id del selector de período.
 * @param {object} operator { goals, profile, availability } de Mi Espacio.
 */
export function useAnalytics(allCases = [], config = {}, periodoId = PERIODO_DEFAULT, operator = {}) {
  return useMemo(() => {
    const rango = getPeriodRange(periodoId);
    const workingDays =
      operator.profile?.workingDays?.length > 0 ? operator.profile.workingDays : [1, 2, 3, 4, 5];

    const resumen = computeResumenPeriodo(allCases, rango, workingDays, config);
    const tendencia = computeTendenciaSemanal(allCases, config);
    const horas = computeFranjasHorarias(allCases, rango);
    const aseguradoras = rendimientoPorGrupo(allCases, rango, 'aseguradora', config);
    const estudios = rendimientoPorGrupo(allCases, rango, 'estudioJuridico', config);
    const sinSeguimientoCount = casosSinSeguimiento(allCases, config).length;
    const promedioPersonal = promedioPersonalReciente(allCases, config);

    let proyeccion = null;
    if (operator.goals && Object.keys(operator.goals).length > 0) {
      try {
        proyeccion = proyeccionObjetivos({
          goals: operator.goals,
          casos: allCases,
          profile: operator.profile || {},
          availability: operator.availability || {},
          year: new Date().getFullYear(),
          month: new Date().getMonth(),
          todayISO: new Date().toISOString().slice(0, 10),
          workingDays,
        });
      } catch {
        proyeccion = null;
      }
    }

    const { estadoVacio, insights } = generarInsightsAnaliticos({
      totalCasos: allCases.length,
      resumen,
      tendencia,
      horas,
      aseguradoras,
      estudios,
      sinSeguimientoCount,
      promedioPersonal,
      proyeccion,
    });

    return {
      periodo: rango,
      resumen,
      tendencia,
      horas,
      aseguradoras,
      estudios,
      proyeccion,
      insights,
      estadoVacio,
    };
  }, [allCases, config, periodoId, operator]);
}
