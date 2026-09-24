import { describe, it, expect } from 'vitest';
import { filtrarEventos } from './CalendarFilters';

const mkEvt = (overrides = {}) => ({
  id: 1,
  title: 'Test',
  startDate: '2026-09-15T10:00:00',
  endDate: '2026-09-15T11:00:00',
  status: 'pending',
  priority: 'medium',
  eventType: 'manual',
  relatedCaseIds: [],
  caseContext: null,
  ...overrides,
});

describe('filtrarEventos', () => {
  const events = [
    mkEvt({ id: 1, priority: 'high', eventType: 'cita', caseContext: { estado: 'Pendiente', aseguradora: 'Galeno', estudioJuridico: 'GL CABA' } }),
    mkEvt({ id: 2, priority: 'low', eventType: 'manual', caseContext: { estado: 'Firmo', aseguradora: 'Sancor', estudioJuridico: 'GL Morón' } }),
    mkEvt({ id: 3, priority: 'medium', eventType: 'reprogramacion', caseContext: { estado: 'Pendiente', aseguradora: 'Galeno', estudioJuridico: 'GL CABA' } }),
    mkEvt({ id: 4, priority: 'high', eventType: 'manual', caseContext: null }),
  ];

  it('devuelve todos los eventos sin filtros', () => {
    const empty = { estados: [], prioridades: [], aseguradoras: [], estudios: [], tipos: [] };
    expect(filtrarEventos(events, empty)).toHaveLength(4);
  });

  it('filtra por prioridad', () => {
    const f = { estados: [], prioridades: ['high'], aseguradoras: [], estudios: [], tipos: [] };
    const result = filtrarEventos(events, f);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.priority === 'high')).toBe(true);
  });

  it('filtra por tipo de evento', () => {
    const f = { estados: [], prioridades: [], aseguradoras: [], estudios: [], tipos: ['cita'] };
    const result = filtrarEventos(events, f);
    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe('cita');
  });

  it('filtra por estado del caso', () => {
    const f = { estados: ['Firmo'], prioridades: [], aseguradoras: [], estudios: [], tipos: [] };
    const result = filtrarEventos(events, f);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('filtra por aseguradora', () => {
    const f = { estados: [], prioridades: [], aseguradoras: ['Sancor'], estudios: [], tipos: [] };
    const result = filtrarEventos(events, f);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('filtra por estudio', () => {
    const f = { estados: [], prioridades: [], aseguradoras: [], estudios: ['GL Morón'], tipos: [] };
    const result = filtrarEventos(events, f);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('excluye eventos sin caseContext al filtrar por estado', () => {
    const f = { estados: ['Pendiente'], prioridades: [], aseguradoras: [], estudios: [], tipos: [] };
    const result = filtrarEventos(events, f);
    // id=4 tiene caseContext null, se excluye
    expect(result.every(e => e.caseContext?.estado === 'Pendiente')).toBe(true);
  });

  it('combina múltiples filtros (AND)', () => {
    const f = { estados: ['Pendiente'], prioridades: ['high'], aseguradoras: [], estudios: [], tipos: [] };
    const result = filtrarEventos(events, f);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filtros vacían数组 dentro de una dimensión no filtra esa dimensión', () => {
    const f = { estados: [], prioridades: ['high', 'low'], aseguradoras: [], estudios: [], tipos: [] };
    const result = filtrarEventos(events, f);
    expect(result).toHaveLength(3);
  });
});
