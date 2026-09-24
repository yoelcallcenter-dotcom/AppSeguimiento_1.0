import { describe, it, expect } from 'vitest';
import {
  aplicarQuickFilter,
  quickFilterValues,
  quickFilterEstados,
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