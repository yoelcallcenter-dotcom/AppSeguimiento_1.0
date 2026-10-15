/**
 * metricsParity.test.js (1.10.1 · auditoría M01/M21/M22/M25)
 *
 * Los mismos rótulos del Dashboard medían cosas distintas porque convivían
 * varios motores con poblaciones y fórmulas propias. Este test fija 12 casos y
 * exige PARIDAD entre motores:
 *
 *  (1) M01 — "Casos totales" del widget (metricsEngine sobre ctx.filtered) ===
 *      total de KPICards/CSV (computeMetrics.js). Ambos reciben la MISMA
 *      población: la de App (casoEnMes = creación O último reporte + filtros),
 *      reconstruida aquí con el helper real casoEnMes; computeMetrics corre con
 *      `poblacionPreFiltrada` (el flag de fix M01) para NO re-filtrar por
 *      isSameMonth(c.fecha), que excluía los casos que entraban al mes solo por
 *      su último reporte (p.ej. c2, creada en agosto y reportada en septiembre).
 *  (2) M21 — "Tasa de cierre" idéntica en ambos motores y = fórmula canónica
 *      (firmas + perdidos) / total. La razón vieja del widget
 *      (firmas / contactados) quedó como métrica "tasaContactados" con rótulo
 *      propio ("Conversión s/ contactados") y NO se llama "Tasa de cierre".
 *  (3) M22 — "Activos" igual en quickFilter (drill), computeMetrics (KPI) y
 *      aplicarBusquedaFiltro (filtro de búsqueda), vía el helper único
 *      esActivo = estado ∈ categorías contact ∪ pending. Se cruza además con
 *      el widget: pendientes(contact) + noResponden(pending) === activos.
 *  (4) M25 — firmas del mes por fecha de firma coinciden entre LogroObjetivos
 *      (contarFirmasPeriodo) y las metas de Mi Espacio (getMonthlyGoalProgress
 *      → countSignedInMonth), ambas vía esFirmaEnPeriodo. Se documenta además
 *      la diferencia INTENCIONAL con el KPI "Firmas": el KPI es un estado
 *      instantáneo (estado ∈ success) y las metas son hechos del período
 *      (fechaFirma → fallback último reporte solo si estado Firmo).
 *
 * Población esperada en septiembre/2026: 11 de 12 (c9 queda fuera: creada en
 * julio y su último reporte cae en octubre).
 */
import { describe, it, expect } from 'vitest';

import {
  computeMetrics as widgetComputeMetrics, // metricsEngine (widget del Dashboard)
  CATEGORIAS_DEFAULT,
} from './metricsEngine';
import { computeMetrics as kpiComputeMetrics } from './computeMetrics'; // KPICards/CSV
import {
  aplicarQuickFilter,
  aplicarBusquedaFiltro,
} from '../../utils/filtrarQuickFilter';
import { casoEnMes } from '../../utils/dateFilters';
import { contarFirmasPeriodo } from '../../components/estadisticas/LogroObjetivos';
import { getMonthlyGoalProgress } from '../operator/operatorMetrics';

// Mes de prueba: septiembre 2026 (month 0-based = 8).
const YEAR = 2026;
const MONTH = 8; // 0-based → septiembre
const MES_ISO = '2026-09';

const caso = (over = {}) => ({
  id: 'x',
  nombre: 'CASO TEST',
  telefono: '261 555-0000',
  localidad: 'MENDOZA',
  provincia: 'MENDOZA',
  aseguradora: 'SANCOR',
  estudioJuridico: 'Estudio Demo',
  tipoIngreso: 'Accidente',
  estado: 'Pendiente',
  fecha: '2026-09-01',
  reporteHistory: [],
  ...over,
});

// 12 casos fijos (mezcla pedida por la auditoría):
// firmo, baja, pendiente, contacto, perdidos, sin reporte, distintos meses y
// UNA fecha legada DD/MM/YYYY.
const CASOS = [
  // 1 · Firmo en septiembre con fechaFirma ISO → KPI y meta lo cuentan.
  caso({ id: 'c1', estado: 'Firmo', fecha: '2026-09-02', fechaFirma: '2026-09-05', reporteHistory: [{ fecha: '2026-09-05' }] }),
  // 2 · CREADA en agosto pero reportada/firmada en septiembre → entra al mes
  //     por casoEnMes (último reporte). Sin el fix M01 la excluía el KPI.
  caso({ id: 'c2', estado: 'Firmo', fecha: '2026-08-25', fechaFirma: '2026-09-10', reporteHistory: [{ fecha: '2026-09-10' }] }),
  // 3 · Baja de septiembre: cuenta como perdido en el KPI, NO resta firmas.
  caso({ id: 'c3', estado: 'Baja', fecha: '2026-09-08', reporteHistory: [{ fecha: '2026-09-08' }] }),
  // 4 · Pendiente sin reporte (activo, sin reporteHistory).
  caso({ id: 'c4', estado: 'Pendiente', fecha: '2026-09-09' }),
  // 5 · Contacto con FECHA LEGADA DD/MM/YYYY → debe entrar al mes igual.
  caso({ id: 'c5', estado: 'Cita virtual', fecha: '15/09/2026', reporteHistory: [{ fecha: '2026-09-15' }] }),
  // 6 · Pending (sin respuesta) — activo.
  caso({ id: 'c6', estado: 'No responde', fecha: '2026-09-16' }),
  // 7 · Perdido (No viable) — cerrado.
  caso({ id: 'c7', estado: 'No viable', fecha: '2026-09-17' }),
  // 8 · Contacto — activo.
  caso({ id: 'c8', estado: 'Lo piensa', fecha: '2026-09-18' }),
  // 9 · FUERA de septiembre: creada en julio, último reporte en octubre.
  caso({ id: 'c9', estado: 'Firmo', fecha: '2026-07-05', fechaFirma: '2026-10-02', reporteHistory: [{ fecha: '2026-10-02' }] }),
  // 10 · Pending (Reprogramado) — activo, con reporte.
  caso({ id: 'c10', estado: 'Reprogramado', fecha: '2026-09-21', reporteHistory: [{ fecha: '2026-09-21' }] }),
  // 11 · Contacto (2do Llamado) — activo, con reporte.
  caso({ id: 'c11', estado: '2do Llamado', fecha: '2026-09-22', reporteHistory: [{ fecha: '2026-09-22' }] }),
  // 12 · Firmo SIN fechaFirma NI reportes → cuenta en el KPI instantáneo
  //      (estado Firmo) pero NO en las metas (regla M25: sin fecha de firma
  //      no hay período al que atribuirla; documentado, no es un bug).
  caso({ id: 'c12', estado: 'Firmo', fecha: '2026-09-24' }),
];

// Población que App entrega al Dashboard para septiembre (M01): mismo helper
// casoEnMes que usa App.jsx:684-691 (creación O último reporte + normalizador).
const poblacionSep = CASOS.filter((c) => casoEnMes(c, MONTH, YEAR));

describe('Paridad de métricas (1.10.1 · M01/M21/M22/M25)', () => {
  it('(1) Casos totales: widget === KPICards para el mismo mes (M01)', () => {
    expect(poblacionSep.length).toBe(11); // los 12 menos c9 (mes distinto)

    // Widget del tab Resumen/Rendimiento: metricsEngine sobre la población dada.
    const widget = widgetComputeMetrics(
      { filtered: poblacionSep, cats: CATEGORIAS_DEFAULT },
      ['totalCasos', 'firmas', 'pendientes', 'noResponden']
    );

    // KPICards/CSV: computeMetrics.js con la MISMA lista ya filtrada por App
    // (flag poblacionPreFiltrada) — sin re-filtrar por isSameMonth(c.fecha),
    // que era lo que hacía perder c2 (creada en agosto, reportada en septiembre).
    const kpis = kpiComputeMetrics(poblacionSep, { mes: MES_ISO }, {}, {
      poblacionPreFiltrada: true,
    });

    expect(widget.totalCasos.value).toBe(poblacionSep.length);
    expect(kpis.total).toBe(widget.totalCasos.value);

    // Misma fórmula para "Firmas" (estado instantáneo success) en ambos.
    expect(kpis.firmas).toBe(widget.firmas.value);
    expect(kpis.firmas).toBe(3); // c1, c2, c12 (estado "Firmo" en el mes)
  });

  it('(2) Tasa de cierre idéntica en ambos motores = (firmas+perdidos)/total (M21)', () => {
    const widget = widgetComputeMetrics(
      { filtered: poblacionSep, cats: CATEGORIAS_DEFAULT },
      ['tasaCierre', 'tasaContactados']
    );
    const kpis = kpiComputeMetrics(poblacionSep, { mes: MES_ISO }, {}, {
      poblacionPreFiltrada: true,
    });

    // Fórmula canónica de referencia: cerrados = success ∪ lost.
    const cerrados = poblacionSep.filter(
      (c) =>
        CATEGORIAS_DEFAULT.success.includes(c.estado) ||
        CATEGORIAS_DEFAULT.lost.includes(c.estado)
    ).length;
    const esperada = Math.round((cerrados / poblacionSep.length) * 100);

    expect(kpis.tasaCierre).toBe(widget.tasaCierre.value);
    expect(widget.tasaCierre.value).toBe(esperada);
    expect(esperada).toBe(45); // 5 cerrados (c1,c2,c3,c7,c12) / 11

    // La razón vieja del widget sobrevive como métrica SECUNDARIA con rótulo
    // propio (no debe llamarse "Tasa de cierre").
    expect(widget.tasaContactados.label).toBe('Conversión s/ contactados');
    expect(widget.tasaContactados.value).not.toBe(widget.tasaCierre.value);
  });

  it('(3) "Activos" igual en quickFilter, computeMetrics y busquedaFiltro (M22)', () => {
    const kpis = kpiComputeMetrics(poblacionSep, { mes: MES_ISO }, {}, {
      poblacionPreFiltrada: true,
    });
    const widget = widgetComputeMetrics(
      { filtered: poblacionSep, cats: CATEGORIAS_DEFAULT },
      ['pendientes', 'noResponden']
    );

    const activosQuick = aplicarQuickFilter(
      poblacionSep,
      { tipo: 'grupo', valor: 'ACTIVOS' },
      CATEGORIAS_DEFAULT
    ).length;
    const activosBusqueda = aplicarBusquedaFiltro(
      poblacionSep,
      'activos',
      CATEGORIAS_DEFAULT
    ).length;

    // 6 activos: c4, c5, c6, c8, c10, c11 (contact ∪ pending).
    expect(activosQuick).toBe(6);
    expect(kpis.activos).toBe(activosQuick);
    expect(activosBusqueda).toBe(activosQuick);

    // Cruce con el widget: pendientes = contact y noResponden = pending, y su
    // suma es exactamente el helper único esActivo (contact ∪ pending).
    expect(widget.pendientes.value + widget.noResponden.value).toBe(kpis.activos);
    expect(widget.pendientes.value).toBe(4); // c4, c5, c8, c11
    expect(widget.noResponden.value).toBe(2); // c6, c10
  });

  it('(4) Firmas del mes por fechaFirma: LogroObjetivos === metas Mi Espacio (M25)', () => {
    // LogroObjetivos (Dashboard recibe la lista completa de casos).
    const firmasLogro = contarFirmasPeriodo(CASOS, YEAR, MONTH);
    // Metas de Mi Espacio: getMonthlyGoalProgress → countSignedInMonth.
    const metas = getMonthlyGoalProgress(
      { monthly: { signed: { enabled: true, target: 1 } } },
      CASOS,
      YEAR,
      MONTH
    );

    expect(firmasLogro).toBe(metas.signed.current);
    expect(firmasLogro).toBe(2); // c1 (05/09) y c2 (10/09) por fecha de firma

    // KPI instantáneo (estado "Firmo") ≠ metas (hechos del período): es la
    // diferencia INTENCIONAL documentada en M25(a) vs M25(b). c12 es Firmo
    // pero sin fechaFirma ni reportes → no aporta a la meta; c9 firma en
    // octubre → tampoco.
    const kpis = kpiComputeMetrics(poblacionSep, { mes: MES_ISO }, {}, {
      poblacionPreFiltrada: true,
    });
    expect(kpis.firmas).toBe(3);
    expect(metas.signed.current).toBe(2);
  });
});
