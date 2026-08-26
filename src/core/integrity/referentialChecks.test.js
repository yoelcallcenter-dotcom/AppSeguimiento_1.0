import { describe, it, expect } from 'vitest';
import {
  detectarHuerfanos,
  detectarDuplicadosCasos,
  repararOrdenSecciones,
  repararPreferenciasPersistidas,
} from './referentialChecks';

describe('detectarHuerfanos', () => {
  const casos = [{ id: 'c1' }, { id: 'c2' }];

  it('detecta notas que apuntan a casos inexistentes', () => {
    const r = detectarHuerfanos({
      casos,
      notas: [
        { id: 'n1', title: 'OK', relatedCaseIds: ['c1'] },
        { id: 'n2', title: 'Huérfana', relatedCaseIds: ['borrado'] },
        { id: 'n3', title: 'Mixta', relatedCaseIds: ['c2', 'fantasma'] },
      ],
      eventos: [],
    });
    expect(r.notasHuerfanas).toHaveLength(2);
    expect(r.notasHuerfanas.map((n) => n.id).sort()).toEqual(['n2', 'n3']);
    expect(r.total).toBe(2);
  });

  it('detecta eventos con caseId inexistente sin eliminarlos', () => {
    const r = detectarHuerfanos({
      casos,
      notas: [],
      eventos: [
        { id: 'e1', title: 'Cita', relatedCaseIds: ['c1'] },
        { id: 'e2', title: 'Huérfano', relatedCaseIds: ['eliminado'] },
      ],
    });
    expect(r.eventosHuerfanos).toHaveLength(1);
    expect(r.eventosHuerfanos[0].refsRotas).toEqual(['eliminado']);
  });

  it('notas/eventos sin referencias no se consideran huérfanos', () => {
    const r = detectarHuerfanos({
      casos,
      notas: [{ id: 'n9', title: 'Libre', relatedCaseIds: [] }],
      eventos: [{ id: 'e9', title: 'Sin vínculo' }],
    });
    expect(r.total).toBe(0);
  });
});

describe('detectarDuplicadosCasos', () => {
  it('duplicado técnico: mismo ID', () => {
    const r = detectarDuplicadosCasos([
      { id: 'x', nombre: 'A', telefono: '111' },
      { id: 'x', nombre: 'A copia', telefono: '222' },
      { id: 'y', nombre: 'B', telefono: '333' },
    ]);
    expect(r.tecnicos).toEqual([{ id: 'x', cantidad: 2 }]);
  });

  it('posible duplicado: mismo nombre y teléfono con IDs distintos (no se elimina nada)', () => {
    const r = detectarDuplicadosCasos([
      { id: 'a', nombre: 'juan perez', telefono: '261-555-0000' },
      { id: 'b', nombre: 'Juan Perez', telefono: '2615550000' },
    ]);
    expect(r.posibles).toHaveLength(1);
    expect(r.posibles[0].ids.sort()).toEqual(['a', 'b']);
  });

  it('coincidencia parcial: mismo teléfono con nombres distintos es señal débil separada', () => {
    const r = detectarDuplicadosCasos([
      { id: 'a', nombre: 'JUAN PEREZ', telefono: '2615550000' },
      { id: 'b', nombre: 'MARIA PEREZ', telefono: '2615550000' },
    ]);
    // Mismo teléfono + nombres distintos → NO es posible duplicado directo.
    expect(r.posibles).toHaveLength(0);
    expect(r.parciales).toHaveLength(1);
    expect(r.parciales[0].nombres.sort()).toEqual(['JUAN PEREZ', 'MARIA PEREZ']);
  });

  it('nombres iguales con teléfonos distintos no son duplicados', () => {
    const r = detectarDuplicadosCasos([
      { id: 'a', nombre: 'JUAN PEREZ', telefono: '111' },
      { id: 'b', nombre: 'Juan Perez', telefono: '222' },
    ]);
    expect(r.posibles).toHaveLength(0);
    expect(r.parciales).toHaveLength(0);
  });
});

describe('repararOrdenSecciones — política A B X C → A B C D', () => {
  it('caso del spec: elimina X y agrega D conservando el orden válido', () => {
    expect(repararOrdenSecciones(['A', 'B', 'X', 'C'], ['A', 'B', 'C', 'D'])).toEqual([
      'A', 'B', 'C', 'D',
    ]);
  });

  it('es idempotente: aplicar dos veces no cambia el resultado', () => {
    const una = repararOrdenSecciones(['B', 'X', 'A'], ['A', 'B', 'C']);
    const dos = repararOrdenSecciones(una, ['A', 'B', 'C']);
    expect(dos).toEqual(una);
    expect(una).toEqual(['B', 'A', 'C']);
  });

  it('orden vacío o corrupto devuelve el orden canónico completo', () => {
    expect(repararOrdenSecciones([], ['A', 'B'])).toEqual(['A', 'B']);
    expect(repararOrdenSecciones(null, ['A', 'B'])).toEqual(['A', 'B']);
    expect(repararOrdenSecciones('roto', ['A', 'B'])).toEqual(['A', 'B']);
  });

  it('deduplica entradas repetidas', () => {
    expect(repararOrdenSecciones(['A', 'A', 'B'], ['A', 'B'])).toEqual(['A', 'B']);
  });
});

describe('repararPreferenciasPersistidas', () => {
  const DEFAULTS = {
    dashTabOrder: ['analitica', 'resumen', 'rendimiento'],
    kanbanSections: ['pipelineBar', 'columnas'],
  };

  it('genera patch solo para las claves que cambiaron', () => {
    const persisted = {
      dashTabOrder: ['resumen', 'viejo', 'analitica'], // falta "rendimiento", sobra "viejo"
      kanbanSections: ['pipelineBar', 'columnas'], // correcto: no toca
    };
    const { patch, cambios } = repararPreferenciasPersistidas(persisted, DEFAULTS);
    expect(patch.dashTabOrder).toEqual(['resumen', 'analitica', 'rendimiento']);
    expect(patch.kanbanSections).toBeUndefined();
    expect(cambios).toHaveLength(1);
    expect(cambios[0].clave).toBe('dashTabOrder');
  });

  it('repara dashWidgetOrder por pestaña y preserva pestañas desconocidas', () => {
    const persisted = {
      dashWidgetOrder: {
        analitica: ['widgetNuevoNoConocido', 'kpi'],
        pestañaFutura: ['lo-que-sea'],
      },
    };
    const defaults = {
      ...DEFAULTS,
      dashWidgetOrder: { analitica: ['kpi', 'funnel'] },
    };
    const { patch } = repararPreferenciasPersistidas(persisted, defaults);
    // Pestaña conocida reparada: se conserva 'kpi' y se agrega 'funnel'
    // (sección válida faltante) al final. Desconocida preservada tal cual.
    expect(patch.dashWidgetOrder.analitica).toEqual(['kpi', 'funnel']);
    expect(patch.dashWidgetOrder['pestañaFutura']).toEqual(['lo-que-sea']);
  });

  it('no genera cambios cuando todo está correcto (idempotencia)', () => {
    const persisted = {
      dashTabOrder: ['rendimiento', 'analitica', 'resumen'],
      kanbanSections: ['columnas', 'pipelineBar'],
    };
    const { patch, cambios } = repararPreferenciasPersistidas(persisted, DEFAULTS);
    expect(patch).toEqual({});
    expect(cambios).toHaveLength(0);
  });
});
