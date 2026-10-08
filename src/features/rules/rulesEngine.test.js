import { describe, it, expect, vi, afterEach } from 'vitest';

// La regla default de citas importa createEvent dinámicamente: se mockea
// para que los tests no escriban eventos reales en el storage (1.10.0 D).
vi.mock('../calendar/calendarStore', () => ({
  createEvent: vi.fn(async () => ({})),
}));

import {
  registerRule,
  unregisterRule,
  enableRule,
  runRules,
  getRules,
} from './rulesEngine';
import { createEvent } from '../calendar/calendarStore';

// Tests 1.10.0 (feature D): contexto de transiciones, condiciones
// declarativas y toggles del motor de reglas.
describe('rulesEngine (1.10.0 · feature D)', () => {
  afterEach(() => {
    unregisterRule('test-ctx-rule');
    unregisterRule('test-declarativa');
    vi.clearAllMocks();
  });

  it('las condiciones-función reciben context con prev (transiciones)', async () => {
    const cond = vi.fn(() => true);
    registerRule({
      name: 'test-ctx-rule',
      description: 'test',
      condition: cond,
      action: async () => ({ ok: true }),
    });
    const prev = { estado: 'Activo' };
    await runRules({ id: '1', estado: 'Cita virtual' }, { prev });
    expect(cond).toHaveBeenCalledTimes(1);
    expect(cond.mock.calls[0][1]).toMatchObject({ prev });
  });

  it('regla de citas: crea evento solo al ENTRAR en estado Cita', async () => {
    // Transición real (prev distinto) → crea.
    await runRules(
      { id: 'c1', nombre: 'Ana', estado: 'Cita virtual' },
      { prev: { estado: 'Activo' } }
    );
    expect(createEvent).toHaveBeenCalledTimes(1);

    // Ya estaba en Cita → sin transición → no vuelve a crear (fix 1.10.0 D:
    // antes disparaba en cada revisión del caso).
    await runRules(
      { id: 'c1', nombre: 'Ana', estado: 'Cita virtual' },
      { prev: { estado: 'Cita virtual' } }
    );
    expect(createEvent).toHaveBeenCalledTimes(1);

    // Alta sin prev (prev null) cuenta como transición.
    await runRules(
      { id: 'c2', nombre: 'Beto', estado: 'Cita presencial' },
      { prev: null }
    );
    expect(createEvent).toHaveBeenCalledTimes(2);
  });

  it('evalúa conditions declarativas (equals)', async () => {
    const hits = [];
    registerRule({
      name: 'test-declarativa',
      condition: { field: 'estado', operator: 'equals', value: 'Firmo' },
      action: async () => {
        hits.push('hit');
        return {};
      },
    });
    await runRules({ estado: 'Firmo', telefono: '1' });
    await runRules({ estado: 'Baja', telefono: '1' });
    expect(hits).toEqual(['hit']);
  });

  it('enableRule(false) excluye la regla del pase', async () => {
    const hits = [];
    registerRule({
      name: 'test-declarativa',
      condition: { field: 'estado', operator: 'equals', value: 'Firmo' },
      action: async () => {
        hits.push('hit');
        return {};
      },
    });
    enableRule('test-declarativa', false);
    await runRules({ estado: 'Firmo', telefono: '1' });
    expect(hits).toEqual([]);
    enableRule('test-declarativa', true);
    await runRules({ estado: 'Firmo', telefono: '1' });
    expect(hits).toEqual(['hit']);
  });

  it('registra las reglas default y devuelve copia en getRules', () => {
    const names = getRules().map((r) => r.name);
    expect(names).toContain('case-estado-nuevo-create-event');
    expect(names).toContain('case-sin-telefono-alert');
    // getRules devuelve una copia: mutarla no afecta al motor.
    getRules().push({ name: 'no-debe-persistir' });
    expect(getRules().map((r) => r.name)).not.toContain('no-debe-persistir');
  });
});
