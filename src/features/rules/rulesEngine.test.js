import { describe, it, expect, vi, afterEach } from 'vitest';

// La regla default de citas importa createEvent dinámicamente: se mockea
// para que los tests no escriban eventos reales en el storage (1.10.0 D).
// 1.10.2-fix: la regla también importa findExistingCitaEvent (citaAutoEvents),
// que lee de este módulo getAllEvents, EVENT_TYPES y —en su import estático—
// updateEvent/deleteEvent. El mock los expone todos para que el módulo cargue
// sin errores de export ausente; solo getAllEvents/createEvent se ejercitan
// aquí (findExistingCitaEvent no escribe nada).
vi.mock('../calendar/calendarStore', () => ({
  createEvent: vi.fn(async () => ({})),
  getAllEvents: vi.fn(async () => []),
  updateEvent: vi.fn(async (id, updates) => ({ id, ...updates })),
  deleteEvent: vi.fn(async () => true),
  EVENT_TYPES: { CITA: 'cita', REPROGRAMACION: 'reprogramacion' },
}));

import {
  registerRule,
  unregisterRule,
  enableRule,
  runRules,
  getRules,
} from './rulesEngine';
import { createEvent, getAllEvents } from '../calendar/calendarStore';

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
    // 1.10.1: el evento automático lleva el tag de procedencia 'regla-cita'
    // (lo usa completarCitasDeCaso para distinguirlo de eventos manuales).
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        relatedCaseIds: ['c1'],
        tags: ['regla-cita'],
        status: 'pending',
      })
    );

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

  // 1.10.2-fix: la regla dejó de hardcodear las 09:00 y de duplicar el
  // evento que syncCitaEvent ya creó con la hora real del campo CITA.
  it('post 1.10.2: usa el horario del campo CITA y no duplica el evento existente', async () => {
    // (a) Cita parseable y sin evento previo → nace con el rango horario real
    // (paste "19/10 (12:30 a 13:00) - Yoel Libay" antes caía a 09:00).
    getAllEvents.mockResolvedValueOnce([]);
    await runRules(
      {
        id: 'c9',
        nombre: 'Yoel',
        estado: 'Cita virtual',
        cita: '19/10 (12:30 a 13:00) - Yoel Libay',
      },
      { prev: { estado: 'Activo' } }
    );
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        // Solo se asierte el rango horario (el año lo resuelve la regla de
        // fecha de la cita según cuándo corra el test).
        startDate: expect.stringMatching(/T12:30:00$/),
        endDate: expect.stringMatching(/T13:00:00$/),
        tags: ['regla-cita'],
      })
    );

    // (b) Si syncCitaEvent ya creó el evento de cita → la regla NO crea un
    // segundo evento (antes quedaba la cita real + un duplicado a las 09:00).
    createEvent.mockClear();
    getAllEvents.mockResolvedValueOnce([
      { id: 77, eventType: 'cita', status: 'pending', relatedCaseIds: ['c9'] },
    ]);
    await runRules(
      { id: 'c9', nombre: 'Yoel', estado: 'Cita virtual' },
      { prev: { estado: 'Activo' } }
    );
    expect(createEvent).not.toHaveBeenCalled();

    // (c) Sin cita parseable → fallback 09:00 (status quo preservado para
    // casos que entran en Cita sin campo CITA utilizable).
    getAllEvents.mockResolvedValueOnce([]);
    await runRules(
      { id: 'c10', nombre: 'Beto', estado: 'Cita virtual', cita: 'próxima semana' },
      { prev: { estado: 'Activo' } }
    );
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: expect.stringMatching(/T09:00:00$/) })
    );
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
