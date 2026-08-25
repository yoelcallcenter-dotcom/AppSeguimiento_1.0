import { describe, it, expect } from 'vitest';
import { ruleEngine } from './ruleEngine';

describe('ruleEngine.shouldNotify', () => {
  it('bloquea todo en modo no molestar', () => {
    const event = { type: 'error', priority: 'critical', title: 'X' };
    expect(ruleEngine.shouldNotify(event, { modoNoMolestar: true })).toBe(false);
  });

  it('permite eventos críticos incluso con filtros de tipo', () => {
    const event = { type: 'warning', priority: 'critical', title: 'X' };
    expect(ruleEngine.shouldNotify(event, { notifReporte: false })).toBe(true);
  });

  it('respeta el filtro notifCambioEstado para success', () => {
    const event = { type: 'success', title: 'Caso actualizado' };
    expect(ruleEngine.shouldNotify(event, { notifCambioEstado: false })).toBe(false);
  });

  it('usa notifBackup para eventos de backup', () => {
    const event = { type: 'success', title: 'Backup realizado' };
    expect(ruleEngine.shouldNotify(event, { notifBackup: false })).toBe(false);
    expect(ruleEngine.shouldNotify(event, {})).toBe(true);
  });

  it('filtra low priority con ignorarLowPriority', () => {
    const event = { type: 'info', priority: 'low', title: 'X' };
    expect(ruleEngine.shouldNotify(event, { ignorarLowPriority: true })).toBe(false);
  });
});

describe('ruleEngine.isDuplicate', () => {
  it('detecta duplicados recientes', () => {
    const now = Date.now();
    const event = { title: 'A', message: 'B', timestamp: now };
    const recent = [{ title: 'A', message: 'B', timestamp: now - 500 }];
    expect(ruleEngine.isDuplicate(event, recent)).toBe(true);
  });

  it('no detecta duplicados antiguos', () => {
    const now = Date.now();
    const event = { title: 'A', message: 'B', timestamp: now };
    const recent = [{ title: 'A', message: 'B', timestamp: now - 10000 }];
    expect(ruleEngine.isDuplicate(event, recent)).toBe(false);
  });
});

describe('ruleEngine.shouldAggregate', () => {
  it('agrega cuando hay 3+ notificaciones recientes del mismo grupo', () => {
    const now = Date.now();
    const event = { title: 'N', message: 'm', timestamp: now, source: 's' };
    const recent = [
      { title: 'N1', source: 's', timestamp: now - 100 },
      { title: 'N2', source: 's', timestamp: now - 200 },
      { title: 'N3', source: 's', timestamp: now - 300 },
    ];
    expect(ruleEngine.shouldAggregate(event, recent)).toBe(true);
  });

  it('no agrega con pocas notificaciones', () => {
    const now = Date.now();
    const event = { title: 'N', source: 's', timestamp: now };
    const recent = [{ title: 'N1', source: 's', timestamp: now - 100 }];
    expect(ruleEngine.shouldAggregate(event, recent)).toBe(false);
  });
});

describe('ruleEngine.resolvePriority', () => {
  it('mantiene la prioridad explícita', () => {
    expect(ruleEngine.resolvePriority({ priority: 'critical' })).toBe('critical');
  });

  it('mapea por tipo', () => {
    expect(ruleEngine.resolvePriority({ type: 'error' })).toBe('high');
    expect(ruleEngine.resolvePriority({ type: 'warning' })).toBe('medium');
    expect(ruleEngine.resolvePriority({ type: 'info' })).toBe('low');
    expect(ruleEngine.resolvePriority({ type: 'success' })).toBe('low');
    expect(ruleEngine.resolvePriority({ type: 'otro' })).toBe('low');
  });
});
