import { describe, it, expect } from 'vitest';
import {
  computeMetrics,
  aplicarFiltros,
  buildActivityFeed,
  diasDesde,
  provinciaDe,
} from './computeMetrics';
import { generateInsights } from './insightsEngine';

const caso = (over = {}) => ({
  id: 'c1',
  fecha: '2026-06-10',
  nombre: 'GARCIA JUAN',
  telefono: '261 555-0000',
  localidad: 'MENDOZA',
  provincia: 'MENDOZA',
  aseguradora: 'SANCOR',
  estudioJuridico: 'gl mar del plata',
  tipoIngreso: 'Accidente + Cirugía',
  estado: 'Pendiente',
  updatedAt: '2026-06-10T12:00:00.000Z',
  ...over,
});

// Días hábiles (sin sábado/domingo) en los últimos `days` días.
const contarDiasHabiles = (days = 30) => {
  const today = new Date();
  let count = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

// Fecha ISO del día hábil más reciente (para que los tests no dependan del día).
const ultimoDiaHabilISO = () => {
  const d = new Date();
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

describe('computeMetrics', () => {
  it('calcula KPIs generales (total/activos/cerrados/firmas)', () => {
    const casos = [
      caso({ id: 'a', estado: 'Pendiente' }),
      caso({ id: 'b', estado: 'Cita virtual' }),
      caso({ id: 'c', estado: 'Firmo', fechaFirma: '2026-06-20' }),
      caso({ id: 'd', estado: 'No viable' }),
    ];
    const m = computeMetrics(casos);
    expect(m.total).toBe(4);
    expect(m.activos).toBe(2);
    expect(m.cerrados).toBe(2);
    expect(m.firmas).toBe(1);
    expect(m.perdidos).toBe(1);
    expect(m.tasaConversion).toBe(25);
  });

  it('agrupa por estado y provincia', () => {
    const casos = [
      caso({ id: 'a', estado: 'Pendiente', provincia: 'MENDOZA' }),
      caso({ id: 'b', estado: 'Firmo', provincia: 'MENDOZA', fechaFirma: '2026-06-20' }),
      caso({ id: 'c', estado: 'Pendiente', localidad: 'LA PLATA, BUENOS AIRES', provincia: '' }),
    ];
    const m = computeMetrics(casos);
    expect(m.byStatus).toHaveLength(2);
    const pend = m.byStatus.find((s) => s.name === 'Pendiente');
    expect(pend.value).toBe(2);
    const prov = m.byProvince.find((p) => p.key === 'BUENOS AIRES');
    expect(prov.total).toBe(1);
    expect(provinciaDe(casos[2])).toBe('BUENOS AIRES');
    // La localidad con coma preserva la provincia correctamente
    expect(provinciaDe({ localidad: 'SAN MIGUEL, TUCUMAN' })).toBe('TUCUMÁN');
    expect(provinciaDe({ localidad: 'MENDOZA', provincia: 'MENDOZA' })).toBe('MENDOZA');
    expect(provinciaDe({ localidad: 'Sin dato', provincia: '' })).toBe('Sin provincia');
  });

  it('calcula el tiempo promedio a firma usando fechaFirma', () => {
    const casos = [
      caso({ id: 'a', estado: 'Firmo', fecha: '2026-06-10', fechaFirma: '2026-06-20' }),
      caso({ id: 'b', estado: 'Firmo', fecha: '2026-06-01', fechaFirma: '2026-06-21' }),
    ];
    const m = computeMetrics(casos);
    expect(m.avgResolutionDays).toBe(15);
  });

  it('detecta casos vencidos y sin actualizar', () => {
    const old = new Date();
    old.setDate(old.getDate() - 40);
    const stale = new Date();
    stale.setDate(stale.getDate() - 20);
    const casos = [
      caso({ id: 'a', estado: 'Pendiente', fecha: '2026-01-15', updatedAt: old.toISOString() }),
      caso({ id: 'b', estado: 'Pendiente', fecha: '2026-06-10', updatedAt: stale.toISOString() }),
      caso({ id: 'c', estado: 'Firmo', fecha: '2026-01-15', fechaFirma: '2026-06-01' }),
    ];
    const m = computeMetrics(casos);
    expect(m.overdueCases.map((x) => x.id)).toContain('a');
    expect(m.overdueCases.map((x) => x.id)).not.toContain('c');
    expect(m.staleCases.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('aplica filtros por estado/estudio/provincia/tipo', () => {
    const casos = [
      caso({ id: 'a', estado: 'Firmo', estudioJuridico: 'gl mar del plata', provincia: 'MENDOZA' }),
      caso({ id: 'b', estado: 'Pendiente', estudioJuridico: 'gl caba', provincia: 'CABA' }),
      caso({ id: 'c', estado: 'Firmo', estudioJuridico: 'gl mar del plata', provincia: 'CABA' }),
    ];
    expect(aplicarFiltros(casos, { estado: 'Firmo' })).toHaveLength(2);
    expect(aplicarFiltros(casos, { estudio: 'gl caba' })).toHaveLength(1);
    expect(aplicarFiltros(casos, { provincia: 'CABA' })).toHaveLength(2);
    expect(aplicarFiltros(casos, { estado: 'Firmo', estudio: 'gl mar del plata' })).toHaveLength(2);
  });

  it('aplica filtro por mes y día (dia)', () => {
    const casos = [
      caso({ id: 'a', fecha: '2026-06-10' }),
      caso({ id: 'b', fecha: '2026-06-20' }),
      caso({ id: 'c', fecha: '2026-05-10' }),
      caso({ id: 'd', fecha: '2026-07-10' }),
    ];
    expect(aplicarFiltros(casos, { dia: 10 })).toHaveLength(3);
    expect(aplicarFiltros(casos, { dia: 20 })).toHaveLength(1);
    expect(aplicarFiltros(casos, { dia: 31 })).toHaveLength(0);
    expect(aplicarFiltros(casos, {})).toHaveLength(4);
    expect(aplicarFiltros(casos, { mes: '2026-06', dia: 10 })).toHaveLength(1);
    expect(aplicarFiltros(casos, { mes: '2026-06' })).toHaveLength(2);
  });

  it('construye series temporales sin huecos (solo días hábiles)', () => {
    const casos = [
      caso({ id: 'a', fecha: ultimoDiaHabilISO(), estado: 'Pendiente' }),
    ];
    const m = computeMetrics(casos);
    expect(m.seriesByDay).toHaveLength(contarDiasHabiles());
    expect(m.seriesByDay[m.seriesByDay.length - 1].total).toBe(1);
    // Cada punto conoce su semana (para los separadores del gráfico).
    expect(typeof m.seriesByDay[m.seriesByDay.length - 1].semana).toBe('number');
  });

  it('ignora fines de semana (sábado y domingo) en la serie', () => {
    // Encuentra el último sábado dentro de los últimos 30 días.
    const ultimoSabado = (() => {
      const d = new Date();
      while (d.getDay() !== 6) d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();
    const m = computeMetrics([
      caso({ id: 'a', fecha: ultimoSabado, estado: 'Pendiente' }),
    ]);
    const totalSerie = m.seriesByDay.reduce((acc, s) => acc + s.total, 0);
    expect(totalSerie).toBe(0);
    // Ningún punto de la serie cae en sábado ni domingo.
    for (const s of m.seriesByDay) {
      const dow = new Date(s.fecha + 'T00:00:00').getDay();
      expect([0, 6]).not.toContain(dow);
    }
  });

  it('cuenta casos con fecha DD/MM (no 2001) en la serie del día correcto', () => {
    const hoy = new Date(ultimoDiaHabilISO() + 'T00:00:00');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const casos = [
      // "DD/MM" sin año: debe caer en el día de hoy (año actual), jamás en 2001.
      caso({ id: 'a', fecha: `${dd}/${mm}`, estado: 'Pendiente' }),
    ];
    const m = computeMetrics(casos);
    const hoyIso = ultimoDiaHabilISO();
    const totalHoy = m.seriesByDay.find((s) => s.fecha === hoyIso)?.total || 0;
    expect(totalHoy).toBe(1);
    // Sin la corrección, "DD/MM" caía en 2001 y quedaba fuera de la serie.
    const totalSeries = m.seriesByDay.reduce((acc, s) => acc + s.total, 0);
    expect(totalSeries).toBe(1);
  });

  it('filtra por mes fechas DD/MM/YYYY sin intercambiar mes/día', () => {
    const casos = [
      caso({ id: 'b', fecha: '15/07/2026', estado: 'Pendiente' }),
      caso({ id: 'c', fecha: '2026-06-10', estado: 'Pendiente' }),
    ];
    expect(aplicarFiltros(casos, { mes: '2026-07' }).map((c) => c.id)).toEqual(['b']);
    expect(aplicarFiltros(casos, { dia: 15 }).map((c) => c.id)).toEqual(['b']);
  });

  it('cuenta firmas el día en que se cargó el reporte de la firma', () => {
    const hoyIso = ultimoDiaHabilISO();
    const [, mm, dd] = hoyIso.split('-');
    const fechaReporte = `${dd}/${mm}`;
    const casos = [
      // Firma registrada por reporte (sin fechaFirma): debe contar hoy.
      caso({ id: 'a', estado: 'Firmo', fecha: hoyIso, reporteHistory: [{ fecha: fechaReporte, texto: 'Firmó' }] }),
      // Firma con fechaFirma explícita: también cuenta hoy.
      caso({ id: 'b', estado: 'Firmo', fecha: hoyIso, fechaFirma: hoyIso }),
      // Caso no firmado con reporte: NO debe sumar firmas.
      caso({ id: 'c', estado: 'Pendiente', fecha: hoyIso, reporteHistory: [{ fecha: fechaReporte, texto: 'Llamada' }] }),
    ];
    const m = computeMetrics(casos);
    const totalFirmas = m.seriesByDay.reduce((acc, s) => acc + s.firmas, 0);
    expect(totalFirmas).toBe(2);
  });
});

describe('insightsEngine', () => {
  it('genera insight de buen nivel de resolución', () => {
    const casos = Array.from({ length: 10 }, (_, i) =>
      caso({ id: `c${i}`, estado: i < 8 ? 'Firmo' : 'Pendiente', fechaFirma: '2026-06-20' })
    );
    const insights = generateInsights(computeMetrics(casos));
    expect(insights.some((i) => i.severity === 'success' && /resoluci/i.test(i.titulo))).toBe(true);
  });

  it('genera insight crítico cuando hay muchos casos demorados', () => {
    const casos = Array.from({ length: 6 }, (_, i) =>
      caso({ id: `c${i}`, estado: 'Pendiente', fecha: '2026-01-15', updatedAt: '2026-01-20T12:00:00.000Z' })
    );
    const insights = generateInsights(computeMetrics(casos));
    expect(insights.some((i) => i.severity === 'danger' && /demorado/i.test(i.titulo))).toBe(true);
  });
});

describe('buildActivityFeed', () => {
  it('fusiona casos, reportes, notas y eventos ordenados por fecha', () => {
    const cases = [
      caso({
        id: 'a',
        createdAt: '2026-06-01T10:00:00.000Z',
        updatedAt: '2026-06-05T10:00:00.000Z',
        fechaFirma: '2026-06-08',
        reporteHistory: [{ fecha: '2026-06-03', texto: 'Se avanzó' }],
      }),
    ];
    const notes = [{ id: 'n1', title: 'Nota', content: 'Texto', updatedAt: '2026-06-06T10:00:00.000Z' }];
    const events = [{ id: 'e1', titulo: 'Evento', startDate: '2026-06-07' }];
    const caseHistory = [
      { caseId: 'a', type: 'CASE_CREATED', timestamp: '2026-06-01T10:00:00.000Z', data: {} },
      { caseId: 'a', type: 'REPORT_ADDED', timestamp: '2026-06-03T10:00:00.000Z', data: { texto: 'Se avanzó' } },
      { caseId: 'a', type: 'FIRMA_REGISTERED', timestamp: '2026-06-08T10:00:00.000Z', data: {} },
    ];
    const feed = buildActivityFeed(cases, notes, events, 10);
    expect(feed.length).toBeGreaterThanOrEqual(3);
    expect(feed.some((i) => i.type === 'note_added' || i.entityType === 'note')).toBe(true);
    expect(feed.some((i) => i.type === 'event_linked' || i.entityType === 'event')).toBe(true);
    expect(feed.some((i) => i.type === 'case_created' || i.type === 'firma_registered')).toBe(true);
  });
});
