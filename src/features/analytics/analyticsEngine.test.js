import { describe, it, expect } from 'vitest';
import {
  PERIODOS,
  PERIODO_DEFAULT,
  getPeriodRange,
  rangoAnteriorEquivalente,
  diasEnRango,
  casosEnRango,
  diasHabilesEnRango,
} from './periodUtils';
import {
  fechaFirmaDe,
  computeResumenPeriodo,
  computeDiaSemana,
  computeTendenciaSemanal,
  computeFranjasHorarias,
  rendimientoPorGrupo,
  proyeccionObjetivos,
} from './analyticsEngine';

// Fecha fija para tests determinísticos: martes 25 de agosto de 2026.
const HOY = new Date(2026, 7, 25);

const casoBase = (overrides = {}) => ({
  id: Math.random().toString(36).slice(2),
  nombre: 'CASO',
  fecha: '2026-08-01',
  estado: 'Cita virtual',
  ...overrides,
});

describe('periodUtils', () => {
  it('define todos los períodos declarados', () => {
    expect(PERIODOS.map((p) => p.id)).toEqual([
      'hoy', 'semana', 'mes', '7d', '30d', '90d',
    ]);
    expect(PERIODO_DEFAULT).toBe('30d');
  });

  it('los últimos N días arrancan N días antes inclusive', () => {
    const r = getPeriodRange('30d', HOY);
    expect(r.startISO).toBe('2026-07-27');
    expect(r.endISO).toBe('2026-08-25');
    expect(diasEnRango(r)).toBe(30);
  });

  it('"hoy" es un rango de un solo día', () => {
    const r = getPeriodRange('hoy', HOY);
    expect(diasEnRango(r)).toBe(1);
    expect(r.startISO).toBe('2026-08-25');
  });

  it('"semana" va del lunes a hoy (week-to-date)', () => {
    const r = getPeriodRange('semana', HOY); // martes 25/08
    expect(r.startISO).toBe('2026-08-24');
    expect(r.endISO).toBe('2026-08-25');
  });

  it('"mes" va del día 1 a hoy (month-to-date)', () => {
    const r = getPeriodRange('mes', HOY);
    expect(r.startISO).toBe('2026-08-01');
    expect(r.endISO).toBe('2026-08-25');
  });

  it('el período anterior es siempre equivalente en tamaño', () => {
    for (const p of PERIODOS) {
      const r = getPeriodRange(p.id, HOY);
      const prev = rangoAnteriorEquivalente(r);
      expect(diasEnRango(prev)).toBe(diasEnRango(r));
      const finPrev = new Date(prev.endISO + 'T00:00:00');
      const inicioAct = new Date(r.startISO + 'T00:00:00');
      // Termina el día inmediatamente anterior al inicio del actual.
      expect((inicioAct - finPrev) / 86400000).toBe(1);
    }
  });

  it('casosEnRango filtra por fecha de creación', () => {
    const casos = [
      casoBase({ id: 'a', fecha: '2026-07-28' }),
      casoBase({ id: 'b', fecha: '2026-08-10' }),
      casoBase({ id: 'c', fecha: '2025-01-01' }),
      casoBase({ id: 'd', fecha: '' }),
    ];
    const r = getPeriodRange('30d', HOY);
    expect(casosEnRango(casos, r).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('diasHabilesEnRango respeta los días laborales configurados', () => {
    const r = { startISO: '2026-08-24', endISO: '2026-08-30' }; // lun a dom
    expect(diasHabilesEnRango(r, [1, 2, 3, 4, 5])).toBe(5);
    expect(diasHabilesEnRango(r, [1, 3])).toBe(2);
    expect(diasHabilesEnRango(r, [])).toBe(5); // fallback seguro
  });
});

describe('fechaFirmaDe', () => {
  it('prefiere la fecha del último reporte sobre fechaFirma', () => {
    const c = casoBase({
      fechaFirma: '2026-08-20',
      reporteHistory: [
        { fecha: '18/08', texto: 'x', origen: 'Op' },
        { fecha: '19/08', texto: 'firma', origen: 'Op' },
      ],
    });
    expect(fechaFirmaDe(c)).toBe('2026-08-19');
  });

  it('usa fechaFirma cuando no hay reportes', () => {
    const c = casoBase({ fechaFirma: '2026-08-20', reporteHistory: [] });
    expect(fechaFirmaDe(c)).toBe('2026-08-20');
  });

  it('devuelve null si no hay ninguna fecha confiable', () => {
    expect(firmaNull()).toBeNull();
    function firmaNull() {
      return fechaFirmaDe(casoBase({ fechaFirma: null, reporteHistory: [] }));
    }
  });
});

describe('computeResumenPeriodo', () => {
  it('calcula casos, firmas, conversión y variación contra el período equivalente', () => {
    // Período actual (27/07–25/08): cohorte de 10 casos, 5 firmados.
    const actuales = Array.from({ length: 10 }, (_, i) =>
      casoBase({
        id: `act-${i}`,
        fecha: i < 5 ? '2026-08-01' : '2026-08-05',
        estado: i < 5 ? 'Firmo' : 'Cita virtual',
        reporteHistory: i < 5 ? [{ fecha: '05/08', texto: '', origen: '' }] : [],
      })
    );
    // Período anterior equivalente: cohorte de 8 casos, 2 firmados.
    const previos = Array.from({ length: 8 }, (_, i) =>
      casoBase({
        id: `prev-${i}`,
        fecha: '2026-07-10',
        estado: i < 2 ? 'Firmo' : 'No le interesa',
      })
    );
    const casos = [...actuales, ...previos];
    const rango = getPeriodRange('30d', HOY);

    const resumen = computeResumenPeriodo(casos, rango, [1, 2, 3, 4, 5]);

    expect(resumen.casos).toBe(10);
    expect(resumen.firmas).toBe(5);
    expect(resumen.conversion).toBe(50);
    expect(resumen.previo.casos).toBe(8);
    expect(resumen.previo.firmas).toBe(2);
    expect(resumen.variacion.firmasPct).toBe(150);
    expect(resumen.variacion.casosPct).toBe(25);
    expect(resumen.periodo).toBe('Últimos 30 días');
    expect(resumen.previo.label).toBe('Últimos 30 días');
  });

  it('devuelve variación null cuando el período anterior está vacío', () => {
    const casos = [
      casoBase({ fecha: '2026-08-01', estado: 'Firmo' }),
    ];
    const resumen = computeResumenPeriodo(casos, getPeriodRange('7d', HOY), [1, 2, 3, 4, 5]);
    expect(resumen.previo.casos).toBe(0);
    expect(resumen.variacion.firmasPct).toBeNull();
  });

  it('el promedio diario usa la fecha real de firma sobre días hábiles', () => {
    // Semana pasada completa (17–21/08): 4 firmas en días hábiles distintos.
    const casos = ['17/08', '18/08', '19/08', '20/08'].map((f, i) =>
      casoBase({
        id: `f${i}`,
        fecha: '2026-07-03',
        estado: 'Firmo',
        reporteHistory: [{ fecha: f, texto: '', origen: '' }],
      })
    );
    const rango = { startISO: '2026-08-17', endISO: '2026-08-21' };
    const resumen = computeResumenPeriodo(casos, rango, [1, 2, 3, 4, 5]);
    // 4 firmas / 5 días hábiles = 0.8
    expect(resumen.promedioDiario).toBe(0.8);
  });
});

describe('computeDiaSemana', () => {
  const rangoSem = { startISO: '2026-08-03', endISO: '2026-08-30' }; // 4 semanas

  function firmasEnFechas(fechas) {
    const map = new Map();
    for (const f of fechas) map.set(f, (map.get(f) || 0) + 1);
    return map;
  }

  it('detecta el mejor día con muestra suficiente', () => {
    // Claves ISO (mismo formato que produce computeResumenPeriodo).
    // 4 martes con 2 firmas cada uno (total 8 = mínimo) + 1 lunes.
    const fechas = [];
    for (const iso of ['2026-08-04', '2026-08-11', '2026-08-18', '2026-08-25']) fechas.push(iso, iso);
    fechas.push('2026-08-10');
    const stats = computeDiaSemana(firmasEnFechas(fechas), rangoSem, [1, 2, 3, 4, 5]);
    expect(stats.mejorDia?.label).toBe('Martes');
    expect(stats.mejorDia?.promedio).toBe(2);
  });

  it('no declara patrón con muestra insuficiente', () => {
    const stats = computeDiaSemana(
      firmasEnFechas(['2026-08-04', '2026-08-06']),
      rangoSem,
      [1, 2, 3, 4, 5]
    );
    expect(stats.mejorDia).toBeNull();
  });

  it('ignora días fuera de los días laborales configurados', () => {
    // Solo sábados laborales: 2 sábados con 4 firmas cada uno.
    const fechas = [];
    for (const iso of ['2026-08-08', '2026-08-15']) fechas.push(iso, iso, iso, iso);
    const stats = computeDiaSemana(firmasEnFechas(fechas), rangoSem, [6]);
    expect(stats.porDia.every((s) => s.dia === 6)).toBe(true);
    expect(stats.mejorDia?.label).toBe('Sábado');
  });
});

describe('computeTendenciaSemanal', () => {
  function firmasPorSemanas(porSemana) {
    // porSemana: array de cantidades; semana 1 = la más antigua completa.
    const casos = [];
    let lunes = new Date(HOY);
    const dow = HOY.getDay();
    lunes.setDate(lunes.getDate() + (dow === 0 ? -6 : 1 - dow)); // lunes semana actual
    for (let i = 0; i < porSemana.length; i++) {
      const n = porSemana[i];
      const lunesSem = new Date(lunes);
      lunesSem.setDate(lunes.getDate() - 7 * (porSemana.length - i));
      for (let k = 0; k < n; k++) {
        const dia = new Date(lunesSem);
        dia.setDate(dia.getDate() + (k % 5)); // reparte lun-vie
        casos.push(
          casoBase({
            estado: 'Firmo',
            reporteHistory: [{
              fecha: `${String(dia.getDate()).padStart(2, '0')}/${String(dia.getMonth() + 1).padStart(2, '0')}`,
              texto: '',
              origen: '',
            }],
          })
        );
      }
    }
    return casos;
  }

  it('detecta tendencia ascendente con suficientes semanas', () => {
    // 8 semanas: 4 primeras con 1 firma, 4 últimas con 4 firmas.
    const casos = firmasPorSemanas([1, 1, 1, 1, 4, 4, 4, 4]);
    const t = computeTendenciaSemanal(casos, {}, HOY);
    expect(t.muestraSuficiente).toBe(true);
    expect(t.tendencia.direccion).toBe('ascendente');
    expect(t.tendencia.pct).toBeGreaterThan(0);
    expect(t.puntos).toHaveLength(8);
  });

  it('detecta tendencia descendente', () => {
    const casos = firmasPorSemanas([4, 4, 4, 4, 1, 1, 1, 1]);
    const t = computeTendenciaSemanal(casos, {}, HOY);
    expect(t.tendencia.direccion).toBe('descendente');
    expect(t.tendencia.pct).toBeLessThan(0);
  });

  it('detecta estabilidad dentro del umbral', () => {
    const casos = firmasPorSemanas([2, 2, 2, 2, 2, 2, 2, 2]);
    const t = computeTendenciaSemanal(casos, {}, HOY);
    expect(t.tendencia.direccion).toBe('estable');
  });

  it('no concluye tendencia con menos de 4 semanas de datos', () => {
    // Casos con fechas muy viejas: ninguna firma cae en las últimas 8 semanas.
    const casos = [casoBase({ estado: 'Firmo', fechaFirma: '2025-01-10' })];
    const t = computeTendenciaSemanal(casos, {}, HOY);
    expect(t.muestraSuficiente).toBe(false);
    expect(t.tendencia).toBeNull();
  });
});

describe('computeFranjasHorarias', () => {
  const rango = { startISO: '2026-08-01', endISO: '2026-08-25' };

  function casosConHoras(horas) {
    // createdAt construido en hora LOCAL para que getHours() sea determinístico
    // sin importar la zona horaria del entorno de tests.
    return horas.map((h, i) => {
      const d = new Date(2026, 7, 10 + (i % 5), h, 30, 0);
      return casoBase({ createdAt: d.toISOString() });
    });
  }

  it('no genera análisis horario con muestra insuficiente', () => {
    const r = computeFranjasHorarias(casosConHoras([10, 10, 11]), rango);
    expect(r).toBeNull();
  });

  it('identifica la franja de mayor concentración con timestamps confiables', () => {
    const horas = [10, 10, 11, 10, 11, 10, 10, 11, 11, 10, 16, 16];
    const r = computeFranjasHorarias(casosConHoras(horas), rango);
    expect(r.confiable).toBe(true);
    expect(r.top.label).toBe('10:00 - 12:00');
    expect(r.top.total).toBeGreaterThanOrEqual(8);
  });
});

describe('rendimientoPorGrupo', () => {
  it('agrupa por aseguradora y marca muestra insuficiente', () => {
    const casos = [
      ...Array.from({ length: 12 }, (_, i) =>
        casoBase({
          id: `ga-${i}`,
          fecha: '2026-08-05',
          aseguradora: 'GALENO',
          estado: i < 6 ? 'Firmo' : 'Cita virtual',
        })
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        casoBase({ id: `gb-${i}`, fecha: '2026-08-05', aseguradora: 'OTRA', estado: 'Firmo' })
      ),
    ];
    const rango = getPeriodRange('30d', HOY);
    const grupos = rendimientoPorGrupo(casos, rango, 'aseguradora');

    const galeno = grupos.find((g) => g.key === 'GALENO');
    const otra = grupos.find((g) => g.key === 'OTRA');
    expect(galeno.total).toBe(12);
    expect(galeno.conversion).toBe(50);
    expect(galeno.suficienteMuestra).toBe(true);
    expect(otra.total).toBe(2);
    expect(otra.suficienteMuestra).toBe(false);
  });

  it('calcula evolución en puntos contra el período anterior equivalente', () => {
    const casos = [
      // Actual: GALENO 50% (6/12)
      ...Array.from({ length: 12 }, (_, i) =>
        casoBase({ id: `a${i}`, fecha: '2026-08-05', aseguradora: 'GALENO', estado: i < 6 ? 'Firmo' : 'Pendiente' })
      ),
      // Anterior: GALENO 75% (9/12)
      ...Array.from({ length: 12 }, (_, i) =>
        casoBase({ id: `p${i}`, fecha: '2026-07-05', aseguradora: 'GALENO', estado: i < 9 ? 'Firmo' : 'Pendiente' })
      ),
    ];
    const rango = getPeriodRange('30d', HOY);
    const [galeno] = rendimientoPorGrupo(casos, rango, 'aseguradora');
    expect(galeno.conversionPrev).toBe(75);
    expect(galeno.evolucionPuntos).toBe(-25);
  });
});

describe('proyeccionObjetivos', () => {
  const goals = {
    daily: {},
    weekly: {
      signed: { enabled: true, target: 10 },
      cases: { enabled: false, target: 25 },
    },
    monthly: { signed: { enabled: true, target: 14 } },
  };
  const profile = { workingDays: [1, 2, 3, 4, 5], workSchedule: { start: '09:00', end: '17:00' } };

  it('proyecta el objetivo semanal como estimación con ritmo reciente', () => {
    // Miércoles 26/08. Dos firmas registradas lunes y martes de esta semana.
    const casos = ['24/08', '25/08'].map((f, i) =>
      casoBase({
        id: `sf${i}`,
        fecha: '2026-08-24',
        estado: 'Firmo',
        reporteHistory: [{ fecha: f, texto: '', origen: '' }],
      })
    );
    const p = proyeccionObjetivos({
      goals,
      casos,
      profile,
      availability: {},
      year: 2026,
      month: 7,
      todayISO: '2026-08-26',
      workingDays: [1, 2, 3, 4, 5],
    });

    const firmasGoal = p.semanales.find((g) => g.key === 'signed');
    expect(firmasGoal.current).toBe(2);
    expect(firmasGoal.target).toBe(10);

    const proy = p.proyecciones.find((x) => x.key === 'signed');
    expect(proy.restantesDias).toBe(3); // mié, jue, vie
    expect(proy.ritmoDiario).toBeGreaterThan(0);
    expect(proy.proyeccionEstimada).toBe(2 + Math.round(proy.ritmoDiario * 3));
    expect(proy.cumpliria).toBe(false); // ritmo bajo para meta de 10
  });

  it('expone el ritmo mensual requerido reutilizando Mi Espacio', () => {
    const p = proyeccionObjetivos({
      goals: { ...goals, monthly: { signed: { enabled: true, target: 30 }, cases: { enabled: true, target: 100 } } },
      casos: [],
      profile,
      availability: {},
      year: 2026,
      month: 7,
      todayISO: '2026-08-05',
      workingDays: [1, 2, 3, 4, 5],
    });
    expect(p.ritmoMensual).toBeTruthy();
    expect(p.ritmoMensual.remainingDays).toBeGreaterThan(0);
    expect(p.ritmoMensual.cases).toBeGreaterThan(0);
  });
});
