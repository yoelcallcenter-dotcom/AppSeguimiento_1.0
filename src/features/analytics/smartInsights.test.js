import { describe, it, expect } from 'vitest';
import { generarInsightsAnaliticos } from './smartInsights';
import { INSIGHTS_CONFIG, CATEGORIAS_INSIGHT } from './insightsConfig';

// Fábricas de datos mínimas para las reglas.
const resumenBase = (overrides = {}) => ({
  periodo: 'Últimos 30 días',
  previo: { label: 'Últimos 30 días', firmas: 10, casos: 20 },
  casos: 20,
  firmas: 10,
  conversion: 50,
  promedioDiario: 0.5,
  habiles: 20,
  variacion: { firmasPct: null, casosPct: null, conversionPuntos: null },
  diaSemana: { porDia: [], mejorDia: null, totalFirmas: 10 },
  ...overrides,
});

const grupo = (overrides = {}) => ({
  key: 'GALENO',
  total: 12,
  firmas: 6,
  conversion: 50,
  conversionPrev: 50,
  evolucionPuntos: 0,
  suficienteMuestra: true,
  ...overrides,
});

describe('generarInsightsAnaliticos — estados vacíos', () => {
  it('sin casos: estado sin-datos y ningún insight', () => {
    const r = generarInsightsAnaliticos({ totalCasos: 0 });
    expect(r.estadoVacio).toBe('sin-datos');
    expect(r.insights).toHaveLength(0);
  });

  it('con pocos datos y sin reglas disparadas: datos-insuficientes (no inventa)', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 3,
      resumen: resumenBase({ firmas: 1, variacion: { firmasPct: null, casosPct: null, conversionPuntos: null } }),
      tendencia: null,
      horas: null,
      aseguradoras: [],
      estudios: [],
      proyeccion: null,
      promedioPersonal: null,
    });
    expect(r.estadoVacio).toBe('datos-insuficientes');
    expect(r.insights).toHaveLength(0);
  });
});

describe('generarInsightsAnaliticos — productividad', () => {
  it('detecta aumento significativo de firmas con muestra en ambos períodos', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 100,
      resumen: resumenBase({
        firmas: 20,
        variacion: { firmasPct: 100, casosPct: 0, conversionPuntos: null },
      }),
      tendencia: null,
      horas: null,
      proyeccion: null,
    });
    const ins = r.insights.find((i) => i.categoria === CATEGORIAS_INSIGHT.PRODUCTIVIDAD);
    expect(ins).toBeTruthy();
    expect(ins.severity).toBe('success');
    expect(ins.detalle).toContain('períodos equivalentes');
    // La base explica los números comparados (valores con "firmas" y variación).
    expect(ins.base.filter((b) => String(b.valor).includes('firmas')).length).toBeGreaterThanOrEqual(2);
    expect(ins.base.some((b) => b.valor === '+100%')).toBe(true);
  });

  it('ignora variaciones insignificantes (< umbral significativo)', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 100,
      resumen: resumenBase({
        firmas: 11,
        previo: { label: 'X', firmas: 10, casos: 20 },
        variacion: { firmasPct: 10, casosPct: 0, conversionPuntos: null },
      }),
      tendencia: null,
      horas: null,
      proyeccion: null,
    });
    expect(r.insights.filter((i) => i.categoria === CATEGORIAS_INSIGHT.PRODUCTIVIDAD)).toHaveLength(0);
  });

  it('no compara cuando la muestra del período anterior es insuficiente', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 100,
      resumen: resumenBase({
        firmas: 20,
        previo: { label: 'X', firmas: 2, casos: 4 }, // < muestra.comparacion
        variacion: { firmasPct: 400, casosPct: 0, conversionPuntos: null },
      }),
      tendencia: null,
      horas: null,
      proyeccion: null,
    });
    expect(
      r.insights.filter((i) => i.titulo.includes('aumentaron') || i.titulo.includes('bajaron'))
    ).toHaveLength(0);
  });

  it('avisa ritmo por debajo del habitual y felicita por encima', () => {
    const base = {
      totalCasos: 100,
      tendencia: null,
      horas: null,
      proyeccion: null,
      promedioPersonal: { firmas: 40, dias: 30, promedioDiario: 2 },
      resumen: resumenBase({
        firmas: 20,
        promedioDiario: 2.6,
        variacion: { firmasPct: null, casosPct: null, conversionPuntos: null },
      }),
    };
    const arriba = generarInsightsAnaliticos(base);
    expect(arriba.insights.some((i) => i.titulo.includes('por encima de tu ritmo'))).toBe(true);

    const abajo = generarInsightsAnaliticos({
      ...base,
      resumen: resumenBase({
        firmas: 8,
        promedioDiario: 1.2,
        variacion: { firmasPct: null, casosPct: null, conversionPuntos: null },
      }),
    });
    expect(abajo.insights.some((i) => i.titulo.includes('por debajo de tu ritmo'))).toBe(true);
  });
});

describe('generarInsightsAnaliticos — objetivos', () => {
  const proyeccionRitmoBajo = {
    semanales: [],
    ritmoMensual: null,
    diasHabilesRestantesSemana: 3,
    proyecciones: [
      {
        key: 'signed',
        label: 'Firmas',
        current: 2,
        target: 10,
        percent: 20,
        met: false,
        status: 'in-progress',
        restantesDias: 3,
        ritmoDiario: 0.7,
        proyeccionEstimada: 4,
        cumpliria: false,
      },
    ],
  };

  it('prioriza el ritmo insuficiente (prioridad 1) con lenguaje estimativo', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 50,
      resumen: resumenBase(),
      tendencia: null,
      horas: null,
      proyeccion: proyeccionRitmoBajo,
    });
    const ins = r.insights[0];
    expect(ins.prioridad).toBe(1);
    expect(ins.categoria).toBe(CATEGORIAS_INSIGHT.OBJETIVOS);
    expect(ins.titulo.toLowerCase()).toContain('ritmo insuficiente');
    expect(ins.detalle).toContain('Necesitarías');
    expect(ins.base.some((b) => b.label === 'Proyección estimada')).toBe(true);
  });

  it('la proyección positiva siempre se marca como estimación', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 50,
      resumen: resumenBase(),
      tendencia: null,
      horas: null,
      proyeccion: {
        ...proyeccionRitmoBajo,
        proyecciones: [
          { ...proyeccionRitmoBajo.proyecciones[0], ritmoDiario: 3, proyeccionEstimada: 11, cumpliria: true },
        ],
      },
    });
    const ins = r.insights.find((i) => i.categoria === CATEGORIAS_INSIGHT.OBJETIVOS && i.severity === 'success');
    expect(ins).toBeTruthy();
    expect(/estima|podrías/i.test(ins.detalle)).toBe(true);
  });
});

describe('generarInsightsAnaliticos — tendencia', () => {
  const puntos = (vals) => vals.map((f, i) => ({ label: `S${i + 1}`, firmas: f, n: i + 1 }));

  it('tendencia descendente fuerte es prioridad alta', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 100,
      resumen: resumenBase(),
      tendencia: {
        puntos: puntos([5, 5, 5, 5, 1, 1, 1, 1]),
        tendencia: { direccion: 'descendente', pct: -80, primeraMitad: 5, segundaMitad: 1, semanasAnalizadas: 8 },
        muestraSuficiente: true,
      },
      horas: null,
      proyeccion: null,
    });
    const ins = r.insights.find((i) => i.categoria === CATEGORIAS_INSIGHT.TENDENCIA);
    expect(ins).toBeTruthy();
    expect(ins.prioridad).toBe(1);
    expect(ins.severity).toBe('warning');
  });

  it('reconoce estabilidad semanal sin anunciar cambios falsos', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 100,
      resumen: resumenBase(),
      tendencia: {
        puntos: puntos([3, 3, 3, 3]),
        tendencia: { direccion: 'estable', pct: 0, primeraMitad: 3, segundaMitad: 3, semanasAnalizadas: 4 },
        muestraSuficiente: true,
      },
      horas: null,
      proyeccion: null,
    });
    expect(r.insights.some((i) => i.titulo === 'Rendimiento estable')).toBe(true);
    expect(r.insights.some((i) => i.categoria === CATEGORIAS_INSIGHT.TENDENCIA && i.titulo !== 'Rendimiento estable')).toBe(false);
  });
});

describe('generarInsightsAnaliticos — grupos (aseguradoras/estudios)', () => {
  it('no rankea grupos con muestra pequeña', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 20,
      resumen: resumenBase(),
      tendencia: null,
      horas: null,
      aseguradoras: [grupo({ key: 'CHICA', total: 2, suficienteMuestra: false })],
      estudios: [],
      proyeccion: null,
    });
    expect(r.insights.filter((i) => i.categoria === CATEGORIAS_INSIGHT.ASEGURADORAS)).toHaveLength(0);
  });

  it('alerta caída fuerte de conversión solo con muestra suficiente', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 200,
      resumen: resumenBase(),
      tendencia: null,
      horas: null,
      aseguradoras: [
        grupo({ key: 'GALENO', conversion: 25, conversionPrev: 55, evolucionPuntos: -30 }),
      ],
      estudios: [],
      proyeccion: null,
    });
    const ins = r.insights.find((i) => i.titulo.includes('Cayó la conversión'));
    expect(ins).toBeTruthy();
    expect(ins.prioridad).toBe(2);
    expect(ins.detalle).toContain('puntos');
  });

  it('contexto del estudio top: mucho volumen con conversión baja incluye ambos datos', () => {
    const r = generarInsightsAnaliticos({
      totalCasos: 300,
      resumen: resumenBase(),
      tendencia: null,
      horas: null,
      aseguradoras: [],
      estudios: [
        grupo({ key: 'ESTUDIO A', total: 40, firmas: 8, conversion: 20 }),
        grupo({ key: 'ESTUDIO B', total: 15, firmas: 9, conversion: 60 }),
      ],
      proyeccion: null,
    });
    const ins = r.insights.find((i) => i.titulo.includes('mucho volumen'));
    expect(ins).toBeTruthy();
    expect(ins.detalle).toContain('ESTUDIO A');
    expect(ins.detalle).toContain('promedio general');
    expect(ins.base.length).toBeGreaterThanOrEqual(3);
  });
});

describe('generarInsightsAnaliticos — orden y tope', () => {
  it('ordena por prioridad ascendente y respeta el máximo de insights', () => {
    // Muchas señales a la vez.
    const r = generarInsightsAnaliticos({
      totalCasos: 500,
      resumen: resumenBase({
        firmas: 40,
        variacion: { firmasPct: 100, casosPct: 0, conversionPuntos: null },
        promedioDiario: 3,
      }),
      tendencia: {
        puntos: [1, 1, 1, 1, 5, 5, 5, 5].map((f, i) => ({ label: `S${i + 1}`, firmas: f, n: i })),
        tendencia: { direccion: 'ascendente', pct: 300, primeraMitad: 1, segundaMitad: 5, semanasAnalizadas: 8 },
        muestraSuficiente: true,
      },
      horas: {
        franjas: [],
        top: { inicio: 10, fin: 12, label: '10:00 - 12:00', total: 12 },
        baja: null,
        totalEventos: 30,
        confiable: true,
      },
      aseguradoras: [grupo({ key: 'GALENO' })],
      estudios: [],
      sinSeguimientoCount: 8,
      promedioPersonal: { firmas: 20, dias: 30, promedioDiario: 1 },
      proyeccion: null,
    });
    expect(r.insights.length).toBeLessThanOrEqual(INSIGHTS_CONFIG.maxInsights);
    for (let i = 1; i < r.insights.length; i++) {
      expect(r.insights[i - 1].prioridad).toBeLessThanOrEqual(r.insights[i].prioridad);
    }
    // El primero debe ser prioritario (variación fuerte o ritmo insuficiente).
    expect(r.insights[0].prioridad).toBe(1);
  });
});
