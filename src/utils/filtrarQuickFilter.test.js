import { describe, it, expect } from 'vitest';
import {
  aplicarQuickFilter,
  quickFilterValues,
  quickFilterEstados,
  quickFilterChip,
  accionToQuickFilter,
  quickFilterToAccion,
  // v1.9.7 (fix B1): filtro de búsqueda extraído de App.jsx.
  aplicarBusquedaFiltro,
} from './filtrarQuickFilter';
import { contarCasosPorEstado } from './casosStats';

const CASOS = [
  { id: 1, estado: 'Firmo', estudioJuridico: 'Estudio A', provincia: 'Buenos Aires' },
  { id: 2, estado: 'No responde', estudioJuridico: 'Estudio A', provincia: 'CABA' },
  { id: 3, estado: 'Pendiente', estudioJuridico: 'Estudio B', provincia: 'Buenos Aires' },
  { id: 4, estado: 'Firmo', estudioJuridico: 'Estudio B', provincia: 'CABA' },
  { id: 5, estado: 'No viable', estudioJuridico: '', provincia: 'Buenos Aires' },
  { id: 6, estado: 'Reprogramado', reporteHistory: [{ texto: 'llamé' }], provincia: 'CABA' },
  { id: 7, estado: 'Sin reporte', reporteHistory: [], provincia: 'Córdoba' },
];

const CATS = {
  lost: ['No viable', 'Baja'],
  success: ['Firmo'],
  pending: ['No responde', 'Reprogramado'],
  contact: ['No responde', 'Reprogramado', 'Pendiente'],
};

describe('aplicarQuickFilter', () => {
  it('devuelve los casos sin cambios si no hay quickFilter', () => {
    expect(aplicarQuickFilter(CASOS, null)).toHaveLength(CASOS.length);
    expect(aplicarQuickFilter(CASOS, {})).toHaveLength(CASOS.length);
    expect(aplicarQuickFilter(CASOS, { tipo: 'actividad' })).toHaveLength(CASOS.length);
  });

  it('filtra por valor único (estado) con normalización', () => {
    const res = aplicarQuickFilter(CASOS, { tipo: 'estado', valor: 'Firmo' });
    expect(res.map((c) => c.id)).toEqual([1, 4]);
    const res2 = aplicarQuickFilter(CASOS, { tipo: 'estado', valor: ' firmo ' });
    expect(res2).toHaveLength(2);
  });

  it('filtra por múltiples estados (OR) con array', () => {
    const res = aplicarQuickFilter(CASOS, {
      tipo: 'estado',
      valor: ['Firmo', 'Pendiente'],
    });
    expect(res.map((c) => c.id).sort()).toEqual([1, 3, 4]);
  });

  it('soporta otros campos con array (OR)', () => {
    const res = aplicarQuickFilter(CASOS, {
      tipo: 'provincia',
      valor: ['caba', 'buenos aires'],
    });
    expect(res).toHaveLength(6);
  });

  it('grupo ACTIVOS/CERRADOS/FIRMAS/PERDIDOS/SINRESPUESTA', () => {
    expect(aplicarQuickFilter(CASOS, { tipo: 'grupo', valor: 'activos' }, CATS).map((c) => c.id).sort())
      .toEqual([2, 3, 6, 7]);
    expect(aplicarQuickFilter(CASOS, { tipo: 'grupo', valor: 'firmas' }, CATS).map((c) => c.id))
      .toEqual([1, 4]);
    expect(aplicarQuickFilter(CASOS, { tipo: 'grupo', valor: 'perdidos' }, CATS).map((c) => c.id))
      .toEqual([5]);
    expect(aplicarQuickFilter(CASOS, { tipo: 'grupo', valor: 'sinrespuesta' }, CATS).map((c) => c.id).sort())
      .toEqual([2, 6]);
  });

  it('grupo SINREPORTE y SINASIGNACION', () => {
    expect(aplicarQuickFilter(CASOS, { tipo: 'grupo', valor: 'sinReporte' }, CATS).map((c) => c.id).sort())
      .toEqual([1, 2, 3, 4, 5, 7]);
    expect(aplicarQuickFilter(CASOS, { tipo: 'grupo', valor: 'sinAsignacion' }, CATS).map((c) => c.id).sort())
      .toEqual([5, 6, 7]);
  });

  it('tipo sinReporte', () => {
    const res = aplicarQuickFilter(CASOS, { tipo: 'sinReporte', valor: 'x' }, CATS);
    expect(res.map((c) => c.id).sort()).toEqual([1, 2, 3, 4, 5, 7]);
  });

  it('preserva comportamiento con valor vacío', () => {
    expect(aplicarQuickFilter(CASOS, { tipo: 'estado', valor: '' })).toHaveLength(CASOS.length);
  });
});

describe('quickFilterValues / quickFilterEstados', () => {
  it('normaliza string y array', () => {
    expect(quickFilterValues({ tipo: 'estado', valor: ' Firmo ' })).toEqual(['FIRMO']);
    expect(quickFilterValues({ tipo: 'estado', valor: ['Firmo', 'Pendiente'] })).toEqual([
      'FIRMO',
      'PENDIENTE',
    ]);
    expect(quickFilterValues(null)).toEqual([]);
  });

  it('quickFilterEstados devuelve array para string o array', () => {
    expect(quickFilterEstados({ tipo: 'estado', valor: 'Firmo' })).toEqual(['Firmo']);
    expect(quickFilterEstados({ tipo: 'estado', valor: ['A', 'B'] })).toEqual(['A', 'B']);
    expect(quickFilterEstados({ tipo: 'grupo', valor: 'activos' })).toEqual([]);
    expect(quickFilterEstados(null)).toEqual([]);
  });
});

describe('contarCasosPorEstado', () => {
  it('cuenta por estado', () => {
    expect(contarCasosPorEstado(CASOS)).toEqual({
      Firmo: 2,
      'No responde': 1,
      Pendiente: 1,
      'No viable': 1,
      Reprogramado: 1,
      'Sin reporte': 1,
    });
  });

  it('maneja listas vacías y estados faltantes', () => {
    expect(contarCasosPorEstado([])).toEqual({});
    expect(contarCasosPorEstado([{ id: 1 }])).toEqual({ 'Sin estado': 1 });
  });
});

describe('grupo PENDIENTES (acciones rápidas)', () => {
  it('filtra por la categoría de contacto', () => {
    expect(
      aplicarQuickFilter(CASOS, { tipo: 'grupo', valor: 'pendientes' }, CATS)
        .map((c) => c.id)
        .sort()
    ).toEqual([2, 3, 6]);
    expect(
      aplicarQuickFilter(CASOS, { tipo: 'grupo', valor: 'PENDIENTES' }, CATS)
    ).toHaveLength(3);
  });
});

describe('quickFilterChip', () => {
  it('devuelve null sin filtro o con valor vacío', () => {
    expect(quickFilterChip(null)).toBeNull();
    expect(quickFilterChip({ tipo: 'estado' })).toBeNull();
    expect(quickFilterChip({ tipo: 'estado', valor: '' })).toBeNull();
    expect(quickFilterChip({ tipo: 'provincia', valor: [] })).toBeNull();
  });

  it('grupo con rótulo legible', () => {
    expect(quickFilterChip({ tipo: 'grupo', valor: 'firmas' })).toEqual({
      key: 'quick:grupo',
      label: 'Grupo',
      valor: 'Firmas',
    });
    expect(quickFilterChip({ tipo: 'grupo', valor: 'sinAsignacion' }).valor)
      .toBe('Sin asignación');
  });

  it('sinReporte es un chip de un solo rótulo', () => {
    expect(quickFilterChip({ tipo: 'sinReporte', valor: 'x' })).toEqual({
      key: 'quick:sinReporte',
      label: 'Sin reporte',
      valor: '',
    });
  });

  it('tipos conocidos usan su etiqueta', () => {
    expect(quickFilterChip({ tipo: 'aseguradora', valor: 'Galeno' })).toEqual({
      key: 'quick:aseguradora',
      label: 'Aseguradora',
      valor: 'Galeno',
    });
    expect(quickFilterChip({ tipo: 'estudioJuridico', valor: 'Estudio A' }).label)
      .toBe('Estudio');
  });

  it('arrays se listan y se recortan a 3', () => {
    expect(
      quickFilterChip({ tipo: 'estado', valor: ['Firmo', 'Pendiente'] }).valor
    ).toBe('Firmo, Pendiente');
    expect(
      quickFilterChip({
        tipo: 'estado',
        valor: ['A', 'B', 'C', 'D', 'E'],
      }).valor
    ).toBe('A, B, C (+2)');
  });

  it('tipos desconocidos se capitalizan', () => {
    expect(quickFilterChip({ tipo: 'barrio', valor: 'Centro' }).label).toBe('Barrio');
  });
});

describe('acciones rápidas ⇄ filtro rápido', () => {
  it('accionToQuickFilter mapea cada acción a un grupo', () => {
    expect(accionToQuickFilter('pendientes')).toEqual({ tipo: 'grupo', valor: 'pendientes' });
    expect(accionToQuickFilter('firmas')).toEqual({ tipo: 'grupo', valor: 'firmas' });
    expect(accionToQuickFilter('perdidos')).toEqual({ tipo: 'grupo', valor: 'perdidos' });
    expect(accionToQuickFilter('sinReporte')).toEqual({ tipo: 'grupo', valor: 'sinreporte' });
    expect(accionToQuickFilter('desconocida')).toBeNull();
  });

  it('quickFilterToAccion deriva la acción activa (o null)', () => {
    expect(quickFilterToAccion({ tipo: 'grupo', valor: 'FIRMAS' })).toBe('firmas');
    expect(quickFilterToAccion({ tipo: 'grupo', valor: 'sinReporte' })).toBe('sinReporte');
    expect(quickFilterToAccion({ tipo: 'grupo', valor: 'activos' })).toBeNull();
    expect(quickFilterToAccion({ tipo: 'estado', valor: 'Firmo' })).toBeNull();
    expect(quickFilterToAccion(null)).toBeNull();
  });
});

// 1.9.7 (fix B1): el filtro de búsqueda "todos/activos/pendientes/hoy" vivía
// inline en App.jsx con comparación cruda + fecha UTC: las fechas legadas
// DD/MM/YYYY nunca coincidían con "hoy" (lista vacía).
describe('aplicarBusquedaFiltro (1.9.7)', () => {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const HOY_ISO = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
  const HOY_LEGADO = `${pad(ahora.getDate())}/${pad(ahora.getMonth() + 1)}/${ahora.getFullYear()}`;

  const CASOS = [
    { id: 1, estado: 'Firmo', fecha: HOY_ISO },
    { id: 2, estado: 'Firmo', fecha: HOY_LEGADO },
    { id: 3, estado: 'No viable', fecha: '2020-01-01' },
    { id: 4, estado: 'Pendiente', fecha: '' },
  ];

  it('"todos" devuelve la lista completa', () => {
    expect(aplicarBusquedaFiltro(CASOS, 'todos', CATS)).toHaveLength(4);
    expect(aplicarBusquedaFiltro(CASOS, undefined, CATS)).toHaveLength(4);
  });

  it('"activos" excluye los estados perdidos', () => {
    const res = aplicarBusquedaFiltro(CASOS, 'activos', CATS);
    expect(res.map((c) => c.id)).toEqual([1, 2, 4]);
  });

  it('"pendientes" solo estados de contacto', () => {
    const res = aplicarBusquedaFiltro(CASOS, 'pendientes', CATS);
    expect(res.map((c) => c.id)).toEqual([4]);
  });

  it('"hoy" incluye la fecha ISO del día', () => {
    const res = aplicarBusquedaFiltro(CASOS, 'hoy', CATS);
    expect(res.map((c) => c.id)).toContain(1);
  });

  // Regresión directa del bug: una fecha legada DD/MM/YYYY de HOY debe
  // coincidir (antes slice(0,10) nunca igualaba con ISO).
  it('"hoy" incluye la fecha legada DD/MM/YYYY del día (fix B1)', () => {
    const res = aplicarBusquedaFiltro(CASOS, 'hoy', CATS);
    expect(res.map((c) => c.id)).toEqual(expect.arrayContaining([1, 2]));
  });

  it('"hoy" excluye otros días, vacíos e inválidos y respeta el parámetro hoy', () => {
    const res = aplicarBusquedaFiltro(CASOS, 'hoy', CATS, HOY_ISO);
    expect(res.map((c) => c.id).sort()).toEqual([1, 2]);
    const otroDia = aplicarBusquedaFiltro(CASOS, 'hoy', CATS, '1999-12-31');
    expect(otroDia).toHaveLength(0);
  });
});