import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store mínimo con lo que alertsSystem toca (dedupToast → addToast).
// vi.hoisted: la factory de vi.mock se ejecuta antes que las consts del scope.
const { mockAddToast } = vi.hoisted(() => ({ mockAddToast: vi.fn() }));
vi.mock('../../core/store/useAppStore', () => ({
  default: {
    getState: () => ({
      addToast: mockAddToast,
      logError: vi.fn(),
      events: [],
      cases: [],
      errorLog: [],
    }),
  },
}));

import { dedupToast, runCaseRules } from './alertsSystem';
import { registerRule, unregisterRule } from '../rules/rulesEngine';

// Tests 1.10.0 (feature D): dedup de toasts y cableado runCaseRules.
describe('alertsSystem · dedupToast (1.10.0 · feature D)', () => {
  beforeEach(() => {
    // Solo Date: dedupToast usa Date.now(); los timers reales no importan.
    vi.useFakeTimers({ toFake: ['Date'] });
    mockAddToast.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('una clave solo suena dentro de la ventana de 10 minutos', () => {
    vi.setSystemTime(new Date('2026-01-01T10:00:00'));
    expect(dedupToast('test-dedup-a', 'hola', 'warning')).toBe(true);
    expect(dedupToast('test-dedup-a', 'hola', 'warning')).toBe(false);
    expect(mockAddToast).toHaveBeenCalledTimes(1);

    // Otra clave no se ve afectada por la primera.
    expect(dedupToast('test-dedup-b', 'otro', 'info')).toBe(true);
    expect(mockAddToast).toHaveBeenCalledTimes(2);

    // Pasada la ventana (10 min + 1 s) vuelve a sonar.
    vi.setSystemTime(new Date('2026-01-01T10:10:01'));
    expect(dedupToast('test-dedup-a', 'hola', 'warning')).toBe(true);
    expect(mockAddToast).toHaveBeenCalledTimes(3);
  });
});

describe('alertsSystem · runCaseRules (1.10.0 · feature D)', () => {
  beforeEach(() => {
    mockAddToast.mockClear();
  });
  afterEach(() => {
    unregisterRule('test-run-rule');
  });

  it('materializa action alert como toast con dedup por entidad', async () => {
    registerRule({
      name: 'test-run-rule',
      condition: () => true,
      action: async () => ({
        action: 'alert',
        message: 'aviso de prueba',
        severity: 'warning',
      }),
    });
    await runCaseRules({ id: 'ent-1', telefono: '123' });
    expect(mockAddToast).toHaveBeenCalledWith('aviso de prueba', 'warning', 5000);

    // Misma entidad dentro de la ventana → sin repetir.
    await runCaseRules({ id: 'ent-1', telefono: '123' });
    expect(mockAddToast).toHaveBeenCalledTimes(1);

    // Entidad distinta sí suena (clave distinta).
    await runCaseRules({ id: 'ent-2', telefono: '123' });
    expect(mockAddToast).toHaveBeenCalledTimes(2);
  });

  it('no truena con null ni toastéa cuando ninguna regla matchea', async () => {
    await expect(runCaseRules(null)).resolves.toEqual([]);
    // 'case-sin-telefono-alert' no matchea con teléfono presente y la regla
    // de test ya fue dada de baja en el afterEach anterior.
    await runCaseRules({ id: 'ent-3', telefono: '999', estado: 'Activo' });
    expect(mockAddToast).not.toHaveBeenCalled();
  });
});
